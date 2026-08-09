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

test('localization catalog exposes immutable top-level dictionaries', () => {
  const messages = loadMessages();
  assert.equal(Object.isFrozen(messages), true);
  assert.equal(Object.isFrozen(messages.loadingMessageDict), true);
  assert.equal(Object.isFrozen(messages.hintMessageDict), true);
  assert.equal(Object.isFrozen(messages.autoTranslateSelectionMessageDict), true);
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
    'hintMessageDict',
    'autoTranslateSelectionMessageDict'
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

test('localization catalog loads before the isolated content script', () => {
  const isolatedScripts = manifest.content_scripts.find(
    (entry) => entry.world === 'ISOLATED'
  ).js;
  assert.deepEqual(isolatedScripts, ['localization.js', 'content.js']);
});
