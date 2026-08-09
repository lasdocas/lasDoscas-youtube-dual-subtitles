const TRANSLATION_CACHE_MAX_ENTRIES = 500;
const TRANSLATION_CACHE_TTL_MS = 30 * 60 * 1000;
const TRANSLATION_CACHE_MAX_SOURCE_LENGTH = 2000;
const translationCache = new Map();
// Ordered from best expected subtitle quality to the lightest fallback. Keep
// this list in one place so quota failover is deterministic and easy to tune.
const GEMINI_MODELS = [
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-2.5-flash-lite'
];
const GEMINI_TRANSLATION_TIMEOUT_MS = 30000;
// Keep the default traffic below the common free-tier RPM range. A project
// with a higher quota can still adjust this without changing request logic.
const GEMINI_MIN_REQUEST_INTERVAL_MS = 4000;
const GEMINI_DEFAULT_COOLDOWN_MS = 60 * 1000;
const GEMINI_MAX_COOLDOWN_MS = 15 * 60 * 1000;
const GEMINI_DAILY_QUOTA_COOLDOWN_MS = 6 * 60 * 60 * 1000;
const GEMINI_RATE_STATE_STORAGE_KEY = 'geminiRateLimitState';
const geminiInflightTranslations = new Map();
let geminiRateState = {
  models: {}
};
let geminiRateStateLoadPromise = null;
let geminiRequestQueue = Promise.resolve();
let geminiNextRequestAt = 0;

function getSessionStorage() {
  return chrome.storage.session || chrome.storage.local;
}

function loadGeminiRateState() {
  if (geminiRateStateLoadPromise) return geminiRateStateLoadPromise;
  geminiRateStateLoadPromise = new Promise((resolve) => {
    getSessionStorage().get(GEMINI_RATE_STATE_STORAGE_KEY, (data) => {
      const storedState = data?.[GEMINI_RATE_STATE_STORAGE_KEY];
      if (storedState && typeof storedState === 'object') {
        // Ignore the old single-model state format; each model now has its
        // own cooldown so one exhausted model cannot block healthy fallbacks.
        const storedModels = storedState.models && typeof storedState.models === 'object'
          ? storedState.models
          : {};
        geminiRateState = { models: {} };
        GEMINI_MODELS.forEach((model) => {
          const modelState = storedModels[model];
          geminiRateState.models[model] = {
            cooldownUntil: Number(modelState?.cooldownUntil) || 0,
            nextRequestAt: Number(modelState?.nextRequestAt) || 0,
            consecutiveRateLimits: Number(modelState?.consecutiveRateLimits) || 0,
            unavailableUntil: Number(modelState?.unavailableUntil) || 0
          };
        });
      }
      resolve(geminiRateState);
    });
  });
  return geminiRateStateLoadPromise;
}

function getGeminiModelState(model) {
  if (!geminiRateState.models[model]) {
    geminiRateState.models[model] = {
      cooldownUntil: 0,
      nextRequestAt: 0,
      consecutiveRateLimits: 0,
      unavailableUntil: 0
    };
  }
  return geminiRateState.models[model];
}

function persistGeminiRateState() {
  const storage = getSessionStorage();
  if (typeof storage.set === 'function') {
    storage.set({ [GEMINI_RATE_STATE_STORAGE_KEY]: geminiRateState });
  }
}

function createGeminiHttpError(status, retryAfterMs = 0) {
  const error = new Error(`gemini_http_${status}`);
  error.status = status;
  error.retryAfterMs = retryAfterMs;
  return error;
}

function parseRetryAfterMs(response, errorText) {
  const retryAfter = response.headers?.get?.('retry-after');
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
    const retryAt = Date.parse(retryAfter);
    if (Number.isFinite(retryAt)) return Math.max(0, retryAt - Date.now());
  }

  try {
    const errorData = JSON.parse(errorText);
    const retryInfo = errorData?.error?.details?.find((detail) =>
      String(detail?.['@type'] || '').endsWith('RetryInfo')
    );
    const retryDelay = String(retryInfo?.retryDelay || '');
    const match = retryDelay.match(/^(\d+(?:\.\d+)?)s$/);
    if (match) return Math.ceil(Number(match[1]) * 1000);
  } catch {
    // Some Google 429 responses are HTML or plain text.
  }
  return 0;
}

