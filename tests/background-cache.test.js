const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const backgroundSource = fs.readFileSync(
  path.resolve(__dirname, '..', 'background.js'),
  'utf8'
);

test('Gemini pacing waits instead of manufacturing a local 429', () => {
  const executeStart = backgroundSource.indexOf('async function executeGeminiRequest');
  const executeEnd = backgroundSource.indexOf('async function drainGeminiRequestQueue', executeStart);
  assert.notEqual(executeStart, -1);
  assert.notEqual(executeEnd, -1);
  const queueBody = backgroundSource.slice(executeStart, executeEnd);

  assert.match(queueBody, /const waitMs = Math\.max\(/);
  assert.match(queueBody, /if \(waitMs\) await new Promise/);
  assert.doesNotMatch(queueBody, /geminiNextRequestAt > Date\.now\(\)/);
  assert.doesNotMatch(queueBody, /globalCooldownUntil > Date\.now\(\)/);
});

test('AI prompt asks models to resolve spoken and domain-specific ambiguity', () => {
  assert.match(backgroundSource, /Infer domain-specific and idiomatic meanings from the full sentence/);
  assert.match(backgroundSource, /imperfect spoken-language transcription/);
});

test('Gemini fallback candidates include the broadly available 2.5 Flash model', () => {
  assert.match(backgroundSource, /'gemini-2\.5-flash'/);
});

function createBackgroundHarness() {
  let messageListener = null;
  let now = 1_000_000;
  let fetchCount = 0;
  let sessionStorage = {};
  let localStorage = {};
  let fetchHandler = async () => ({
    headers: { get: () => 'application/json' },
    json: async () => [[['translated']]],
    text: async () => '',
    ok: true,
    status: 200
  });

  class FakeDate extends Date {
    static now() {
      return now;
    }
  }

  const context = {
    chrome: {
      commands: { onCommand: { addListener() {} } },
      runtime: {
        onMessage: {
          addListener(listener) {
            messageListener = listener;
          }
        }
      },
      tabs: { query() {}, sendMessage() {} },
      storage: {
        local: {
          get(keys, callback) {
            callback(Object.fromEntries(keys.map((key) => [key, localStorage[key]])));
          },
          set(value, callback) {
            localStorage = { ...localStorage, ...value };
            callback?.();
          }
        },
        session: {
          get(key, callback) {
            callback({ [key]: sessionStorage[key] });
          },
          set(value, callback) {
            sessionStorage = { ...sessionStorage, ...value };
            callback?.();
          }
        }
      }
    },
    console,
    Date: FakeDate,
    encodeURIComponent,
    fetch: async (...args) => {
      fetchCount += 1;
      return fetchHandler(...args);
    },
    Map,
    setTimeout(callback, delay, ...args) {
      // Advance the frozen clock through the four-second Gemini pacing window
      // without making fallback tests sleep in real time.
      if (delay === 4000) {
        now += delay;
        return setTimeout(callback, 0, ...args);
      }
      return setTimeout(callback, delay, ...args);
    },
    clearTimeout,
    AbortController
  };
  vm.createContext(context);
  vm.runInContext(
    `${backgroundSource}\n;globalThis.cacheApi = {
      cacheTranslation,
      getCachedTranslation,
      translationCache
    }; globalThis.queueApi = { queueGeminiRequest };`,
    context
  );

  return {
    cacheApi: context.cacheApi,
    queueApi: context.queueApi,
    getFetchCount: () => fetchCount,
    send(request) {
      return new Promise((resolve) => {
        assert.ok(messageListener, 'background message listener was not installed');
        messageListener(request, {}, resolve);
      });
    },
    setNow(value) {
      now = value;
    },
    setFetchHandler(handler) {
      fetchHandler = handler;
    },
    setSessionStorage(value) {
      sessionStorage = { ...value };
    },
    setLocalStorage(value) {
      localStorage = { ...value };
    }
  };
}

test('visible Gemini work overtakes queued prefetch work', async () => {
  const harness = createBackgroundHarness();
  const order = [];
  let releaseFirst;
  const first = harness.queueApi.queueGeminiRequest(() => new Promise((resolve) => {
    order.push('prefetch-active');
    releaseFirst = resolve;
  }), 'prefetch');
  const stalePrefetch = harness.queueApi.queueGeminiRequest(() => {
    order.push('prefetch-queued');
    return 'prefetch';
  }, 'prefetch');
  const visible = harness.queueApi.queueGeminiRequest(() => {
    order.push('visible');
    return 'visible';
  }, 'visible');

  await new Promise((resolve) => setImmediate(resolve));
  releaseFirst('first');
  await Promise.all([first, stalePrefetch, visible]);
  assert.deepEqual(order, ['prefetch-active', 'visible', 'prefetch-queued']);
});

test('translation requests reuse normalized text and language cache keys', async () => {
  const harness = createBackgroundHarness();

  const firstResponse = await harness.send({
    action: 'translate',
    text: '  he\u200Bllo  ',
    lang: 'ES'
  });
  const cachedResponse = await harness.send({ action: 'translate', text: 'hello', lang: 'es' });
  assert.equal(firstResponse.translation, 'translated');
  assert.equal(cachedResponse.translation, 'translated');
  assert.equal(harness.getFetchCount(), 1);

  await harness.send({ action: 'translate', text: 'hello', lang: 'en' });
  assert.equal(harness.getFetchCount(), 2);
});

test('cache entries expire after thirty minutes', () => {
  const harness = createBackgroundHarness();
  harness.cacheApi.cacheTranslation('es\u0000hello', 'hola', 5);
  assert.equal(harness.cacheApi.getCachedTranslation('es\u0000hello'), 'hola');

  harness.setNow(1_000_000 + 30 * 60 * 1000 + 1);
  assert.equal(harness.cacheApi.getCachedTranslation('es\u0000hello'), null);
});

test('oversized source text is not cached', () => {
  const harness = createBackgroundHarness();
  harness.cacheApi.cacheTranslation('es\u0000large', 'translation', 2001);
  assert.equal(harness.cacheApi.getCachedTranslation('es\u0000large'), null);
});

test('LRU eviction keeps recently read entries', () => {
  const harness = createBackgroundHarness();
  for (let index = 0; index < 500; index += 1) {
    harness.cacheApi.cacheTranslation(`key-${index}`, `value-${index}`, 10);
  }

  assert.equal(harness.cacheApi.getCachedTranslation('key-0'), 'value-0');
  harness.cacheApi.cacheTranslation('key-500', 'value-500', 10);

  assert.equal(harness.cacheApi.translationCache.size, 500);
  assert.equal(harness.cacheApi.getCachedTranslation('key-1'), null);
  assert.equal(harness.cacheApi.getCachedTranslation('key-0'), 'value-0');
});

test('Gemini translation uses the session key and reports its source', async () => {
  const harness = createBackgroundHarness();
  harness.setSessionStorage({ aiGeminiApiKey: 'session-key' });
  harness.setFetchHandler(async (url, options) => {
    assert.match(url, /gemini-3\.5-flash:generateContent$/);
    assert.equal(options.headers['x-goog-api-key'], 'session-key');
    return {
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: 'Hola' }] } }]
      })
    };
  });

  const response = await harness.send({
    action: 'translate_ai',
    text: 'Hello',
    sourceLang: 'en',
    lang: 'es'
  });

  assert.equal(response.translation, 'Hola');
  assert.equal(response.source, 'gemini');
  assert.equal(response.cached, false);
});

