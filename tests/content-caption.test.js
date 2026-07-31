const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const contentSource = fs.readFileSync(
  path.resolve(__dirname, '..', 'content.js'),
  'utf8'
).replace(/\r\n/g, '\n');

function extractBetween(startMarker, endMarker) {
  const start = contentSource.indexOf(startMarker);
  const end = contentSource.indexOf(endMarker, start);
  assert.notEqual(start, -1, `Missing start marker: ${startMarker}`);
  assert.notEqual(end, -1, `Missing end marker: ${endMarker}`);
  return contentSource.slice(start, end);
}

function loadCaptionAlgorithms() {
  const context = {
    currentSourceLang: 'en',
    currentSettings: { lang: 'es' },
    Intl,
    Map,
    Set
  };
  vm.createContext(context);

  const source = [
    extractBetween('function isSpaceDelimitedLang', 'function getHintMessage'),
    extractBetween('const DISPLAY_MAX_CHARS', 'const AUTO_FILE_RENDER_INTERVAL_MS'),
    extractBetween('function normalizeCaptionText', 'function renderLiveAsrContent'),
    `globalThis.captionAlgorithms = {
      normalizeCaptionText,
      splitCompletedCaptionSentences,
      buildBilingualDisplayParts,
      getDisplayPartIndex,
      getStableDisplayPart,
      getRollingAsrDelta,
      getSentenceSegmenter,
      isRtlLanguage
    };`
  ].join('\n');

  vm.runInContext(source, context);
  return { context, ...context.captionAlgorithms };
}

test('sentence segmentation keeps abbreviations and decimal numbers intact', () => {
  const { splitCompletedCaptionSentences } = loadCaptionAlgorithms();
  const result = splitCompletedCaptionSentences(
    'Dr. Smith measured 3.14 units. Next sentence.',
    'en'
  );

  assert.deepEqual(
    Array.from(result.completed, (sentence) => sentence.text),
    ['Dr. Smith measured 3.14 units.', 'Next sentence.']
  );
  assert.equal(result.remainder, '');
});

test('sentence segmentation supports compact-language punctuation and remainder', () => {
  const { splitCompletedCaptionSentences } = loadCaptionAlgorithms();
  const result = splitCompletedCaptionSentences(
    '\u7b2c\u4e00\u53e5\u3002\u7b2c\u4e8c\u53e5\uff01\u672a\u5b8c\u6210',
    'zh-CN'
  );

  assert.deepEqual(
    Array.from(result.completed, (sentence) => sentence.text),
    ['\u7b2c\u4e00\u53e5\u3002', '\u7b2c\u4e8c\u53e5\uff01']
  );
  assert.equal(result.remainder, '\u672a\u5b8c\u6210');
});

test('segmenter instances are reused per normalized locale key', () => {
  const { getSentenceSegmenter } = loadCaptionAlgorithms();
  assert.equal(getSentenceSegmenter('en'), getSentenceSegmenter('EN'));
  assert.notEqual(getSentenceSegmenter('en'), getSentenceSegmenter('es'));
});

test('cue duration caps the number of display parts', () => {
  const { buildBilingualDisplayParts } = loadCaptionAlgorithms();
  const source = 'One two three four five six. Seven eight nine ten eleven twelve.';

  assert.equal(buildBilingualDisplayParts(source, '', 2.9).length, 1);
  assert.equal(buildBilingualDisplayParts(source, '', 3.2).length, 2);
});

test('late short translation does not change source boundaries', () => {
  const { buildBilingualDisplayParts } = loadCaptionAlgorithms();
  const source = 'One two three four five six. Seven eight nine ten eleven twelve.';
  const withoutTranslation = buildBilingualDisplayParts(source, '', 3.2);
  const withTranslation = buildBilingualDisplayParts(source, 'Bien.', 3.2);

  assert.deepEqual(
    Array.from(withTranslation, (part) => part.source),
    Array.from(withoutTranslation, (part) => part.source)
  );
});

test('every display part receives at least the minimum dwell time', () => {
  const { getDisplayPartIndex } = loadCaptionAlgorithms();
  const cue = { start: 0, end: 6 };
  const parts = [
    { source: 'a', translation: 'x' },
    { source: 'b'.repeat(100), translation: 'y' },
    { source: 'c', translation: 'z' },
    { source: 'd'.repeat(100), translation: 'w' }
  ];

  const expectations = [
    [1.49, 0],
    [1.5, 1],
    [2.99, 1],
    [3, 2],
    [4.49, 2],
    [4.5, 3]
  ];
  for (const [playbackTime, expectedPart] of expectations) {
    assert.equal(getDisplayPartIndex(cue, parts, playbackTime), expectedPart);
  }
});

test('stable page displays only the current part', () => {
  const { getStableDisplayPart } = loadCaptionAlgorithms();
  const parts = [
    { source: 'first', translation: 'primero' },
    { source: 'second', translation: 'segundo' }
  ];

  assert.equal(getStableDisplayPart(parts, 1), parts[1]);
});

test('rolling ASR delta removes repeated prefixes and word overlap', () => {
  const { getRollingAsrDelta } = loadCaptionAlgorithms();
  assert.equal(getRollingAsrDelta('hello world', 'hello world again', true), 'again');
  assert.equal(getRollingAsrDelta('hello brave world', 'world again', true), 'again');
  assert.equal(getRollingAsrDelta('\u4f60\u597d\u4e16\u754c', '\u4e16\u754c\u518d\u89c1', false), '\u518d\u89c1');
});

test('RTL source languages are identified explicitly', () => {
  const { isRtlLanguage } = loadCaptionAlgorithms();
  for (const language of ['ar', 'fa-IR', 'he', 'iw', 'ur']) {
    assert.equal(isRtlLanguage(language), true);
  }
  for (const language of ['en', 'es', 'zh-CN']) {
    assert.equal(isRtlLanguage(language), false);
  }
});
