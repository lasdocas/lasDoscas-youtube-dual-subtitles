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

test('manual subtitle downloads use the same bounded fetch path with AI disabled', () => {
  assert.match(contentSource, /const CAPTION_FETCH_TIMEOUT_MS = 8000/);
  assert.doesNotMatch(contentSource, /if \(!currentSettings\.aiEnabled\) \{\s*const response = await fetch\(url\.toString\(\), \{ signal, credentials: 'include' \}\)/);
  assert.match(contentSource, /const timeoutId = setTimeout\(\(\) => timeoutController\.abort\(\), CAPTION_FETCH_TIMEOUT_MS\)/);
  assert.match(contentSource, /trackMode = terminalMode;[\s\S]*?hideLoadingMessage\(\);/);
});

test('AI enhancement keeps Google as the immediate translation provider', () => {
  assert.match(contentSource, /function requestTranslation[\s\S]*sendTranslationRequest\('translate', text, lang\)/);
  assert.match(contentSource, /function requestAiTranslation[\s\S]*sendTranslationRequest\('translate_ai', text, lang, \{ priority \}\)/);
  assert.match(contentSource, /startAiEnhancement\(currentText, generation\);[\s\S]*await requestTranslation\(currentText, targetLang\)/);
  assert.match(contentSource, /function warmInitialFileTranslations[\s\S]*translateBatch\(texts, generation, \{ enableAi: false \}\)/);
});

test('file subtitles get a bounded grace period for bilingual first paint', () => {
  const renderFileCueBody = contentSource.slice(
    contentSource.indexOf('function renderFileCue()'),
    contentSource.indexOf('function startFileRenderer()', contentSource.indexOf('function renderFileCue()'))
  );
  assert.match(contentSource, /const FILE_CUE_TRANSLATION_GRACE_MS = 240/);
  assert.match(renderFileCueBody, /const translationRequest = ensureCueTranslation\(cue\.text\)/);
  assert.match(renderFileCueBody, /fileCueTranslationGraceTimer = setTimeout\([\s\S]*FILE_CUE_TRANSLATION_GRACE_MS/);
  assert.match(renderFileCueBody, /const readyTranslation = preloadedTranslations\.get\(cue\.text\)[\s\S]*displayFileCue\(nextCueIndex, readyTranslation/);
  assert.match(renderFileCueBody, /displayFileCue\(nextCueIndex, '', getPlayerVideoElement\(\)\?\.currentTime, \{ keepPending: true \}\)/);
});

test('successful track loading clears the startup banner before cue rendering', () => {
  assert.match(contentSource, /trackMode = TRACK_MODE\.FILE_READY;[\s\S]{0,220}hideLoadingMessage\(\);/);
  const hideLoadingBody = extractBetween('function hideLoadingMessage()', 'function getLayoutMode()');
  assert.match(hideLoadingBody, /loadingMessageVisible = false;/);
  assert.match(hideLoadingBody, /clearSubtitleContent\(\);/);
  assert.match(contentSource, /!loadingMessageVisible && isEmpty/);
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
  assert.match(contentSource, /const AI_TRANSLATION_BATCH_CUE_LIMIT = 24/);
  assert.match(contentSource, /const AI_TRANSLATION_MAX_CHARS = 4500/);
  assert.match(contentSource, /const AI_TRANSLATION_CONTEXT_CUE_LIMIT = 3/);
  assert.match(contentSource, /const AI_VISIBLE_BATCH_GRACE_MS = 650/);
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

test('standard-seeded authored cues still enter AI enhancement', () => {
  const preloadBody = extractBetween(
    'async function preloadTranslations',
    'async function preloadFullTrack'
  );
  assert.match(preloadBody, /startAiBatchEnhancement\(initialCues, generation\)/);
  assert.match(preloadBody, /const missingStandardTranslations = initialCues\.filter/);
  assert.ok(
    preloadBody.indexOf('startAiBatchEnhancement(initialCues, generation)') <
    preloadBody.indexOf('const missingStandardTranslations')
  );
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

test('visible AI scheduling gives pending prefetch a bounded grace period', () => {
  const context = {
    Map,
    Set,
    Promise,
    JSON,
    setTimeout(callback) { return { callback }; },
    clearTimeout() {}
  };
  vm.createContext(context);
  vm.runInContext([
    'const AI_TRANSLATION_MAX_CHARS = 4500;',
    'const AI_TRANSLATION_BATCH_CUE_LIMIT = 24;',
    'const AI_TRANSLATION_CONTEXT_CUE_LIMIT = 3;',
    'const AI_VISIBLE_BATCH_GRACE_MS = 650;',
    'const AI_BATCH_RETRY_CUE_LIMIT = 8;',
    "const AI_BATCH_PAYLOAD_PREFIX = 'LASDOSCAS_BATCH_V2\\n';",
    'let trackLoadGeneration = 1;',
    'let isOrphaned = false;',
    'const currentSettings = { enabled: true, aiEnabled: true, showTrans: true, lang: "zh-CN" };',
    'const preloadedTranslations = new Map();',
    'const preloadedSentencesList = [];',
    'const translationSources = new Map();',
    'const settledAiTranslations = new Set();',
    'const queuedAiTranslations = new Set();',
    'const inflightAiTranslations = new Map();',
    'const visibleAiGraceRequests = new Map();',
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
    extractBetween('function discardPendingAiPrefetch', 'async function ensureCueTranslation'),
    extractBetween('function runAiPrefetchJob', 'async function fillAutoTranslationWindow'),
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
        graceCount: visibleAiGraceRequests.size
      })
    };`
  ].join('\n'), context);

  const scheduler = context.scheduler;
  const firstVisible = scheduler.startAiEnhancement('current');
  const queuedPrefetch = scheduler.startAiBatchEnhancement(['future'], 1);
  assert.equal(scheduler.requests.length, 1);
  assert.equal(scheduler.requests[0].priority, 'visible');
  assert.deepEqual(Array.from(scheduler.snapshot().pendingPrefetch), ['future']);
  assert.notEqual(scheduler.states.get('future'), 'processing');
  const preservedPrefetch = scheduler.startAiBatchEnhancement(
    ['far-future'],
    1,
    { preservePending: true }
  );
  assert.equal(preservedPrefetch, queuedPrefetch);
  assert.deepEqual(Array.from(scheduler.snapshot().pendingPrefetch), ['future']);

  scheduler.startAiEnhancement('future');
  assert.equal(scheduler.requests.length, 1);
  assert.equal(scheduler.snapshot().pendingVisible, '');
  assert.deepEqual(Array.from(scheduler.snapshot().pendingPrefetch), ['future']);
  assert.equal(scheduler.snapshot().graceCount, 1);
  assert.notEqual(scheduler.states.get('future'), 'processing');
  void firstVisible;
  void queuedPrefetch;
});

test('visible file cue uses grace-aware enhancement and anchored lookahead batching', () => {
  const visibleWindowBody = extractBetween(
    'function startVisibleFileAiWindow',
    'function renderFileCue()'
  );
  assert.match(visibleWindowBody, /const visibleRequest = visibleText\s*\? startAiEnhancement\(visibleText, generation\)/);
  assert.match(visibleWindowBody, /if \(isAutoGenerated\) return visibleRequest;/);
  assert.match(visibleWindowBody, /shouldRefreshVisibleFileAiLookahead\([\s\S]*visibleFileAiWindowAnchorCueIndex/);
  assert.match(visibleWindowBody, /if \(!shouldRefreshLookahead\) return visibleRequest;/);
  assert.match(visibleWindowBody, /for \(let index = cueIndex \+ 1;/);
  assert.match(visibleWindowBody, /const lookaheadRequest = startAiBatchEnhancement\(texts, generation\)/);
});

test('anchored AI lookahead does not degrade into one refill per cue', () => {
  const context = {};
  vm.createContext(context);
  vm.runInContext([
    'const AI_TRANSLATION_BATCH_CUE_LIMIT = 24;',
    extractBetween(
      'function shouldRefreshVisibleFileAiLookahead',
      'function startVisibleFileAiWindow'
    ),
    'globalThis.shouldRefresh = shouldRefreshVisibleFileAiLookahead;'
  ].join('\n'), context);

  let anchor = -1;
  const refreshedAt = [];
  for (let cueIndex = 0; cueIndex < 20; cueIndex += 1) {
    if (!context.shouldRefresh(cueIndex, anchor)) continue;
    refreshedAt.push(cueIndex);
    anchor = cueIndex;
  }
  assert.deepEqual(refreshedAt, [0, 12]);
});

test('auto-generated tracks prioritize the visible cue before time-window refill', () => {
  const renderBody = extractBetween(
    'function renderFileCue()',
    'function startFileRenderer()'
  );
  const visibleRequestIndex = renderBody.indexOf('startVisibleFileAiWindow(nextCueIndex)');
  const refillIndex = renderBody.indexOf('refreshAutoTranslationWindow(playbackTime)', visibleRequestIndex);
  assert.ok(visibleRequestIndex >= 0);
  assert.ok(refillIndex > visibleRequestIndex);
});

test('auto-generated windows only enqueue the nearest AI batch', () => {
  const fillBody = extractBetween(
    'async function fillAutoTranslationWindow',
    'function refreshAutoTranslationWindow'
  );
  const aiStartCalls = fillBody.match(/startAiBatchEnhancement\(/g) || [];
  assert.equal(aiStartCalls.length, 1);
  assert.match(
    fillBody,
    /startAiBatchEnhancement\(\s*windowTexts\.slice\(0, AI_TRANSLATION_BATCH_CUE_LIMIT\)/
  );
  assert.match(fillBody, /\{ preservePending: true \}/);
  const loopStart = fillBody.indexOf('for (let index = 0;');
  assert.ok(loopStart > fillBody.indexOf('startAiBatchEnhancement('));
  assert.doesNotMatch(fillBody.slice(loopStart), /startAiBatchEnhancement\(/);
  assert.match(fillBody, /!isAiTranslationScheduled\(text, generation\)/);
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
    'const AI_TRANSLATION_BATCH_CUE_LIMIT = 24;',
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
  context.nearestCueIndex = 11;
  assert.equal(context.refresh(29), null);
  assert.equal(context.refillCalls, 1);

  context.nearestCueIndex = 12;
  assert.ok(context.refresh(29));
  assert.equal(context.refillCalls, 2);

  context.nearestCueIndex = 15;
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
  assert.match(batchBody, /missingTexts\.slice\(0, AI_BATCH_RETRY_CUE_LIMIT\)/);
  assert.match(batchBody, /translateAiBatchItems\([\s\S]*false/);
  assert.match(batchBody, /markAiRetryFailure\(sourceText, generation\)/);
  assert.match(contentSource, /if \(isAiRetryCoolingDown\(requestKey\)\) return null/);
});

test('AI fallback and live ASR prefetch are explicitly bounded', () => {
  assert.match(contentSource, /if \(currentSettings\.aiEnabled && !currentSettings\.aiFallback\) return;/);
  assert.match(contentSource, /ensureCueTranslation\(candidate, trackLoadGeneration, \{ skipAi: true \}\)/);
  assert.match(contentSource, /sourceText\.length > AI_TRANSLATION_MAX_CHARS/);
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
