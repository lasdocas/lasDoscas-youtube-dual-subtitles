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

test('localization catalog loads before the isolated content script', () => {
  const isolatedScripts = manifest.content_scripts.find(
    (entry) => entry.world === 'ISOLATED'
  ).js;
  assert.deepEqual(isolatedScripts, ['localization.js', 'content.js']);
});