function enterGeminiCooldown(model, response, errorText) {
  const modelState = getGeminiModelState(model);
  const retryAfterMs = parseRetryAfterMs(response, errorText);
  const quotaDescription = String(errorText || '').toLowerCase();
  const isDailyQuota = /per.?day|requestsperday|daily quota/.test(quotaDescription);
  modelState.consecutiveRateLimits += 1;
  const exponentialCooldown = Math.min(
    GEMINI_DEFAULT_COOLDOWN_MS * (2 ** (modelState.consecutiveRateLimits - 1)),
    GEMINI_MAX_COOLDOWN_MS
  );
  const cooldownMs = isDailyQuota
    ? GEMINI_DAILY_QUOTA_COOLDOWN_MS
    : Math.max(retryAfterMs, exponentialCooldown);
  modelState.cooldownUntil = Math.max(modelState.cooldownUntil, Date.now() + cooldownMs);
  modelState.nextRequestAt = Math.max(modelState.nextRequestAt, modelState.cooldownUntil);
  geminiNextRequestAt = Math.max(geminiNextRequestAt, modelState.cooldownUntil);
  persistGeminiRateState();
  return cooldownMs;
}

function markGeminiModelUnavailable(model) {
  const modelState = getGeminiModelState(model);
  modelState.unavailableUntil = Date.now() + GEMINI_DAILY_QUOTA_COOLDOWN_MS;
  modelState.cooldownUntil = Math.max(modelState.cooldownUntil, modelState.unavailableUntil);
  persistGeminiRateState();
}

function getNextGeminiModel() {
  const now = Date.now();
  return GEMINI_MODELS.find((model) => getGeminiModelState(model).cooldownUntil <= now) || null;
}

function queueGeminiRequest(task) {
  const queuedRequest = geminiRequestQueue.catch(() => {}).then(async () => {
    await loadGeminiRateState();
    if (geminiNextRequestAt > Date.now()) {
      throw createGeminiHttpError(429, geminiNextRequestAt - Date.now());
    }
    const model = getNextGeminiModel();
    const now = Date.now();
    if (!model) {
      const earliestCooldown = Math.min(...GEMINI_MODELS.map((name) => getGeminiModelState(name).cooldownUntil));
      throw createGeminiHttpError(429, Math.max(0, earliestCooldown - now));
    }
    const modelState = getGeminiModelState(model);
    // Rate-limit the project globally. Per-model pacing alone still allows a
    // fallback chain to burst several requests in the same second.
    const waitMs = Math.max(0, modelState.nextRequestAt - now, geminiNextRequestAt - now);
    if (waitMs) await new Promise((resolve) => setTimeout(resolve, waitMs));
    if (modelState.cooldownUntil > Date.now()) {
      throw createGeminiHttpError(429, modelState.cooldownUntil - Date.now());
    }

    geminiNextRequestAt = Date.now() + GEMINI_MIN_REQUEST_INTERVAL_MS;
    modelState.nextRequestAt = geminiNextRequestAt;
    persistGeminiRateState();
    return task(model);
  });
  geminiRequestQueue = queuedRequest.catch(() => {});
  return queuedRequest;
}

function getGeminiApiKey() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['aiRememberKey', 'aiGeminiApiKey'], (localData) => {
      if (localData.aiRememberKey) {
        resolve(String(localData.aiGeminiApiKey || '').trim());
        return;
      }
      const sessionStorage = chrome.storage.session || chrome.storage.local;
      sessionStorage.get('aiGeminiApiKey', (sessionData) => {
        resolve(String(sessionData.aiGeminiApiKey || '').trim());
      });
    });
  });
}

async function translateWithGemini(
  text,
  sourceLang,
  targetLang,
  apiKeyOverride = '',
  allowModelFallback = true
) {
  const apiKey = apiKeyOverride || await getGeminiApiKey();
  if (!apiKey) throw new Error('missing_key');

  const delimiterInstruction = text.includes('[[[LASDOSCAS_BREAK_9F2D]]]')
    ? 'The input contains [[[LASDOSCAS_BREAK_9F2D]]] separators. Preserve every separator exactly, in the same order, with no extra separators.'
    : '';
  const prompt = [
    `Translate the subtitle text from ${sourceLang || 'its detected language'} to ${targetLang}.`,
    'Use natural subtitle language, preserve meaning, names, numbers, tone, and punctuation.',
    'Return only the translation. Do not explain, summarize, add labels, or use Markdown.',
    delimiterInstruction,
    '',
    text
  ].filter(Boolean).join('\n');

  const requestOnce = () => queueGeminiRequest(async (model) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), GEMINI_TRANSLATION_TIMEOUT_MS);
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey
          },
          cache: 'no-store',
          signal: controller.signal,
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.2,
              maxOutputTokens: 8192
            }
          })
        }
      );
      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        const retryAfterMs = response.status === 429
          ? enterGeminiCooldown(model, response, errorText)
          : 0;
        if (response.status === 404) markGeminiModelUnavailable(model);
        throw createGeminiHttpError(response.status, retryAfterMs);
      }
      const data = await response.json();
      const translation = data?.candidates?.[0]?.content?.parts
        ?.map((part) => part.text || '')
        .join('')
        .trim();
      if (!translation) throw new Error('empty_gemini_response');
      const modelState = getGeminiModelState(model);
      if (modelState.consecutiveRateLimits || modelState.unavailableUntil) {
        modelState.consecutiveRateLimits = 0;
        modelState.cooldownUntil = 0;
        modelState.unavailableUntil = 0;
        persistGeminiRateState();
      }
      return translation;
    } finally {
      clearTimeout(timeoutId);
    }
  });

  let lastError = null;
  const maxAttempts = allowModelFallback ? GEMINI_MODELS.length : 1;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      return await requestOnce();
    } catch (error) {
      lastError = error;
      // Quota exhaustion and unavailable model ids are eligible for fallback.
      // Authentication, network and generation errors should be surfaced as-is.
      // A 429 means the project quota is exhausted. Retrying on another model
      // spends more quota and is the main cause of cross-model explosions.
      if (error?.status === 429) throw error;
      if (error?.status !== 404) throw error;
    }
  }
  throw lastError || createGeminiHttpError(429);
}

