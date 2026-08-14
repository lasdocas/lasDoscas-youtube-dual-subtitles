const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const localizationSource = fs.readFileSync(
  path.resolve(__dirname, '..', 'localization.js'),
  'utf8'
);
const manifest = JSON.parse(fs.readFileSync(
  path.resolve(__dirname, '..', 'manifest.json'),
  'utf8'
));

function loadMessages() {
  const context = {};
  vm.createContext(context);
  vm.runInContext(localizationSource, context);
  return context.lasDoscasMessages;
}

function normalizedLocaleKeys(dictionary) {
  return Object.keys(dictionary).map((key) => key.toLowerCase()).sort();
}

function assertFlatMessageDictionary(dictionary, name) {
  assert.equal(typeof dictionary.en, 'string', `${name} must define an English fallback`);
  assert.notEqual(dictionary.en.trim(), '', `${name}.en must not be empty`);
  const normalizedKeys = new Set();
  for (const [locale, message] of Object.entries(dictionary)) {
    assert.equal(locale, locale.trim(), `${name} contains a locale with surrounding whitespace`);
    assert.equal(typeof message, 'string', `${name}.${locale} must be a string`);
    assert.notEqual(message.trim(), '', `${name}.${locale} must not be empty`);
    const normalizedLocale = locale.toLowerCase();
    assert.equal(
      normalizedKeys.has(normalizedLocale),
      false,
      `${name} contains duplicate locale keys that differ only by case: ${locale}`
    );
    normalizedKeys.add(normalizedLocale);
  }
}

test('localized messages prefer exact locale and language-prefix fallbacks', () => {
  const messages = loadMessages();
  const { hintMessageDict, resolveLocalizedMessage } = messages;

  assert.equal(
    resolveLocalizedMessage(hintMessageDict, 'fr-CA'),
    '[Sous-titres générés automatiquement: synchronisation en temps réel activée]'
  );
  assert.equal(
    resolveLocalizedMessage(hintMessageDict, 'es-MX'),
    hintMessageDict.es
  );
});

test('localized messages fall back to English for unsupported languages', () => {
  const messages = loadMessages();
  assert.equal(
    messages.resolveLocalizedMessage(messages.loadingMessageDict, 'xx-YY'),
    messages.loadingMessageDict.en
  );
});

test('auto-translation warning asks for an original or auto-generated caption track', () => {
  const messages = loadMessages();
  const simplifiedChinese = messages.autoTranslateSelectionMessageDict.zh;
  const english = messages.autoTranslateSelectionMessageDict.en;
  const spanish = messages.autoTranslateSelectionMessageDict.es;

  assert.match(simplifiedChinese, /检测到 YouTube 自动翻译/);
  assert.match(simplifiedChinese, /字幕文件/);
  assert.match(simplifiedChinese, /自动生成/);
  assert.match(simplifiedChinese, /更准确、及时的翻译/);
  assert.match(english, /YouTube auto-translation detected/);
  assert.match(english, /original or auto-generated Subtitle\/CC/);
  assert.match(english, /more accurate, timely translation/);
  assert.match(spanish, /traducción automática de YouTube/);
  assert.match(spanish, /subtítulos originales o generados automáticamente/);
  assert.match(spanish, /más precisa y oportuna/);
  assert.deepEqual(
    Object.keys(messages.autoTranslateSelectionMessageDict).sort(),
    ['en', 'es', 'zh']
  );
});

test('localization catalog exposes immutable top-level dictionaries', () => {
  const messages = loadMessages();
  assert.equal(Object.isFrozen(messages), true);
  assert.equal(Object.isFrozen(messages.loadingMessageDict), true);
  assert.equal(Object.isFrozen(messages.hintMessageDict), true);
  assert.equal(Object.isFrozen(messages.autoTranslateSelectionMessageDict), true);
  assert.equal(Object.isFrozen(messages.liveAsrUiText), true);
  assert.equal(Object.isFrozen(messages.liveAsrUiText.en), true);
});

test('flat localization dictionaries contain valid messages and English fallbacks', () => {
  const messages = loadMessages();
  for (const name of [
    'loadingMessageDict',
    'aiLoadingMessageDict',
    'youtubeCaptionsDisabledMessageDict',
    'hintMessageDict',
    'autoTranslateSelectionMessageDict'
  ]) {
    assertFlatMessageDictionary(messages[name], name);
  }
});

test('core status catalogs cover the same normalized locales', () => {
  const messages = loadMessages();
  const expectedLocales = normalizedLocaleKeys(messages.loadingMessageDict);
  for (const name of [
    'youtubeCaptionsDisabledMessageDict',
    'hintMessageDict'
  ]) {
    assert.deepEqual(normalizedLocaleKeys(messages[name]), expectedLocales, name);
  }
});

test('copy UI locales contain every required label', () => {
  const { copyUiText } = loadMessages();
  const requiredKeys = ['subtitleLabel', 'fullLabel', 'copied', 'failed'];
  assert.equal(typeof copyUiText.en, 'object');
  for (const [locale, labels] of Object.entries(copyUiText)) {
    assert.equal(locale, locale.trim());
    assert.deepEqual(Object.keys(labels).sort(), requiredKeys.slice().sort(), locale);
    for (const key of requiredKeys) {
      assert.equal(typeof labels[key], 'string', `${locale}.${key} must be a string`);
      assert.notEqual(labels[key].trim(), '', `${locale}.${key} must not be empty`);
    }
  }
});

test('live ASR UI text covers supported UI locales with an English fallback', () => {
  const { liveAsrUiText } = loadMessages();
  assert.deepEqual(Object.keys(liveAsrUiText).sort(), ['en', 'es', 'zh']);
  for (const [locale, text] of Object.entries(liveAsrUiText)) {
    assert.equal(Object.isFrozen(text), true, locale);
    assert.deepEqual(Object.keys(text).sort(), ['label', 'notice'], locale);
    assert.notEqual(text.label.trim(), '', `${locale}.label`);
    assert.notEqual(text.notice.trim(), '', `${locale}.notice`);
  }
  assert.equal(liveAsrUiText.en.label, 'Live transcription');
});

test('localization catalog loads before the isolated content script', () => {
  const isolatedScripts = manifest.content_scripts.find(
    (entry) => entry.world === 'ISOLATED'
  ).js;
  assert.deepEqual(isolatedScripts, ['localization.js', 'content.js']);
});
