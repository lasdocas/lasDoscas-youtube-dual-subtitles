const TRANSLATION_CACHE_MAX_ENTRIES = 500;
const TRANSLATION_CACHE_TTL_MS = 30 * 60 * 1000;
const TRANSLATION_CACHE_MAX_SOURCE_LENGTH = 2000;
const translationCache = new Map();

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
      sendResponse({ translation: "" });
      return false;
    }

    const translationCacheKey = `${String(targetLang).toLowerCase()}\u0000${safeText}`;
    const cachedTranslation = getCachedTranslation(translationCacheKey);
    if (cachedTranslation !== null) {
      sendResponse({ translation: cachedTranslation });
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
          sendResponse({ translation: "" });
          return;
        }

        if (data && data[0]) {
          const translatedText = data[0].map(item => item[0]).join('');
          cacheTranslation(translationCacheKey, translatedText, safeText.length);
          sendResponse({ translation: translatedText });
        } else {
          // 如果返回的数据格式异常，同样降级处理
          sendResponse({ translation: "" });
        }
      })
      .catch(error => {
        console.info("lasDoscas: 翻译请求未完成，已降级显示原文。", error.message);
        // 静默处理，不让前端字幕框报错崩溃，直接返回空字符串
        sendResponse({ translation: "" }); 
      });

    return true; // 保持消息通道开启
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
