const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const backgroundSource = fs.readFileSync(
  path.resolve(__dirname, '..', 'background.js'),
  'utf8'
);

function createBackgroundHarness() {
  let messageListener = null;
  let now = 1_000_000;
  let fetchCount = 0;

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
      tabs: { query() {}, sendMessage() {} }
    },
    console,
    Date: FakeDate,
    encodeURIComponent,
    fetch: async () => {
      fetchCount += 1;
      return {
        headers: { get: () => 'application/json' },
        json: async () => [[['translated']]],
        ok: true,
        status: 200
      };
    },
    Map,
    setTimeout
  };
  vm.createContext(context);
  vm.runInContext(
    `${backgroundSource}\n;globalThis.cacheApi = {
      cacheTranslation,
      getCachedTranslation,
      translationCache
    };`,
    context
  );

  return {
    cacheApi: context.cacheApi,
    getFetchCount: () => fetchCount,
    send(request) {
      return new Promise((resolve) => {
        assert.ok(messageListener, 'background message listener was not installed');
        messageListener(request, {}, resolve);
      });
    },
    setNow(value) {
      now = value;
    }
  };
}

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