test('Groq translation uses the configured provider and OpenAI-compatible payload', async () => {
  const harness = createBackgroundHarness();
  harness.setLocalStorage({ aiProvider: 'groq', aiGroqApiKey: 'groq-key', aiRememberKey: true });
  harness.setFetchHandler(async (url, options) => {
    assert.equal(url, 'https://api.groq.com/openai/v1/chat/completions');
    assert.equal(options.headers.Authorization, 'Bearer groq-key');
    const body = JSON.parse(options.body);
    assert.equal(body.model, 'llama-3.3-70b-versatile');
    assert.equal(body.messages[0].role, 'user');
    assert.match(body.messages[0].content, /Translate the subtitle text/);
    return {
      ok: true,
      status: 200,
      json: async () => ({ choices: [{ message: { content: 'Hola Groq' } }] })
    };
  });

  const response = await harness.send({
    action: 'translate_ai',
    text: 'Hello',
    sourceLang: 'en',
    lang: 'es'
  });

  assert.equal(response.translation, 'Hola Groq');
  assert.equal(response.source, 'groq');
  assert.equal(response.cached, false);
});

test('OpenRouter key test reports invalid credentials without using Gemini', async () => {
  const harness = createBackgroundHarness();
  harness.setFetchHandler(async (url, options) => {
    assert.equal(url, 'https://openrouter.ai/api/v1/chat/completions');
    assert.equal(options.headers.Authorization, 'Bearer router-key');
    return {
      ok: false,
      status: 401,
      text: async () => '{"error":"unauthorized"}'
    };
  });

  const response = await harness.send({ action: 'test_ai_key', provider: 'openrouter', apiKey: 'router-key' });
  assert.equal(response.ok, false);
  assert.equal(response.code, 'invalid_key');
  assert.equal(response.status, 401);
  assert.equal(harness.getFetchCount(), 1);
});

