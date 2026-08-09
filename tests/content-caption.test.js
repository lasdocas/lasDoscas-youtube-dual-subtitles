const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const contentSource = fs.readFileSync(
  path.resolve(__dirname, '..', 'content.js'),
  'utf8'
).replace(/\r\n/g, '\n');
const styleSource = fs.readFileSync(
  path.resolve(__dirname, '..', 'style.css'),
  'utf8'
).replace(/\r\n/g, '\n');
const popupSource = fs.readFileSync(
  path.resolve(__dirname, '..', 'popup.html'),
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

function loadPlayerScaleCalculator() {
  const context = { Number };
  vm.createContext(context);
  const source = [
    extractBetween('const BASE_PLAYER_WIDTH_PX', 'let trackMode'),
    'globalThis.calculatePlayerScaleForTest = calculatePlayerScale;'
  ].join('\n');
  vm.runInContext(source, context);
  return context.calculatePlayerScaleForTest;
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

test('default Google path retains auto-translation and lookahead gates', () => {
  assert.match(contentSource, /trackMode === TRACK_MODE\.YOUTUBE_AUTO_TRANSLATE/);
  assert.match(contentSource, /currentSettings\.aiEnabled \? batchSize : INITIAL_TRANSLATION_LOOKAHEAD/);
});

test('wrapper scaling uses the baseline width and clamps both boundaries', () => {
  const calculatePlayerScale = loadPlayerScaleCalculator();
  assert.equal(calculatePlayerScale(0), 0.75);
  assert.equal(calculatePlayerScale(-100), 0.75);
  assert.equal(calculatePlayerScale(Number.NaN), 0.75);
  assert.equal(calculatePlayerScale(850), 1);
  assert.equal(calculatePlayerScale(3400), 1.4);
});

test('wrapper scaling grows monotonically between its boundaries', () => {
  const calculatePlayerScale = loadPlayerScaleCalculator();
  const widths = [200, 425, 850, 1200, 1600];
  const scales = widths.map(calculatePlayerScale);
  for (let index = 1; index < scales.length; index += 1) {
    assert.ok(scales[index] >= scales[index - 1]);
  }
  assert.ok(scales.every((scale) => scale >= 0.75 && scale <= 1.4));
});

test('manual subtitle downloads use the same bounded fetch path with AI disabled', () => {
  assert.match(contentSource, /const CAPTION_FETCH_TIMEOUT_MS = 8000/);
  assert.doesNotMatch(contentSource, /if \(!currentSettings\.aiEnabled\) \{\s*const response = await fetch\(url\.toString\(\), \{ signal, credentials: 'include' \}\)/);
  assert.match(contentSource, /const timeoutId = setTimeout\(\(\) => timeoutController\.abort\(\), CAPTION_FETCH_TIMEOUT_MS\)/);
  assert.match(contentSource, /trackMode = terminalMode;[\s\S]*?hideLoadingMessage\(\);/);
});

test('AI enhancement keeps Google as the immediate translation provider', () => {
  assert.match(contentSource, /function requestTranslation[\s\S]*sendTranslationRequest\('translate', text, lang\)/);
  assert.match(contentSource, /function requestAiTranslation[\s\S]*sendTranslationRequest\('translate_ai', text, lang\)/);
  assert.match(contentSource, /startAiEnhancement\(currentText, generation\);[\s\S]*await requestTranslation\(currentText, targetLang\)/);
});

test('manual subtitle rendering waits for the standard translation before painting a cue', () => {
  const renderFileCueBody = contentSource.slice(
    contentSource.indexOf('function renderFileCue()'),
    contentSource.indexOf('function startFileRenderer()', contentSource.indexOf('function renderFileCue()'))
  );
  assert.match(renderFileCueBody, /if \(currentSettings\.aiEnabled\) \{[\s\S]*displayFileCue\(nextCueIndex, '', playbackTime, \{ keepPending: true \}\);[\s\S]*\}/);
  assert.doesNotMatch(
    renderFileCueBody,
    /displayFileCue\(nextCueIndex, '', playbackTime, \{ keepPending: true \}\);\s*\n\s*ensureCueTranslation/
  );
});

test('AI results can replace standard translations without late Google overwrite', () => {
  assert.match(contentSource, /function applyAiTranslation[\s\S]*translationSources\.set\(sourceText, 'gemini'\)/);
  assert.match(contentSource, /if \(translationSources\.get\(sourceText\) !== 'gemini'\)[\s\S]*translationSources\.set\(sourceText, result\.source \|\| 'standard'\)/);
});

test('AI requests are deduplicated and batch-preload is capped', () => {
  assert.match(contentSource, /const attemptedAiTranslations = new Set\(\)/);
  assert.match(contentSource, /if \(attemptedAiTranslations\.has\(requestKey\)\) return null/);
  assert.match(contentSource, /const AI_TRANSLATION_BATCH_SIZE = 48/);
});

test('AI indicator uses explicit preparing and ready states', () => {
  assert.match(contentSource, /chrome\.runtime\.getURL\('ai\.svg'\)/);
  assert.match(contentSource, /chrome\.runtime\.getURL\('ai_loading\.svg'\)/);
  assert.match(contentSource, /data-ai-state/);
  assert.match(contentSource, /translationSource === 'gemini' \? 'ready' : 'preparing'/);
  assert.match(styleSource, /\.lasdoscas-ai-indicator img[\s\S]*width: 32px !important;[\s\S]*height: 32px !important;/);
  assert.match(styleSource, /\[data-ai-state="preparing"\] \.lasdoscas-ai-loading-icon \{\s*display: block !important;\s*\}/);
  assert.match(styleSource, /\[data-ai-state="ready"\] \.lasdoscas-ai-ready-icon[\s\S]*display: block !important;/);
  assert.doesNotMatch(styleSource, /lasdoscas-ai-(?:preparing|halo)/);
  assert.doesNotMatch(styleSource, /\.lasdoscas-ai-indicator::after/);
  assert.match(styleSource, /\.lasdoscas-ai-indicator img \{[\s\S]*opacity: 1;[\s\S]*transform: scale\(1\);/);
  assert.match(styleSource, /overflow: visible !important;[\s\S]*z-index: 2147483647 !important/);
});

test('AI settings content is grouped with spacing and theme-green background', () => {
  assert.match(popupSource, /<div class="ai-settings-content">[\s\S]*id="aiProvider"[\s\S]*id="aiStatus"[\s\S]*<\/div>\s*<\/details>/);
  assert.match(popupSource, /\.ai-settings-content[\s\S]*background: rgba\(99, 230, 190, 0\.\d+\)/);
  assert.match(popupSource, /\.ai-settings-content[\s\S]*border-radius: 8px/);
  assert.match(popupSource, /\.ai-settings-content[\s\S]*line-height: 1\.5/);
  assert.match(popupSource, /#aiApiKey::placeholder \{ font-size: 11px; \}/);
  assert.match(popupSource, /\.ai-key-action, \.ai-secondary-action[\s\S]*height: 28px;[\s\S]*min-height: 28px/);
  assert.match(popupSource, /body\.dark-theme \.ai-settings-content \.ai-check-row \{ color: #eafff8; \}/);
});