function getGeminiTranslation(text, sourceLang, targetLang) {
  const cacheKey = [
    'gemini',
    String(sourceLang || '').toLowerCase(),
    String(targetLang || '').toLowerCase(),
    text
  ].join('\u0000');
  const cachedTranslation = getCachedTranslation(cacheKey);
  if (cachedTranslation !== null) return Promise.resolve(cachedTranslation);
  if (geminiInflightTranslations.has(cacheKey)) return geminiInflightTranslations.get(cacheKey);

  const request = translateWithGemini(text, sourceLang, targetLang)
    .then((translation) => {
      cacheTranslation(cacheKey, translation, text.length);
      return translation;
    })
    .finally(() => geminiInflightTranslations.delete(cacheKey));
  geminiInflightTranslations.set(cacheKey, request);
  return request;
}

function getCachedTranslation(cacheKey) {
  if (!translationCache.has(cacheKey)) return null;
  const entry = translationCache.get(cacheKey);
  if (entry.expiresAt <= Date.now()) {
    translationCache.delete(cacheKey);
    return null;
  }
  translationCache.delete(cacheKey);
  translationCache.set(cacheKey, entry);
  return entry.translation;
}

function cacheTranslation(cacheKey, translation, sourceLength) {
  if (!translation || sourceLength > TRANSLATION_CACHE_MAX_SOURCE_LENGTH) return;
  translationCache.delete(cacheKey);
  translationCache.set(cacheKey, {
    translation,
    expiresAt: Date.now() + TRANSLATION_CACHE_TTL_MS
  });

  if (translationCache.size > TRANSLATION_CACHE_MAX_ENTRIES) {
    const oldestKey = translationCache.keys().next().value;
    translationCache.delete(oldestKey);
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // 1. 接收来自 popup.js 的关闭 iframe 指令 (需放在最上方)
  if (request.action === "close_popup_iframe") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].id) {
        chrome.tabs.sendMessage(tabs[0].id, { action: "close_settings_panel" });
      }
    });
    return false; // 不需要异步响应
  }

  if (request.action === 'translate_ai') {
    const text = String(request.text || '')
      .replace(/[\u200B-\u200F\u202A-\u202E\uFEFF]/g, '')
      .trim();
    if (!text || text.length > 24000) {
      sendResponse({ translation: '', source: '', error: text ? 'text_too_long' : 'empty_text' });
      return false;
    }

    getGeminiTranslation(text, request.sourceLang, request.lang || 'zh-CN')
      .then((translation) => sendResponse({ translation, source: 'gemini' }))
      .catch((error) => {
        console.info('lasDoscas: Gemini 翻译未完成，将按设置决定是否回退。', error.message);
        sendResponse({ translation: '', source: '', error: error.message });
      });
    return true;
  }

  // 2. 翻译请求逻辑
  if (request.action === "translate") {
    const targetLang = request.lang || "zh-CN"; 
    
    // 【优化 1：文本净化与严格编码】
    // 移除零宽字符、Bidi 控制符(如 U+202B 等)容易导致 Google 翻译接口 500 报错的隐藏字符，并去掉首尾空格
    const safeText = (request.text || "")
      .replace(/[\u200B-\u200F\u202A-\u202E\uFEFF]/g, '') 
      .trim();
    
    // 如果净化后文本为空，直接返回空翻译，无需发起网络请求
    if (!safeText) {
      sendResponse({ translation: "", source: '' });
      return false;
    }

    const translationCacheKey = `${String(targetLang).toLowerCase()}\u0000${safeText}`;
    const cachedTranslation = getCachedTranslation(translationCacheKey);
    if (cachedTranslation !== null) {
      sendResponse({ translation: cachedTranslation, source: 'standard' });
      return false;
    }

    // 使用净化后的 safeText 和严格的 encodeURIComponent 组装 URL
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(safeText)}`;

    // 封装一个带重试机制的异步请求函数
    const fetchWithRetry = async (targetUrl, retries = 2) => {
      for (let i = 0; i <= retries; i++) {
        try {
          const response = await fetch(targetUrl);
          
          // 如果是 50x 服务器错误，且还有重试次数，就稍微等一下再试
          if (response.status >= 500 && i < retries) {
            console.info(`[lasDoscas 翻译 API 波动] 状态码 ${response.status}，准备进行第 ${i + 1} 次重试...`);
            await new Promise(resolve => setTimeout(resolve, 800)); // 暂停 800 毫秒
            continue;
          }
          return response; // 成功（或遇到 403/429 等非服务器错误，或重试耗尽），直接返回
        } catch (err) {
          // 捕获纯网络断开的情况
          if (i === retries) throw err;
          await new Promise(resolve => setTimeout(resolve, 800));
        }
      }
    };

    // 使用封装好的函数发起请求
    fetchWithRetry(url)
      .then(async response => {
        if (!response.ok) {
          // 【优化 2：拦截 500 错误并优雅降级】
          // 如果重试结束后依然是 500 系列错误，静默拦截，不再抛出异常 (throw Error)
          if (response.status >= 500) {
             console.info(`[lasDoscas] Google 翻译服务端异常 (${response.status})，已静默拦截并降级显示原文。`);
             return null; // 返回 null 传递给下一个 then，触发降级
          }

          const errorHtml = await response.text();
          if (response.status === 429 || response.status === 403) {
            console.info(`[lasDoscas] 翻译服务暂时限流 (${response.status})，已降级显示原文。`);
            throw new Error("请求太频繁，被 Google 暂时封禁 IP 了");
          }
          console.error(`HTTP 错误 [${response.status}]:`, errorHtml.substring(0, 200) + "...");
          throw new Error(`网络请求失败 (状态码: ${response.status})`);
        }

        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          const wrongText = await response.text();
          console.error("服务器返回了非 JSON 格式:", wrongText.substring(0, 200) + "...");
          throw new Error("接口返回了网页而不是数据，可能是网络被劫持或需人机验证");
        }

        return response.json();
      })
      .then(data => {
        // 【优化 2 续：接收 null，优雅降级】
        if (!data) {
          sendResponse({ translation: "", source: '' });
          return;
        }

        if (data && data[0]) {
          const translatedText = data[0].map(item => item[0]).join('');
          cacheTranslation(translationCacheKey, translatedText, safeText.length);
          sendResponse({ translation: translatedText, source: 'standard' });
        } else {
          // 如果返回的数据格式异常，同样降级处理
          sendResponse({ translation: "", source: '' });
        }
      })
      .catch(error => {
        console.info("lasDoscas: 翻译请求未完成，已降级显示原文。", error.message);
        // 静默处理，不让前端字幕框报错崩溃，直接返回空字符串
        sendResponse({ translation: "", source: '' });
      });

    return true; // 保持消息通道开启
  }

  if (request.action === "test_gemini_key") {
    const apiKey = String(request.apiKey || '').trim();
    if (!apiKey) {
      sendResponse({ ok: false, code: 'missing_key' });
      return false;
    }

    // A connection test is deliberately limited to one model so a button
    // click cannot consume the whole fallback chain when quotas are low.
    translateWithGemini('Hello', 'en', 'es', apiKey, false).then(() => {
      sendResponse({ ok: true });
    }).catch((error) => {
      const httpStatus = Number(error?.status || String(error?.message || '').match(/gemini_http_(\d+)/)?.[1] || 0);
      let code = error?.name === 'AbortError' ? 'timeout' : 'request_failed';
      if (httpStatus === 401 || httpStatus === 403) code = 'invalid_key';
      else if (httpStatus === 429) code = 'rate_limited';
      else if (!httpStatus && code !== 'timeout') code = 'network_error';
      sendResponse({
        ok: false,
        code,
        status: httpStatus || undefined
      });
    });
    return true;
  }
});

// 3. 监听浏览器快捷键
chrome.commands.onCommand.addListener((command) => {
  if (command === "toggle_fullscreen_settings") {
    // 获取当前活跃的 YouTube 标签页并发送切换面板的消息
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].id) {
        chrome.tabs.sendMessage(tabs[0].id, { action: "toggle_settings_panel" });
      }
    });
  }
});