test('concurrent identical Gemini translations share one request', async () => {
  const harness = createBackgroundHarness();
  harness.setSessionStorage({ aiGeminiApiKey: 'session-key' });
  let releaseRequest;
  harness.setFetchHandler((url, options) => new Promise((resolve) => {
    releaseRequest = () => resolve({
      ok: true,
      status: 200,
      json: async () => ({ candidates: [{ content: { parts: [{ text: 'Hola' }] } }] })
    });
  }));

  const first = harness.send({ action: 'translate_ai', text: 'Hello', sourceLang: 'en', lang: 'es' });
  const second = harness.send({ action: 'translate_ai', text: 'Hello', sourceLang: 'en', lang: 'es' });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(harness.getFetchCount(), 1);
  releaseRequest();
  assert.equal((await first).translation, 'Hola');
  assert.equal((await second).translation, 'Hola');

  const cached = await harness.send({
    action: 'translate_ai',
    text: 'Hello',
    sourceLang: 'en',
    lang: 'es'
  });
  assert.equal(cached.translation, 'Hola');
  assert.equal(cached.cached, true);
  assert.equal(harness.getFetchCount(), 1);
});

test('Gemini 429 cools each model and exhausts the paced fallback chain once', async () => {
  const harness = createBackgroundHarness();
  harness.setSessionStorage({ aiGeminiApiKey: 'session-key' });
  harness.setFetchHandler(async () => ({
    ok: false,
    status: 429,
    headers: { get: () => null },
    text: async () => '{"error":{"status":"RESOURCE_EXHAUSTED"}}'
  }));

  const first = await harness.send({ action: 'translate_ai', text: 'First', sourceLang: 'en', lang: 'es' });
  const second = await harness.send({ action: 'translate_ai', text: 'Second', sourceLang: 'en', lang: 'es' });
  assert.equal(first.error, 'gemini_http_429');
  assert.equal(second.error, 'gemini_http_429');
  assert.equal(harness.getFetchCount(), 5);
});

test('Gemini model quota exhaustion falls back to the next model', async () => {
  const harness = createBackgroundHarness();
  harness.setSessionStorage({ aiGeminiApiKey: 'session-key' });
  const attemptedModels = [];
  harness.setFetchHandler(async (url) => {
    const model = String(url).match(/models\/([^:]+)/)?.[1];
    attemptedModels.push(model);
    if (attemptedModels.length === 1) {
      return {
        ok: false,
        status: 429,
        headers: { get: () => null },
        text: async () => '{"error":{"status":"RESOURCE_EXHAUSTED"}}'
      };
    }
    return {
      ok: true,
      status: 200,
      json: async () => ({ candidates: [{ content: { parts: [{ text: 'Hola Lite' }] } }] })
    };
  });

  const response = await harness.send({
    action: 'translate_ai',
    text: 'Hello fallback',
    sourceLang: 'en',
    lang: 'es'
  });

  assert.equal(response.translation, 'Hola Lite');
  assert.equal(response.source, 'gemini');
  assert.deepEqual(attemptedModels, ['gemini-3.5-flash', 'gemini-3.5-flash-lite']);
});

test('Gemini key test succeeds when a fallback model still has quota', async () => {
  const harness = createBackgroundHarness();
  let requestCount = 0;
  harness.setFetchHandler(async () => {
    requestCount += 1;
    if (requestCount === 1) {
      return {
        ok: false,
        status: 429,
        headers: { get: () => null },
        text: async () => '{"error":{"status":"RESOURCE_EXHAUSTED"}}'
      };
    }
    return {
      ok: true,
      status: 200,
      json: async () => ({ candidates: [{ content: { parts: [{ text: 'Hola' }] } }] })
    };
  });

  const response = await harness.send({ action: 'test_gemini_key', apiKey: 'test-key' });
  assert.equal(response.ok, true);
  assert.equal(harness.getFetchCount(), 2);
});
