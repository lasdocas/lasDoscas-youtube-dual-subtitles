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
const popupScriptSource = fs.readFileSync(
  path.resolve(__dirname, '..', 'popup.js'),
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

function loadLiveAsrIndicatorHarness() {
  const label = { textContent: '' };
  const tooltip = { textContent: '' };
  const indicatorAttributes = new Map();
  const wrapperAttributes = new Map();
  const indicator = {
    querySelector(selector) {
      if (selector === '.lasdoscas-live-asr-label') return label;
      if (selector === '.lasdoscas-live-asr-tooltip') return tooltip;
      return null;
    },
    setAttribute(name, value) {
      indicatorAttributes.set(name, value);
    }
  };
  const wrapper = {
    querySelector(selector) {
      return selector === '.lasdoscas-live-asr-indicator' ? indicator : null;
    },
    setAttribute(name, value) {
      wrapperAttributes.set(name, value);
    }
  };
  const timers = [];
  const context = {
    currentSettings: { uiLang: 'zh' },
    liveAsrUiText: {
      zh: { label: '实时识别', notice: '中文说明' },
      en: { label: 'Live transcription', notice: 'English notice' },
      es: { label: 'Transcripción en vivo', notice: 'Aviso en español' }
    },
    document: { querySelector: () => wrapper },
    window: { location: { href: 'https://www.youtube.com/watch?v=video-a' } },
    currentVideoId: 'video-a',
    setTimeout(callback, delay) {
      const timer = { callback, delay, cleared: false };
      timers.push(timer);
      return timer;
    },
    clearTimeout(timer) {
      if (timer) timer.cleared = true;
    }
  };
  vm.createContext(context);
  vm.runInContext([
    'const LIVE_ASR_NOTICE_DURATION_MS = 5000;',
    'let liveAsrConfirmed = false;',
    'let liveAsrNoticeOpen = false;',
    'let liveAsrNoticeTimer = null;',
    'const shownLiveAsrNoticeVideos = new Set();',
    'function getCurrentVideoId() { return currentVideoId; }',
    extractBetween('function getLiveAsrUiText()', 'function dieQuietly()'),
    'globalThis.liveAsrHarness = {',
    '  confirm: confirmLiveAsrFallback,',
    '  reset: () => setLiveAsrConfirmed(false),',
    '  update: updateLiveAsrIndicator,',
    '  setVideo: (videoId) => { currentVideoId = videoId; },',
    '  state: () => ({ confirmed: liveAsrConfirmed, open: liveAsrNoticeOpen, shown: shownLiveAsrNoticeVideos.size })',
    '};'
  ].join('\n'), context);
  return {
    ...context.liveAsrHarness,
    context,
    indicatorAttributes,
    wrapperAttributes,
    label,
    tooltip,
    timers
  };
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

test('long downloaded cues are divided into readable screen-sized parts', () => {
  const { buildBilingualDisplayParts } = loadCaptionAlgorithms();
  const source = Array.from(
    { length: 36 },
    (_, index) => `word${String(index).padStart(2, '0')}`
  ).join(' ');
  const parts = buildBilingualDisplayParts(source, '', 12);

  assert.equal(parts.length, 3);
  assert.ok(parts.every((part) => part.source.length <= 84));
  assert.equal(parts.map((part) => part.source).join(' '), source);
});

test('uneven sentence boundaries cannot create an oversized display part', () => {
  const { buildBilingualDisplayParts } = loadCaptionAlgorithms();
  const source = `Short. Tiny. Brief. ${'extended '.repeat(32).trim()}.`;
  const parts = buildBilingualDisplayParts(source, '', 12);

  assert.equal(parts.length, 4);
  assert.ok(parts.every((part) => part.source.length <= 84));
  assert.equal(parts.map((part) => part.source).join(' '), source);
});

test('compact-language cues use a shorter per-screen target', () => {
  const { context, buildBilingualDisplayParts } = loadCaptionAlgorithms();
  context.currentSourceLang = 'zh-CN';
  const source = '\u8fd9\u662f\u4e00\u6bb5\u7528\u6765\u9a8c\u8bc1\u81ea\u52a8\u751f\u6210\u5b57\u5e55\u5206\u5c4f\u957f\u5ea6\u7684\u7a33\u5b9a\u6d4b\u8bd5\u6587\u672c'.repeat(3);
  const parts = buildBilingualDisplayParts(source, '', 12);

  assert.equal(parts.length, 3);
  assert.ok(parts.every((part) => part.source.length <= 32));
  assert.equal(parts.map((part) => part.source).join(''), source);
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

test('live ASR preserves cumulative snapshots so left-aligned text grows to the right', () => {
  const { context } = loadCaptionAlgorithms();
  const timers = [];
  context.setTimeout = (callback, delay) => {
    const timer = { callback, delay, cleared: false };
    timers.push(timer);
    return timer;
  };
  context.clearTimeout = (timer) => {
    if (timer) timer.cleared = true;
  };
  context.currentSettings.showTrans = false;
  context.currentSettings.aiFallback = true;
  context.commits = [];
  vm.runInContext([
    'const LIVE_ASR_PREFETCH_MS = 120;',
    'const LIVE_ASR_COMMIT_STABILITY_MS = 260;',
    'let liveAsrPrefetchTimer = null;',
    'let liveAsrCommitTimer = null;',
    'let liveAsrClearTimer = null;',
    "let liveAsrPendingText = '';",
    "let liveAsrCommittedText = '';",
    'let liveAsrRenderSequence = 0;',
    'let trackLoadGeneration = 1;',
    'function ensureCueTranslation() { return Promise.resolve(""); }',
    'function translateLiveAsrSentence(text) { globalThis.commits.push(text); }',
    extractBetween('function commitLiveAsrSentence', 'function scheduleLiveAsrClear'),
    'globalThis.liveHarness = { feed: feedLiveAsrSnapshot };'
  ].join('\n'), context);

  const runLatestStableTimer = () => {
    const timer = [...timers].reverse().find((entry) => entry.delay === 260 && !entry.cleared);
    assert.ok(timer);
    timer.cleared = true;
    timer.callback();
  };

  context.liveHarness.feed('one');
  context.liveHarness.feed('one two');
  runLatestStableTimer();
  context.liveHarness.feed('one two three');
  runLatestStableTimer();

  assert.deepEqual(Array.from(context.commits), ['one two', 'one two three']);
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
  assert.match(contentSource, /const batchSize = STANDARD_TRANSLATION_BATCH_SIZE/);
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

test('rolling ASR lane stays near the picture center and widens on small players', () => {
  const context = {};
  vm.createContext(context);
  vm.runInContext([
    "const TRACK_MODE = { LIVE_ASR: 'LIVE_ASR', FILE_READY: 'FILE_READY', FILE_WARMING: 'FILE_WARMING' };",
    "let trackMode = 'FILE_WARMING';",
    'let isAutoGenerated = false;',
    extractBetween('function usesRollingAsrFlow', 'function updateWrapperDimensions'),
    'globalThis.rollingLayout = {',
    '  lane: getRollingCaptionLane,',
    '  usesRolling: usesRollingAsrFlow,',
    '  setState: (mode, autoGenerated) => { trackMode = mode; isAutoGenerated = autoGenerated; }',
    '};'
  ].join('\n'), context);

  assert.deepEqual({ ...context.rollingLayout.lane(1200) }, { start: '25%', end: '4%' });
  assert.deepEqual({ ...context.rollingLayout.lane(700) }, { start: '18%', end: '4%' });
  assert.deepEqual({ ...context.rollingLayout.lane(500) }, { start: '12%', end: '3%' });

  assert.equal(context.rollingLayout.usesRolling(), false);
  context.rollingLayout.setState('LIVE_ASR', false);
  assert.equal(context.rollingLayout.usesRolling(), true);
  context.rollingLayout.setState('FILE_WARMING', true);
  assert.equal(context.rollingLayout.usesRolling(), true);
  context.rollingLayout.setState('FILE_READY', true);
  assert.equal(context.rollingLayout.usesRolling(), false);
});

test('rolling ASR alignment is isolated from stable file subtitles', () => {
  assert.match(
    contentSource,
    /setAttribute\('data-caption-flow', usesRollingAsrFlow\(\) \? 'rolling' : 'stable'\)/
  );
  assert.match(
    styleSource,
    /\[data-caption-flow="rolling"\][\s\S]*width: auto[\s\S]*max-width: none[\s\S]*align-self: stretch/
  );
  assert.match(
    styleSource,
    /\[data-caption-flow="rolling"\]\[dir="ltr"\][\s\S]*--rolling-caption-start, 25%[\s\S]*--rolling-caption-end, 4%[\s\S]*text-align: left/
  );
  assert.match(
    styleSource,
    /\[data-caption-flow="rolling"\]\[dir="rtl"\][\s\S]*text-align: right/
  );
  assert.doesNotMatch(
    styleSource.slice(0, styleSource.indexOf('[data-caption-flow="rolling"]')),
    /text-align: left !important/
  );
});

test('confirmed live ASR fallback opens one explanation per video and keeps its status', () => {
  const harness = loadLiveAsrIndicatorHarness();
  harness.confirm();

  assert.deepEqual({ ...harness.state() }, { confirmed: true, open: true, shown: 1 });
  assert.equal(harness.wrapperAttributes.get('data-live-asr-confirmed'), 'true');
  assert.equal(harness.wrapperAttributes.get('data-live-asr-notice-open'), 'true');
  assert.equal(harness.indicatorAttributes.get('tabindex'), '0');
  assert.equal(harness.indicatorAttributes.get('aria-hidden'), 'false');
  assert.equal(harness.label.textContent, '实时识别');
  assert.equal(harness.timers[0].delay, 5000);

  harness.timers[0].callback();
  assert.deepEqual({ ...harness.state() }, { confirmed: true, open: false, shown: 1 });
  assert.equal(harness.wrapperAttributes.get('data-live-asr-confirmed'), 'true');

  harness.reset();
  harness.confirm();
  assert.deepEqual({ ...harness.state() }, { confirmed: true, open: false, shown: 1 });
  assert.equal(harness.timers.length, 1);

  harness.reset();
  harness.setVideo('video-b');
  harness.confirm();
  assert.deepEqual({ ...harness.state() }, { confirmed: true, open: true, shown: 2 });
  assert.equal(harness.timers.length, 2);
});

test('live ASR indicator updates its UI language and hides from keyboard when reset', () => {
  const harness = loadLiveAsrIndicatorHarness();
  harness.confirm();
  harness.context.currentSettings.uiLang = 'es-MX';
  harness.update();
  assert.equal(harness.label.textContent, 'Transcripción en vivo');
  assert.equal(harness.tooltip.textContent, 'Aviso en español');

  harness.reset();
  assert.equal(harness.wrapperAttributes.get('data-live-asr-confirmed'), 'false');
  assert.equal(harness.wrapperAttributes.get('data-live-asr-notice-open'), 'false');
  assert.equal(harness.indicatorAttributes.get('tabindex'), '-1');
  assert.equal(harness.indicatorAttributes.get('aria-hidden'), 'true');
});

test('live ASR warning is confirmed only after terminal retry exhaustion', () => {
  const retryBody = extractBetween('function scheduleTrackRetry', 'async function downloadCaptionJson3');
  assert.match(
    retryBody,
    /if \(attempt >= TRACK_RETRY_DELAYS_MS\.length\)[\s\S]*terminalMode === TRACK_MODE\.LIVE_ASR\)[\s\S]*confirmLiveAsrFallback\(\)/
  );
  assert.match(retryBody, /trackRetryTimer = setTimeout\(\(\) => preloadFullTrack\(generation, attempt \+ 1\), delay\)/);
  assert.doesNotMatch(
    contentSource.slice(contentSource.indexOf('} catch (error) {'), contentSource.indexOf('setTimeout(() => {', contentSource.indexOf('} catch (error) {'))),
    /confirmLiveAsrFallback\(\)/
  );
  assert.match(contentSource, /trackMode = TRACK_MODE\.FILE_READY;\s*setLiveAsrConfirmed\(false\)/);
  assert.match(extractBetween('function beginTrackLoad', 'function showYouTubeAutoTranslateWarning'), /setLiveAsrConfirmed\(false\)/);
  assert.match(contentSource, /snapshot\?\.isAutoTranslated\)[\s\S]{0,100}setLiveAsrConfirmed\(false\)/);
});

test('live ASR status is accessible, independent, and hidden until confirmed', () => {
  const containerBody = extractBetween('function ensureSubtitleContainer()', 'function executeLayoutRefresh()');
  assert.match(containerBody, /lasdoscas-live-asr-indicator" role="status" tabindex="-1"/);
  assert.match(containerBody, /aria-describedby="lasdoscas-live-asr-tooltip"/);
  assert.match(containerBody, /lasdoscas-live-asr-tooltip" role="tooltip"/);
  assert.match(styleSource, /\.lasdoscas-live-asr-indicator \{[\s\S]*display: none !important/);
  assert.match(styleSource, /data-live-asr-confirmed="true"\][\s\S]*display: inline-flex !important/);
  assert.match(styleSource, /\.lasdoscas-live-asr-indicator:focus-visible[\s\S]*box-shadow/);
  assert.match(styleSource, /data-live-asr-notice-open="true"\][\s\S]*opacity: 1 !important/);
  assert.match(styleSource, /bottom: calc\(100% \+ 6px\) !important/);
  assert.doesNotMatch(containerBody, /lasdoscas-ai-indicator[\s\S]*lasdoscas-live-asr-label[\s\S]*lasdoscas-ai-tooltip/);

  const visibilityBody = extractBetween('function updateWrapperVisibility()', 'function ensureSubtitleContainer()');
  assert.match(visibilityBody, /const isEmpty = !lastText && !lastMatchedSource && !liveAsrConfirmed/);
  assert.match(visibilityBody, /!currentSettings\.showTrans &&\s*!liveAsrConfirmed/);
});

test('manual subtitle downloads use the same bounded fetch path with AI disabled', () => {
  assert.match(contentSource, /const CAPTION_FETCH_TIMEOUT_MS = 8000/);
  assert.doesNotMatch(contentSource, /if \(!currentSettings\.aiEnabled\) \{\s*const response = await fetch\(url\.toString\(\), \{ signal, credentials: 'include' \}\)/);
  assert.match(contentSource, /const timeoutId = setTimeout\(\(\) => timeoutController\.abort\(\), CAPTION_FETCH_TIMEOUT_MS\)/);
  assert.match(contentSource, /trackMode = terminalMode;[\s\S]*?hideLoadingMessage\(\);/);
});

test('AI enhancement keeps standard translation immediate while AI is batch-only', () => {
  assert.match(contentSource, /function requestTranslation[\s\S]*sendTranslationRequest\('translate', text, lang\)/);
  assert.match(contentSource, /function requestAiTranslation[\s\S]*requestKind: allowShortBatch \? 'subtitle_visible' : 'subtitle'/);
  assert.match(contentSource, /const aiRequest = allowAiEnhancement[\s\S]*if \(aiRequest && !currentSettings\.aiFallback\) return;[\s\S]*await requestTranslation\(currentText, targetLang\)/);
  assert.match(contentSource, /function warmInitialFileTranslations[\s\S]*translateBatch\(texts, generation, \{ enableAi: false \}\)/);
});

test('file subtitles get a bounded grace period for bilingual first paint', () => {
  const renderFileCueBody = contentSource.slice(
    contentSource.indexOf('function renderFileCue()'),
    contentSource.indexOf('function startFileRenderer()', contentSource.indexOf('function renderFileCue()'))
  );
  assert.match(contentSource, /const FILE_CUE_TRANSLATION_GRACE_MS = 240/);
  assert.match(
    renderFileCueBody,
    /const translationRequest = ensureCueTranslation\(cue\.text, trackLoadGeneration, \{ skipAi: true \}\)/
  );
  assert.match(renderFileCueBody, /fileCueTranslationGraceTimer = setTimeout\([\s\S]*FILE_CUE_TRANSLATION_GRACE_MS/);
  assert.match(renderFileCueBody, /const readyTranslation = preloadedTranslations\.get\(cue\.text\)[\s\S]*displayFileCue\(nextCueIndex, readyTranslation/);
  assert.match(renderFileCueBody, /displayFileCue\(nextCueIndex, '', getPlayerVideoElement\(\)\?\.currentTime, \{ keepPending: true \}\)/);
});

test('successful track loading keeps the startup banner until a cue renders', () => {
  const readyBody = contentSource.slice(
    contentSource.indexOf('trackMode = TRACK_MODE.FILE_READY;'),
    contentSource.indexOf('startFileRenderer()', contentSource.indexOf('trackMode = TRACK_MODE.FILE_READY;'))
  );
  assert.doesNotMatch(readyBody, /hideLoadingMessage\(\)/);
  const displayBody = extractBetween('function displayFileCue', 'function shouldRefreshVisibleFileAiLookahead');
  assert.match(displayBody, /hideLoadingMessage\(\);[\s\S]*updateSubtitleContent\(/);
  const hideLoadingBody = extractBetween('function hideLoadingMessage()', 'function getLayoutMode()');
  assert.match(hideLoadingBody, /loadingMessageVisible = false;/);
  assert.match(hideLoadingBody, /clearSubtitleContent\(\);/);
  assert.match(contentSource, /!loadingMessageVisible && isEmpty/);
});

test('persistent track warnings survive generic subtitle clearing', () => {
  const clearBody = extractBetween(
    'function clearSubtitleContent()',
    'function startContainerMonitor()'
  );
  const statusBody = extractBetween(
    'function getPersistentTrackStatusMessage()',
    'function getAutoGeneratedHintHtml()'
  );
  assert.match(clearBody, /getPersistentTrackStatusMessage\(\)/);
  assert.match(clearBody, /getSecondSubtitleStatusHtml\(statusMessage\)/);
  assert.match(statusBody, /TRACK_MODE\.YOUTUBE_AUTO_TRANSLATE/);
  assert.match(statusBody, /getAutoTranslateSelectionMessage\(\)/);
  assert.match(statusBody, /TRACK_MODE\.WAITING_FOR_YOUTUBE_CAPTIONS/);
});

test('YouTube auto-translate warning retries until its subtitle container exists', () => {
  const warningBody = extractBetween(
    'function showYouTubeAutoTranslateWarning()',
    'function scheduleTrackRetry'
  );
  assert.match(warningBody, /const wrapper = ensureSubtitleContainer\(\)/);
  assert.match(warningBody, /if \(!wrapper\)[\s\S]*setTimeout/);
  assert.match(warningBody, /trackMode === TRACK_MODE\.YOUTUBE_AUTO_TRANSLATE/);
  assert.match(warningBody, /showYouTubeAutoTranslateWarning\(\)/);
});

test('an unresolved rendered YouTube track falls back to the selection warning instead of blank UI', () => {
  const retryBody = extractBetween(
    'function scheduleTrackRetry',
    'async function downloadCaptionJson3'
  );
  const preloadBody = extractBetween(
    'async function preloadFullTrack',
    'setTimeout(() => {'
  );
  assert.match(
    retryBody,
    /terminalMode === TRACK_MODE\.YOUTUBE_AUTO_TRANSLATE[\s\S]*showYouTubeAutoTranslateWarning\(\)/
  );
  assert.match(
    preloadBody,
    /hasNativeCaptionDom[\s\S]*TRACK_MODE\.YOUTUBE_AUTO_TRANSLATE[\s\S]*TRACK_MODE\.NO_CAPTIONS/
  );
});

test('YouTube auto-translate warning follows live UI language changes', () => {
  const messageBody = extractBetween(
    'function getAutoTranslateSelectionMessage',
    'function getLiveAsrUiText'
  );
  const storageBody = extractBetween(
    'chrome.storage.onChanged.addListener',
    '} catch (e) {'
  );
  assert.match(messageBody, /currentSettings\.uiLang/);
  assert.doesNotMatch(messageBody, /currentSettings\.lang/);
  assert.match(
    storageBody,
    /changedKeys\.includes\('uiLang'\)[\s\S]*trackMode === TRACK_MODE\.YOUTUBE_AUTO_TRANSLATE[\s\S]*showYouTubeAutoTranslateWarning\(\)/
  );
});

test('loading and YouTube CC status messages follow live UI language changes', () => {
  const loadingMessageBody = extractBetween(
    'function getLoadingMessage()',
    'function getYouTubeCaptionsDisabledMessage()'
  );
  const captionsDisabledMessageBody = extractBetween(
    'function getYouTubeCaptionsDisabledMessage()',
    'function isSpaceDelimitedLang'
  );
  const storageBody = extractBetween(
    'chrome.storage.onChanged.addListener',
    '} catch (e) {'
  );

  assert.match(loadingMessageBody, /currentSettings\.uiLang/);
  assert.doesNotMatch(loadingMessageBody, /currentSettings\.lang/);
  assert.match(captionsDisabledMessageBody, /currentSettings\.uiLang/);
  assert.doesNotMatch(captionsDisabledMessageBody, /currentSettings\.lang/);
  assert.match(
    storageBody,
    /changedKeys\.includes\('uiLang'\)[\s\S]*loadingMessageVisible[\s\S]*showLoadingMessage\(\)/
  );
  assert.match(
    storageBody,
    /TRACK_MODE\.WAITING_FOR_YOUTUBE_CAPTIONS[\s\S]*clearSubtitleContent\(\)[\s\S]*applyStylesToDOM\(\)/
  );
});

test('disabling or orphaning the plugin restores YouTube native caption rendering', () => {
  const syncBody = extractBetween(
    'function syncPluginState()',
    'function showLoadingMessage()'
  );
  const orphanBody = extractBetween(
    'function dieQuietly()',
    'function checkContext()'
  );
  assert.match(
    syncBody,
    /if \(shouldRun\) document\.body\.setAttribute\('data-yt-dual-sub-active', 'true'\)/
  );
  assert.match(syncBody, /else document\.body\.removeAttribute\('data-yt-dual-sub-active'\)/);
  assert.match(syncBody, /if \(wrapper\) wrapper\.remove\(\)/);
  assert.match(orphanBody, /removeAttribute\('data-yt-dual-sub-active'\)/);
  assert.match(orphanBody, /custom-subtitle-wrapper[\s\S]*remove\(\)/);
});

test('default and theater layouts keep an idle background while the plugin is active', () => {
  const visibilityBody = extractBetween(
    'function updateWrapperVisibility()',
    'function ensureSubtitleContainer()'
  );
  assert.match(visibilityBody, /const keepIdleBackground = !isFullscreen/);
  assert.match(visibilityBody, /currentSettings\.enabled/);
  assert.match(visibilityBody, /isCCAvailable/);
  assert.match(visibilityBody, /isYouTubeWatchPage\(\)/);
  assert.match(visibilityBody, /if \(!keepIdleBackground && \(/);
});

test('AI indicator persists its last state between cues outside fullscreen', () => {
  assert.match(
    contentSource,
    /function getIdleAiDisplayState\(wrapper\)[\s\S]*data-layout-mode'[\s\S]*fullscreen'[\s\S]*'standby'/
  );
  const containerBody = extractBetween(
    'function ensureSubtitleContainer()',
    'function executeLayoutRefresh()'
  );
  assert.match(containerBody, /setWrapperAiDisplayState\([\s\S]*getIdleAiDisplayState\(wrapper\) \|\| 'standby'/);
  const clearBody = extractBetween(
    'function clearSubtitleContent()',
    'function startContainerMonitor()'
  );
  assert.match(clearBody, /const idleAiState = getIdleAiDisplayState\(wrapper\)/);
  assert.match(clearBody, /const retainedAiState = lastAiIndicatorSource[\s\S]*translationSources\.get\(lastAiIndicatorSource\)/);
  assert.match(clearBody, /setWrapperAiDisplayState\(wrapper, retainedAiState \|\| idleAiState\)/);
  assert.match(contentSource, /let lastAiIndicatorSource = ""/);
  assert.match(contentSource, /sourceText !== lastText && sourceText !== lastAiIndicatorSource/);
  assert.match(contentSource, /function applyAiTranslation[\s\S]*else \{\s*setAiTranslationState\(sourceText, 'enhanced'\)/);
});

test('already enhanced cues never re-enter AI processing', () => {
  const startBody = extractBetween(
    'function startAiEnhancement',
    'async function ensureCueTranslation'
  );
  assert.match(startBody, /if \(isAiTranslationSource\(translationSources\.get\(sourceText\)\)\) return null;/);
});

test('AI results can replace standard translations without late Google overwrite', () => {
  assert.match(contentSource, /function isAiTranslationSource[\s\S]*'groq'[\s\S]*'openrouter'/);
  assert.match(contentSource, /function applyAiTranslation[\s\S]*translationSources\.set\(sourceText, result\.source\)/);
  assert.match(contentSource, /if \(!isAiTranslationSource\(translationSources\.get\(sourceText\)\)\)[\s\S]*translationSources\.set\(sourceText, result\.source \|\| 'standard'\)/);
});

test('AI requests are deduplicated and batch-preload is capped', () => {
  assert.match(contentSource, /const settledAiTranslations = new Set\(\)/);
  assert.match(contentSource, /const queuedAiTranslations = new Set\(\)/);
  assert.match(contentSource, /function getAiRequestKey\(sourceText, generation/);
  assert.match(contentSource, /settledAiTranslations\.has\(requestKey\)/);
  assert.match(contentSource, /pendingVisibleAiJob\?\.requestKey === requestKey/);
  assert.match(contentSource, /const STANDARD_TRANSLATION_BATCH_SIZE = 16/);
  assert.match(contentSource, /const AUTO_TRANSLATION_WINDOW_MAX_CUES = 48/);
  assert.match(contentSource, /const AI_TRANSLATION_BATCH_CUE_LIMIT = 48/);
  assert.match(contentSource, /const AI_TRANSLATION_VISIBLE_BATCH_CUE_LIMIT = 4/);
  assert.match(contentSource, /const AUTO_FILE_WARMUP_TIMEOUT_MS = 800/);
  assert.match(contentSource, /const AI_TRANSLATION_MIN_BATCH_CUES = 2/);
  assert.match(contentSource, /const AI_TRANSLATION_FORCE_BATCH_CUES = 24/);
  assert.match(contentSource, /const AI_TRANSLATION_MIN_BATCH_TEXT_WEIGHT = 240/);
  assert.match(contentSource, /const AI_TRANSLATION_MAX_CHARS = 4500/);
  assert.match(contentSource, /const AI_TRANSLATION_CONTEXT_CUE_LIMIT = 3/);
  assert.match(contentSource, /const AI_BATCH_RETRY_CUE_LIMIT = 8/);
  assert.match(contentSource, /const AI_TRANSLATION_RETRY_COOLDOWN_MS = 30 \* 1000/);
  assert.match(contentSource, /const AI_BATCH_PAYLOAD_PREFIX = 'LASDOSCAS_BATCH_V2\\n'/);
  assert.match(contentSource, /let activeAiPrefetchJob = null/);
  assert.match(contentSource, /let pendingAiPrefetchJob = null/);
  assert.match(contentSource, /let activeVisibleAiJob = null/);
  assert.match(contentSource, /let pendingVisibleAiJob = null/);
  assert.match(contentSource, /pendingAiPrefetchJob\.resolve\(\[\]\)/);
  assert.match(contentSource, /pendingVisibleAiJob\.resolve\(\{ text: '', source: '' \}\)/);
});

test('AI batches use compact ids and accept validated partial JSON results', () => {
  const context = { JSON, Map, Set };
  vm.createContext(context);
  vm.runInContext([
    "const AI_BATCH_PAYLOAD_PREFIX = 'LASDOSCAS_BATCH_V2\\n';",
    'const AI_TRANSLATION_CONTEXT_CUE_LIMIT = 3;',
    extractBetween('function buildAiBatchPayload', 'function getAppliedAiResult'),
    `globalThis.batchProtocol = { buildAiBatchPayload, parseAiBatchResponse };`
  ].join('\n'), context);

  const texts = ['First line', 'Second line', 'Third line'];
  const payload = context.batchProtocol.buildAiBatchPayload(texts, ['old', 'near']);
  assert.match(payload, /^LASDOSCAS_BATCH_V2\n/);
  const parsedPayload = JSON.parse(payload.slice('LASDOSCAS_BATCH_V2\n'.length));
  assert.deepEqual(Array.from(parsedPayload.c), ['old', 'near']);
  assert.deepEqual(Array.from(parsedPayload.i, (item) => Array.from(item)), [
    [0, 'First line'],
    [1, 'Second line'],
    [2, 'Third line']
  ]);

  const translations = context.batchProtocol.parseAiBatchResponse(
    '```json\n{"i":[[2,"第三"],[0,"第一"],[2,"重复"],[9,"越界"]]}\n```',
    texts
  );
  assert.deepEqual(Array.from(translations.entries()), [[2, '第三'], [0, '第一']]);
  assert.equal(translations.has(1), false);
});

test('two long authored cues are eligible while short two-cue requests stay blocked', () => {
  const context = {};
  vm.createContext(context);
  vm.runInContext([
    'const AI_TRANSLATION_MIN_BATCH_CUES = 2;',
    'const AI_TRANSLATION_FORCE_BATCH_CUES = 24;',
    'const AI_TRANSLATION_MIN_BATCH_TEXT_WEIGHT = 240;',
    extractBetween('function getAiBatchTextWeight', 'function parseAiBatchResponse'),
    'globalThis.isLargeEnough = isAiBatchLargeEnough;'
  ].join('\n'), context);

  assert.equal(context.isLargeEnough(['short one', 'short two']), false);
  assert.equal(
    context.isLargeEnough([
      `first authored cue ${'x'.repeat(105)}`,
      `second authored cue ${'y'.repeat(105)}`
    ]),
    true
  );
  assert.equal(
    context.isLargeEnough(Array.from({ length: 24 }, (_, index) => `x${index}`)),
    true
  );
});

test('downloaded subtitle files race translated-track mapping against standard warmup', () => {
  const loadBody = extractBetween(
    'async function preloadFullTrack',
    'setTimeout(() => {'
  );
  const cacheLoadIndex = loadBody.indexOf('await loadSubtitleTranslationCache()');
  const generationGuardIndex = loadBody.indexOf(
    'if (generation !== trackLoadGeneration) return;',
    cacheLoadIndex
  );
  const aiWarmupIndex = loadBody.indexOf(
    'void startInitialFileAiWarmup(generation)',
    generationGuardIndex
  );
  const standardWarmupIndex = loadBody.indexOf(
    'const standardTranslationWarmup =',
    aiWarmupIndex
  );
  const youtubeWarmupIndex = loadBody.indexOf(
    'waitForTranslationWarmup(youtubeTranslationPromise)',
    standardWarmupIndex
  );
  const firstReadyRaceIndex = loadBody.indexOf('await Promise.race([', youtubeWarmupIndex);
  const rendererIndex = loadBody.indexOf('startFileRenderer()', firstReadyRaceIndex);

  assert.ok(cacheLoadIndex >= 0);
  assert.ok(generationGuardIndex > cacheLoadIndex);
  assert.ok(aiWarmupIndex > generationGuardIndex);
  assert.ok(standardWarmupIndex > aiWarmupIndex);
  assert.ok(youtubeWarmupIndex > standardWarmupIndex);
  assert.ok(firstReadyRaceIndex > youtubeWarmupIndex);
  assert.ok(rendererIndex > firstReadyRaceIndex);
  assert.match(
    loadBody,
    /youtubeTranslationWarmup\.then\(\(mappedInitialCue\) =>\s*mappedInitialCue \? undefined : standardTranslationWarmup/
  );
  assert.equal(
    (loadBody.match(/startInitialFileAiWarmup\(generation\)/g) || []).length,
    1
  );
  assert.doesNotMatch(loadBody, /trackMode = TRACK_MODE\.FILE_READY;[\s\S]*startInitialFileAiWarmup/);
});

test('initial file AI warmup starts small for authored and auto-generated tracks', async () => {
  const context = { calls: [] };
  vm.createContext(context);
  vm.runInContext([
    'const AI_TRANSLATION_BATCH_CUE_LIMIT = 3;',
    'const AI_TRANSLATION_VISIBLE_BATCH_CUE_LIMIT = 2;',
    'let isAutoGenerated = false;',
    'let trackLoadGeneration = 7;',
    'const currentSettings = { enabled: true, aiEnabled: true, showTrans: true };',
    "const preloadedSentencesList = ['a', 'b', 'c', 'd', 'e'].map((text) => ({ text }));",
    'function getPlayerVideoElement() { return { currentTime: 12 }; }',
    'function findNextCueIndexAtTime(playhead) { globalThis.playhead = playhead; return 2; }',
    'function startAiBatchEnhancement(texts, generation, options) {',
    '  const result = { texts: [...texts], generation, options };',
    '  globalThis.calls.push(result);',
    '  return result;',
    '}',
    extractBetween(
      'function getPriorityFileTranslationTexts',
      'async function preloadTranslations'
    ),
    'globalThis.warm = startInitialFileAiWarmup;',
    'globalThis.setAutoGenerated = (value) => { isAutoGenerated = value; };'
  ].join('\n'), context);

  const result = context.warm(7);
  assert.equal(context.playhead, 12);
  assert.deepEqual(Array.from(result.texts), ['c', 'd']);
  assert.equal(result.generation, 7);
  assert.equal(context.calls.length, 1);
  assert.deepEqual({ ...result.options }, {
    priority: 'visible',
    allowShortBatch: true,
    preservePending: false
  });

  await new Promise(setImmediate);
  assert.equal(context.calls.length, 2);
  assert.deepEqual(Array.from(context.calls[1].texts), ['e', 'a', 'b']);
  assert.deepEqual({ ...context.calls[1].options }, { priority: 'prefetch' });

  assert.equal(context.warm(6), null);
  context.setAutoGenerated(true);
  const autoResult = context.warm(7);
  assert.ok(autoResult);
  assert.equal(context.calls.length, 3);
  await new Promise(setImmediate);
  assert.equal(context.calls.length, 4);
});

test('authored tracks keep standard preloading after the early AI window', () => {
  const warmupBody = extractBetween(
    'function startInitialFileAiWarmup',
    'async function preloadTranslations'
  );
  const preloadBody = extractBetween(
    'async function preloadTranslations',
    'async function preloadFullTrack'
  );
  assert.match(
    warmupBody,
    /startResponsiveAiBatches\(priorityTexts, generation\)/
  );
  assert.doesNotMatch(warmupBody, /preloadedTranslations\.has/);
  assert.doesNotMatch(preloadBody, /startAiBatchEnhancement\(/);
  assert.match(preloadBody, /const missingStandardTranslations = initialCues\.filter/);
  assert.match(
    preloadBody,
    /const preloadStartIndex = currentSettings\.aiEnabled \? initialCues\.length : 0/
  );
  assert.match(preloadBody, /await translateBatch\(batch, generation, \{\s*enableAi: false/);
  assert.doesNotMatch(preloadBody, /Remaining cues are translated on demand/);
});

test('queued AI work stays standby until a provider request starts', () => {
  const batchBody = extractBetween(
    'function runAiPrefetchJob',
    'async function fillAutoTranslationWindow'
  );
  const pendingStart = batchBody.indexOf('pendingAiPrefetchJob = job');
  const processingStart = batchBody.indexOf("setAiTranslationState(sourceText, 'processing')");
  assert.ok(processingStart >= 0);
  assert.ok(pendingStart > processingStart);
  assert.doesNotMatch(
    batchBody.slice(batchBody.lastIndexOf('function startAiBatchEnhancement'), pendingStart),
    /setAiTranslationState\(sourceText, 'processing'\)/
  );
});

test('realtime AI waits for a substantial batch instead of sending short requests', () => {
  const context = {
    Map,
    Set,
    Promise,
    JSON,
    setTimeout,
    clearTimeout
  };
  vm.createContext(context);
  vm.runInContext([
    'const AI_TRANSLATION_MAX_CHARS = 4500;',
    'const AI_TRANSLATION_BATCH_CUE_LIMIT = 48;',
    'const AI_TRANSLATION_MIN_BATCH_CUES = 2;',
    'const AI_TRANSLATION_FORCE_BATCH_CUES = 24;',
    'const AI_TRANSLATION_MIN_BATCH_TEXT_WEIGHT = 240;',
    'const AI_TRANSLATION_CONTEXT_CUE_LIMIT = 3;',
    'const AI_BATCH_RETRY_CUE_LIMIT = 8;',
    "const AI_BATCH_PAYLOAD_PREFIX = 'LASDOSCAS_BATCH_V2\\n';",
    'const TRACK_MODE = { FILE_WARMING: "FILE_WARMING", FILE_READY: "FILE_READY" };',
    'let trackMode = "LIVE_ASR";',
    'let trackLoadGeneration = 1;',
    'let isOrphaned = false;',
    'const currentSettings = { enabled: true, aiEnabled: true, showTrans: true, lang: "zh-CN" };',
    'const preloadedTranslations = new Map();',
    'const preloadedSentencesList = [];',
    'const translationSources = new Map();',
    'const settledAiTranslations = new Set();',
    'const queuedAiTranslations = new Set();',
    'const inflightAiTranslations = new Map();',
    'const pendingRealtimeAiTranslations = new Map();',
    'let activeAiPrefetchJob = null;',
    'let pendingAiPrefetchJob = null;',
    'let activeVisibleAiJob = null;',
    'let pendingVisibleAiJob = null;',
    'let aiIndicatorSessionState = "standby";',
    'const states = new Map();',
    'const requests = [];',
    'function getAiRequestKey(text, generation) { return `ai|${generation}|${text}`; }',
    'function getAiBatchContext() { return []; }',
    'function buildAiBatchPayload(texts) { return `batch:${texts.join("|")}`; }',
    'function parseAiBatchResponse() { return new Map(); }',
    'function getAppliedAiResult() { return null; }',
    'function isAiRetryCoolingDown() { return false; }',
    'function markAiRetryFailure() {}',
    'function isAiTranslationSource(source) { return source === "gemini"; }',
    'function setAiTranslationState(text, state) { states.set(text, state); }',
    'function setAiIndicatorSessionState(state) { if (aiIndicatorSessionState !== "enhanced") aiIndicatorSessionState = state; }',
    'function applyAiTranslation(text, result) { if (result?.source !== "gemini") return false; translationSources.set(text, result.source); return true; }',
    'function requestAiTranslation(text, lang, priority) { return new Promise((resolve) => requests.push({ text, priority, resolve })); }',
    extractBetween('function getAiBatchTextWeight', 'function parseAiBatchResponse'),
    extractBetween('function discardPendingAiPrefetch', 'async function ensureCueTranslation'),
    extractBetween('async function translateAiBatchItems', 'async function fillAutoTranslationWindow'),
    `globalThis.scheduler = {
      startAiEnhancement,
      startAiBatchEnhancement,
      states,
      requests,
      snapshot: () => ({
        activeVisible: activeVisibleAiJob?.sourceText || '',
        pendingVisible: pendingVisibleAiJob?.sourceText || '',
        activePrefetch: activeAiPrefetchJob?.texts || [],
        pendingPrefetch: pendingAiPrefetchJob?.texts || [],
        pendingPrefetchPriority: pendingAiPrefetchJob?.priority || '',
        realtimeCount: pendingRealtimeAiTranslations.size
      })
    };`
  ].join('\n'), context);

  const scheduler = context.scheduler;
  const rejectedSingleBatch = scheduler.startAiBatchEnhancement(['only-one'], 1);
  assert.equal(rejectedSingleBatch, null);
  assert.equal(scheduler.requests.length, 0);

  const realtimeTexts = Array.from(
    { length: 8 },
    (_, index) => `line-${index}-${'x'.repeat(23)}`
  );
  realtimeTexts.slice(0, 7).forEach((text) => scheduler.startAiEnhancement(text));
  assert.equal(scheduler.requests.length, 0);
  assert.equal(scheduler.snapshot().realtimeCount, 7);

  const batchRequest = scheduler.startAiEnhancement(realtimeTexts[7]);
  assert.equal(scheduler.requests.length, 1);
  assert.equal(scheduler.requests[0].priority, 'visible');
  assert.match(scheduler.requests[0].text, /^batch:/);
  assert.equal(scheduler.snapshot().activePrefetch.length, 8);
  assert.equal(scheduler.snapshot().realtimeCount, 0);
  assert.ok(batchRequest);
});

test('visible file cue leads a high-priority batch whenever prior lookahead missed it', () => {
  const visibleWindowBody = extractBetween(
    'function startVisibleFileAiWindow',
    'function renderFileCue()'
  );
  assert.match(visibleWindowBody, /const visibleNeedsBatch = Boolean/);
  assert.match(visibleWindowBody, /!isAiTranslationScheduled\(visibleText, generation\)/);
  assert.match(visibleWindowBody, /shouldRefreshVisibleFileAiLookahead\([\s\S]*visibleFileAiWindowAnchorCueIndex/);
  assert.match(visibleWindowBody, /if \(!visibleNeedsBatch && \(!shouldRefreshLookahead \|\| isAutoGenerated\)\) return null/);
  assert.match(visibleWindowBody, /for \(let index = cueIndex;/);
  assert.match(visibleWindowBody, /startResponsiveAiBatches\(texts, generation\)/);
  assert.doesNotMatch(visibleWindowBody, /startAiEnhancement\(visibleText/);
});

test('file cue misses use standard translation while AI remains batch-only', () => {
  const renderBody = extractBetween(
    'function renderFileCue()',
    'function startFileRenderer()'
  );
  const batchBody = extractBetween(
    'function startAiBatchEnhancement',
    'function isAiTranslationScheduled'
  );
  assert.match(
    renderBody,
    /ensureCueTranslation\(cue\.text, trackLoadGeneration, \{ skipAi: true \}\)/
  );
  assert.match(batchBody, /!isAiBatchLargeEnough\(texts, options\.allowShortBatch\)/);
  assert.match(batchBody, /return null/);
  assert.match(
    contentSource,
    /trackMode === TRACK_MODE\.FILE_WARMING \|\| trackMode === TRACK_MODE\.FILE_READY\) return null/
  );
});

test('a cue missed by a short prior window starts a new multi-cue batch', () => {
  const context = { batchCalls: [] };
  vm.createContext(context);
  vm.runInContext([
    'const AI_TRANSLATION_BATCH_CUE_LIMIT = 48;',
    'const AI_TRANSLATION_VISIBLE_BATCH_CUE_LIMIT = 4;',
    'const AI_TRANSLATION_LOOKAHEAD_SECONDS = 75;',
    'let trackLoadGeneration = 3;',
    'let visibleFileAiWindowAnchorCueIndex = 0;',
    'let isAutoGenerated = false;',
    'const currentSettings = { aiEnabled: true, showTrans: true };',
    'const preloadedSentencesList = Array.from({ length: 20 }, (_, index) => ({',
    '  text: `cue-${index}`,',
    '  start: index * 5',
    '}));',
    'const translationSources = new Map();',
    'const settledAiTranslations = new Set();',
    'const queuedAiTranslations = new Set();',
    'function getAiRequestKey(text, generation) { return `${generation}|${text}`; }',
    'function isAiTranslationSource() { return false; }',
    'function isAiTranslationScheduled(text) { return text === "cue-1"; }',
    'function isAiRetryCoolingDown() { return false; }',
    'function startResponsiveAiBatches(texts, generation) {',
    '  const result = { texts: [...texts], generation };',
    '  globalThis.batchCalls.push(result);',
    '  return result;',
    '}',
    extractBetween(
      'function shouldRefreshVisibleFileAiLookahead',
      'function renderFileCue()'
    ),
    'globalThis.startWindow = startVisibleFileAiWindow;'
  ].join('\n'), context);

  const result = context.startWindow(10, 3);
  assert.ok(result);
  assert.equal(context.batchCalls.length, 1);
  assert.equal(result.texts[0], 'cue-10');
  assert.ok(result.texts.length > 1);
});

test('DOM fallback does not send AI requests while track identity is unresolved', () => {
  const fallbackBody = extractBetween(
    'function renderDomTranslationFallback',
    'function bindMutationObserver'
  );
  assert.match(fallbackBody, /trackMode !== TRACK_MODE\.DISCOVERING/);
  assert.match(fallbackBody, /trackMode !== TRACK_MODE\.FILE_WARMING/);
  assert.match(fallbackBody, /if \(allowAiEnhancement\) startAiEnhancement/);
});

test('native caption DOM is not rendered before original-track identity is known', () => {
  const observerBody = extractBetween(
    'function bindMutationObserver',
    'function handlePlayerBridgeMessage'
  );
  assert.match(observerBody, /trackMode === TRACK_MODE\.YOUTUBE_AUTO_TRANSLATE\) return/);
  assert.match(
    observerBody,
    /trackMode === TRACK_MODE\.DISCOVERING \|\| trackMode === TRACK_MODE\.FILE_WARMING\) return/
  );
  assert.ok(
    observerBody.indexOf('TRACK_MODE.DISCOVERING') <
      observerBody.indexOf('renderDomTranslationFallback(currentText)')
  );
});

test('anchored AI lookahead does not degrade into one refill per cue', () => {
  const context = {};
  vm.createContext(context);
  vm.runInContext([
    'const AI_TRANSLATION_BATCH_CUE_LIMIT = 48;',
    extractBetween(
      'function shouldRefreshVisibleFileAiLookahead',
      'function startVisibleFileAiWindow'
    ),
    'globalThis.shouldRefresh = shouldRefreshVisibleFileAiLookahead;'
  ].join('\n'), context);

  let anchor = -1;
  const refreshedAt = [];
  for (let cueIndex = 0; cueIndex < 40; cueIndex += 1) {
    if (!context.shouldRefresh(cueIndex, anchor)) continue;
    refreshedAt.push(cueIndex);
    anchor = cueIndex;
  }
  assert.deepEqual(refreshedAt, [0, 24]);
});

test('auto-generated tracks establish the visible batch before looking up the current cue', () => {
  const renderBody = extractBetween(
    'function renderFileCue()',
    'function startFileRenderer()'
  );
  const refillIndex = renderBody.indexOf('refreshAutoTranslationWindow(playbackTime)');
  const visibleRequestIndex = renderBody.indexOf('startVisibleFileAiWindow(nextCueIndex)', refillIndex);
  assert.ok(visibleRequestIndex >= 0);
  assert.ok(refillIndex >= 0);
  assert.ok(visibleRequestIndex > refillIndex);
});

test('auto-generated windows use the responsive two-stage AI scheduler', () => {
  const fillBody = extractBetween(
    'async function fillAutoTranslationWindow',
    'function refreshAutoTranslationWindow'
  );
  assert.match(fillBody, /startResponsiveAiBatches\(windowTexts, generation, \{ preservePending: true \}\)/);
  const loopStart = fillBody.indexOf('for (let index = 0;');
  assert.ok(loopStart > fillBody.indexOf('startResponsiveAiBatches('));
  assert.match(fillBody, /!isAiTranslationScheduled\(text, generation\)/);
  assert.match(
    fillBody,
    /missingStandardTranslations = batch\.filter\([\s\S]*!inflightTranslations\.has/
  );
  const refreshBody = extractBetween(
    'function refreshAutoTranslationWindow',
    'async function warmAutoFileTranslations'
  );
  assert.match(refreshBody, /const refillStride = Math\.max\(1, Math\.floor\(AI_TRANSLATION_BATCH_CUE_LIMIT \/ 2\)\)/);
  assert.match(refreshBody, /cueProgress >= 0 && cueProgress < refillStride/);
  assert.match(refreshBody, /anchorDistance < AUTO_TRANSLATION_LOOKAHEAD_SECONDS \/ 2/);
  assert.match(refreshBody, /Math\.abs\(playhead - autoTranslationWindowAnchor\) > AUTO_TRANSLATION_LOOKAHEAD_SECONDS/);
  assert.match(refreshBody, /if \(movedBeyondCurrentWindow\) discardPendingAiPrefetch\(\)/);
  assert.match(contentSource, /autoTranslationAiAnchorCueIndex = -1/);
});

test('auto-generated AI refill waits for half a batch or half the time window', () => {
  const context = {
    Promise,
    console: { info() {} },
    nearestCueIndex: 0,
    refillCalls: 0,
    discarded: 0
  };
  vm.createContext(context);
  vm.runInContext([
    'const AUTO_TRANSLATION_WINDOW_REFRESH_SECONDS = 5;',
    'const AUTO_TRANSLATION_LOOKAHEAD_SECONDS = 60;',
    'const AI_TRANSLATION_BATCH_CUE_LIMIT = 48;',
    'let isAutoGenerated = true;',
    'const currentSettings = { showTrans: true, aiEnabled: true, enabled: true };',
    'let autoTranslationWindowAnchor = -1;',
    'let autoTranslationAiAnchorCueIndex = -1;',
    'let autoTranslationWindowSequence = 0;',
    'let trackLoadGeneration = 1;',
    'let isOrphaned = false;',
    'function findNextCueIndexAtTime() { return globalThis.nearestCueIndex; }',
    'function discardPendingAiPrefetch() { globalThis.discarded += 1; }',
    'function fillAutoTranslationWindow() { globalThis.refillCalls += 1; return Promise.resolve(); }',
    extractBetween('function refreshAutoTranslationWindow', 'async function warmAutoFileTranslations'),
    'globalThis.refresh = refreshAutoTranslationWindow;'
  ].join('\n'), context);

  assert.ok(context.refresh(0, true));
  context.nearestCueIndex = 23;
  assert.equal(context.refresh(29), null);
  assert.equal(context.refillCalls, 1);

  context.nearestCueIndex = 24;
  assert.ok(context.refresh(29));
  assert.equal(context.refillCalls, 2);

  context.nearestCueIndex = 27;
  assert.ok(context.refresh(60));
  assert.equal(context.refillCalls, 3);
});

test('batch failures only settle successfully mapped cues and retry a bounded subset', () => {
  const batchBody = extractBetween(
    'async function translateAiBatchItems',
    'function isAiTranslationScheduled'
  );
  assert.match(batchBody, /settledAiTranslations\.add\(getAiRequestKey\(sourceText, generation\)\)/);
  assert.doesNotMatch(batchBody, /job\.texts\.forEach\([\s\S]*settledAiTranslations\.add/);
  assert.match(
    batchBody,
    /isAiBatchLargeEnough\(missingTexts, allowShortBatch\)[\s\S]*missingTexts\.slice\(0, AI_BATCH_RETRY_CUE_LIMIT\)/
  );
  assert.match(batchBody, /translateAiBatchItems\([\s\S]*false/);
  assert.match(batchBody, /markAiRetryFailure\(sourceText, generation\)/);
  assert.match(contentSource, /if \(isAiRetryCoolingDown\(requestKey\)\) return null/);
});

test('AI batch execution refuses small requests and small retries', () => {
  const batchBody = extractBetween(
    'async function translateAiBatchItems',
    'function isAiTranslationScheduled'
  );
  assert.match(
    batchBody,
    /!isAiBatchLargeEnough\(texts, allowShortBatch\)[\s\S]*return \[\]/
  );
  assert.match(
    batchBody,
    /isAiBatchLargeEnough\(missingTexts, allowShortBatch\)/
  );
});

test('AI fallback and live ASR prefetch are explicitly bounded', () => {
  assert.match(contentSource, /if \(aiRequest && !currentSettings\.aiFallback\) return;/);
  assert.match(contentSource, /ensureCueTranslation\(candidate, trackLoadGeneration, \{ skipAi: true \}\)/);
  assert.match(contentSource, /sourceText\.length > AI_TRANSLATION_MAX_CHARS/);
});

test('small AI-only subtitle groups still use standard translation instead of disappearing', () => {
  const domBody = extractBetween(
    'function renderDomTranslationFallback',
    'function bindMutationObserver'
  );
  const batchBody = extractBetween(
    'async function translateBatch',
    'async function translateAiBatchItems'
  );
  assert.match(domBody, /const aiRequest = allowAiEnhancement[\s\S]*if \(aiRequest && !currentSettings\.aiFallback\) return/);
  assert.match(batchBody, /const aiRequest = startAiBatchEnhancement\(batch, generation\)/);
  assert.match(batchBody, /if \(!currentSettings\.aiFallback && aiRequest\)/);
});

test('AI indicator distinguishes processing, standby, and enhanced states', () => {
  assert.match(contentSource, /chrome\.runtime\.getURL\('ai\.svg'\)/);
  assert.match(contentSource, /chrome\.runtime\.getURL\('ai_off\.svg'\)/);
  assert.match(contentSource, /chrome\.runtime\.getURL\('ai_loading\.svg'\)/);
  assert.match(contentSource, /chrome\.runtime\.getURL\('ai_standby\.svg'\)/);
  assert.match(contentSource, /<button type="button" class="lasdoscas-ai-indicator" aria-pressed="false">/);
  assert.match(contentSource, /class="lasdoscas-ai-off-icon"/);
  assert.match(contentSource, /class="lasdoscas-ai-tooltip" role="tooltip"/);
  assert.match(contentSource, /data-ai-state/);
  assert.match(contentSource, /function getAiDisplayState[\s\S]*aiIndicatorSessionState === 'enhanced'/);
  assert.match(contentSource, /return aiTranslationStates\.get\(sourceText\) \|\| aiIndicatorSessionState \|\| 'standby'/);
  assert.match(contentSource, /setAiTranslationState\(sourceText, 'processing'\)/);
  assert.match(contentSource, /setAiTranslationState\(sourceText, 'standby'\)/);
  assert.match(contentSource, /aiTranslationStates\.set\(sourceText, 'enhanced'\)/);
  assert.match(styleSource, /\.lasdoscas-ai-indicator \{[\s\S]*width: 34px !important;[\s\S]*height: 34px !important;/);
  assert.match(styleSource, /\.lasdoscas-copy-button \{[\s\S]*width: 34px !important;[\s\S]*height: 34px !important;/);
  assert.match(styleSource, /\.lasdoscas-ai-indicator img[\s\S]*inset: 1px !important;[\s\S]*width: 32px !important;[\s\S]*height: 32px !important;/);
  assert.match(styleSource, /\[data-ai-state="off"\] \.lasdoscas-ai-off-icon \{\s*display: block !important;\s*\}/);
  assert.match(styleSource, /\[data-ai-state="processing"\] \.lasdoscas-ai-loading-icon \{\s*display: block !important;\s*\}/);
  assert.match(styleSource, /\[data-ai-state="standby"\] \.lasdoscas-ai-standby-icon \{\s*display: block !important;\s*\}/);
  assert.match(styleSource, /\[data-ai-state="enhanced"\] \.lasdoscas-ai-ready-icon[\s\S]*display: block !important;/);
  assert.doesNotMatch(styleSource, /lasdoscas-ai-(?:preparing|halo)/);
  assert.doesNotMatch(styleSource, /\.lasdoscas-ai-indicator::after/);
  assert.match(styleSource, /\.lasdoscas-ai-indicator img \{[\s\S]*opacity: 1;[\s\S]*transform: scale\(1\);/);
  assert.match(styleSource, /\.lasdoscas-ai-indicator \{[\s\S]*pointer-events: auto !important;/);
  assert.match(styleSource, /overflow: visible !important;[\s\S]*z-index: 2147483647 !important/);
  assert.match(styleSource, /\.lasdoscas-ai-indicator:hover \.lasdoscas-ai-tooltip,[\s\S]*\.lasdoscas-ai-indicator:focus-visible \.lasdoscas-ai-tooltip[\s\S]*visibility: visible !important;/);
});

test('AI indicator button toggles the shared AI setting and exposes accessible state', () => {
  const bindingBody = extractBetween(
    'function bindAiToggleButton(wrapper)',
    "document.addEventListener('keydown'"
  );
  assert.match(bindingBody, /const nextValue = !previousValue/);
  assert.match(bindingBody, /chrome\.storage\.local\.set\(\{ aiEnabled: nextValue \}/);
  assert.match(bindingBody, /setWrapperAiDisplayState\(wrapper, nextValue \? 'standby' : 'off'\)/);
  assert.match(contentSource, /indicator\.setAttribute\('aria-pressed', String\(currentSettings\.aiEnabled\)\)/);
  assert.match(contentSource, /indicator\.setAttribute\('aria-label', statusText\)/);
  assert.match(contentSource, /if \(tooltip\) tooltip\.textContent = statusText/);
  assert.match(contentSource, /bindAiToggleButton\(wrapper\)/);
  assert.match(contentSource, /off: 'AI 增强已关闭，点击开启'/);
});

test('AI indicator never returns to processing after the first enhanced result', () => {
  const context = {};
  vm.createContext(context);
  vm.runInContext([
    extractBetween(
      'function getNextAiIndicatorSessionState',
      'function setAiIndicatorSessionState'
    ),
    `globalThis.nextAiState = getNextAiIndicatorSessionState;
     globalThis.nextAiOrigin = getNextAiIndicatorSessionOrigin;`
  ].join('\n'), context);

  assert.equal(context.nextAiState('standby', 'processing'), 'processing');
  assert.equal(context.nextAiState('processing', 'standby'), 'standby');
  assert.equal(context.nextAiState('processing', 'enhanced'), 'enhanced');
  assert.equal(context.nextAiState('enhanced', 'processing'), 'enhanced');
  assert.equal(context.nextAiState('enhanced', 'standby'), 'enhanced');
  assert.equal(context.nextAiOrigin('', 'cache'), 'cache');
  assert.equal(context.nextAiOrigin('cache', 'live'), 'live');
  assert.equal(context.nextAiOrigin('live', 'cache'), 'live');
  assert.match(contentSource, /function applyAiTranslation[\s\S]*setAiIndicatorSessionState\('enhanced', origin\)/);
  assert.match(contentSource, /function resetAiTranslationScheduling[\s\S]*aiIndicatorSessionState = 'standby'/);
});

test('track-level processing overrides stale per-cue standby state', () => {
  const displayBody = extractBetween(
    'function getAiDisplayState',
    'function getIdleAiDisplayState'
  );
  assert.match(
    displayBody,
    /if \(aiIndicatorSessionState === 'processing'\) return 'processing';[\s\S]*aiTranslationStates\.get\(sourceText\)/
  );
});

test('AI indicator distinguishes live API results from cached AI translations', () => {
  assert.match(contentSource, /const aiTranslationOrigins = new Map\(\)/);
  assert.match(contentSource, /const origin = result\.cached \? 'cache' : 'live'/);
  assert.match(contentSource, /aiTranslationOrigins\.set\(sourceText, origin\)/);
  assert.match(contentSource, /if \(isAiTranslationSource\(translationSource\)\) aiTranslationOrigins\.set\(source, 'cache'\)/);
  assert.match(contentSource, /data-ai-origin/);
  assert.match(contentSource, /正在使用缓存的 AI 增强译文，本次播放未发起新的 API 请求/);
  assert.match(contentSource, /AI 已在本次播放中实时增强字幕/);
  assert.match(contentSource, /const statusText = getAiIndicatorTitle\(displayState, origin\)/);
  assert.match(contentSource, /indicator\.setAttribute\('aria-label', statusText\)/);
});

test('open settings panels stay synchronized with the subtitle AI button', () => {
  assert.match(popupScriptSource, /chrome\.storage\.onChanged\.addListener\(\(changes, areaName\) => \{/);
  assert.match(popupScriptSource, /areaName !== 'local' \|\| !changes\.aiEnabled/);
  assert.match(popupScriptSource, /enabled\.checked = aiSettings\.aiEnabled/);
  assert.match(popupScriptSource, /details\.open = aiSettings\.aiEnabled/);
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
