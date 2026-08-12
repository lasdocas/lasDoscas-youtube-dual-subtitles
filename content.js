let isOrphaned = false;
let fullscreenSettingsIframe = null; 

// ==========================================
// 🚀 源语言状态与本地化资源
// ==========================================
let currentSourceLang = 'en';
let loadingMessageVisible = false;
const {
  loadingMessageDict,
  aiLoadingMessageDict,
  youtubeCaptionsDisabledMessageDict,
  hintMessageDict,
  autoTranslateSelectionMessageDict,
  copyUiText,
  liveAsrUiText,
  resolveLocalizedMessage
} = globalThis.lasDoscasMessages;

function getLoadingMessage() {
  const dictionary = currentSettings.aiEnabled ? aiLoadingMessageDict : loadingMessageDict;
  return resolveLocalizedMessage(dictionary, currentSettings.lang);
}

function getYouTubeCaptionsDisabledMessage() {
  return resolveLocalizedMessage(youtubeCaptionsDisabledMessageDict, currentSettings.lang);
}

function isSpaceDelimitedLang(langCode) {
  if (!langCode) return true;
  const prefix = langCode.toLowerCase().split('-')[0];
  return !['ja', 'zh', 'ko', 'th', 'lo', 'km', 'my'].includes(prefix);
}

function isRtlLanguage(langCode) {
  const prefix = (langCode || '').toLowerCase().split('-')[0];
  return ['ar', 'fa', 'he', 'iw', 'ur'].includes(prefix);
}

function getHintMessage(targetLang) {
  return resolveLocalizedMessage(hintMessageDict, targetLang);
}

function getAutoTranslateSelectionMessage(targetLang) {
  return resolveLocalizedMessage(autoTranslateSelectionMessageDict, targetLang);
}

function getLiveAsrUiText() {
  const language = String(currentSettings.uiLang || 'en').toLowerCase().split('-')[0];
  return liveAsrUiText[language] || liveAsrUiText.en;
}

function updateLiveAsrIndicator(wrapper = document.querySelector('.custom-subtitle-wrapper')) {
  if (!wrapper) return;
  const indicator = wrapper.querySelector('.lasdoscas-live-asr-indicator');
  if (!indicator) return;

  const text = getLiveAsrUiText();
  const label = indicator.querySelector('.lasdoscas-live-asr-label');
  const tooltip = indicator.querySelector('.lasdoscas-live-asr-tooltip');
  if (label) label.textContent = text.label;
  if (tooltip) tooltip.textContent = text.notice;
  indicator.setAttribute('aria-label', text.label);
  indicator.setAttribute('tabindex', liveAsrConfirmed ? '0' : '-1');
  indicator.setAttribute('aria-hidden', liveAsrConfirmed ? 'false' : 'true');
  wrapper.setAttribute('data-live-asr-confirmed', liveAsrConfirmed ? 'true' : 'false');
  wrapper.setAttribute('data-live-asr-notice-open', liveAsrNoticeOpen ? 'true' : 'false');
}

function setLiveAsrConfirmed(confirmed) {
  liveAsrConfirmed = Boolean(confirmed);
  if (!liveAsrConfirmed) {
    clearTimeout(liveAsrNoticeTimer);
    liveAsrNoticeTimer = null;
    liveAsrNoticeOpen = false;
  }
  updateLiveAsrIndicator();
}

function confirmLiveAsrFallback() {
  setLiveAsrConfirmed(true);
  const videoKey = getCurrentVideoId() || window.location.href;
  if (shownLiveAsrNoticeVideos.has(videoKey)) return;

  shownLiveAsrNoticeVideos.add(videoKey);
  liveAsrNoticeOpen = true;
  updateLiveAsrIndicator();
  clearTimeout(liveAsrNoticeTimer);
  liveAsrNoticeTimer = setTimeout(() => {
    liveAsrNoticeTimer = null;
    liveAsrNoticeOpen = false;
    updateLiveAsrIndicator();
  }, LIVE_ASR_NOTICE_DURATION_MS);
}

function dieQuietly() {
  if (isOrphaned) return;
  isOrphaned = true; 
  resetPlayerElementCache();
  
  if (observer) observer.disconnect();
  if (flexyObserver) flexyObserver.disconnect();
  if (playerResizeObserver) playerResizeObserver.disconnect();
  if (ccButtonObserver) ccButtonObserver.disconnect();
  if (containerMonitor) clearInterval(containerMonitor);
  if (playerControlMonitor) clearInterval(playerControlMonitor);
  clearTimeout(copyFeedbackTimer);
  setLiveAsrConfirmed(false);
  cancelTrackLoad();
  stopFileRenderer();
  resetLiveAsrBuffer();
  
  if (fullscreenSettingsIframe) {
    fullscreenSettingsIframe.remove();
    fullscreenSettingsIframe = null;
  }
  
  console.log("lasDocas: Detected that the extension has been reloaded; the old script has safely exited silently.");
}

function checkContext() {
  try {
    if (!chrome.runtime || !chrome.runtime.id) {
      dieQuietly();
      return false;
    }
    return true;
  } catch (e) {
    dieQuietly();
    return false;
  }
}

function isYouTubeWatchPage() {
  return window.location.pathname === '/watch' && new URLSearchParams(window.location.search).has('v');
}

function getSmartDefaultLang() {
  const browserLang = navigator.language || 'en';
  const lowerLang = browserLang.toLowerCase();
  const prefix = lowerLang.split('-')[0];

  if (lowerLang === 'zh-tw' || lowerLang === 'zh-hk' || lowerLang === 'zh-mo') return 'zh-TW';
  if (lowerLang === 'fr-ca') return 'fr-CA';
  if (prefix === 'zh') return 'zh-CN';
  if (prefix === 'he' || prefix === 'iw') return 'iw';

  const supportedPrefixes = [
    'en', 'es', 'fr', 'de', 'ja', 'ko', 'pt', 'id', 'ms', 'ru', 
    'ar', 'hi', 'ta', 'th', 'vi', 'tr', 'pl', 'nl', 'sv', 'da', 
    'no', 'fi', 'it', 'ro', 'hu', 'cs', 'hr', 'el', 'tl', 'uk', 
    'eu', 'ca', 'gl', 'is',
    'sw', 'et', 'lv', 'lt', 'sk', 'sl', 'bg', 'sr', 'ur', 'fa', 
    'mr', 'bn', 'gu', 'te', 'kn', 'ml', 'am'
  ];
  if (supportedPrefixes.includes(prefix)) return prefix;
  return 'en';
}

function getDefaultUiLang() {
  const prefix = (navigator.language || 'en').toLowerCase().split('-')[0];
  return prefix === 'zh' || prefix === 'es' ? prefix : 'en';
}


let lastText = "";
let lastMatchedSource = "";
let lastAiIndicatorSource = "";
let observer = null;
let flexyObserver = null;
let playerResizeObserver = null; 
let ccButtonObserver = null; 
let playerPluginControl = null;
let playerPluginSwitch = null;
let playerControlMonitor = null;
let isCCAvailable = false;
let isYouTubeCCEnabled = null;
let captionTrackAvailability = null;
let captionTrackAvailabilityVideoId = '';
let isSyncingPluginState = false;

let currentCaptionContainer = null;
let containerMonitor = null;
let cachedMoviePlayerElement = null;
let cachedVideoElement = null;

const TRACK_MODE = Object.freeze({
  UNKNOWN: 'UNKNOWN',
  WAITING_FOR_YOUTUBE_CAPTIONS: 'WAITING_FOR_YOUTUBE_CAPTIONS',
  DISCOVERING: 'DISCOVERING',
  YOUTUBE_AUTO_TRANSLATE: 'YOUTUBE_AUTO_TRANSLATE',
  FILE_WARMING: 'FILE_WARMING',
  FILE_READY: 'FILE_READY',
  LIVE_ASR: 'LIVE_ASR',
  NO_CAPTIONS: 'NO_CAPTIONS',
  RETRYABLE_ERROR: 'RETRYABLE_ERROR'
});

const PLAYER_BRIDGE_SOURCE = 'lasdoscas-player-bridge-v1';
const PLAYER_SNAPSHOT_TIMEOUT_MS = 1500;
const CAPTION_FETCH_TIMEOUT_MS = 8000;
const TRACK_RETRY_DELAYS_MS = [350, 900, 1800, 3200];
const AUTO_FILE_TRANSLATION_RETRY_MS = 2000;
const FILE_CUE_TRANSLATION_GRACE_MS = 240;
const YOUTUBE_TRANSLATION_WARMUP_MS = 300;
const INITIAL_TRANSLATION_LOOKAHEAD = 6;
const AUTO_TRANSLATION_LOOKAHEAD_SECONDS = 60;
const AUTO_TRANSLATION_WINDOW_MAX_CUES = 24;
const AUTO_TRANSLATION_WINDOW_CONCURRENCY = 4;
const AUTO_TRANSLATION_WINDOW_REFRESH_SECONDS = 5;
const AUTO_FILE_WARMUP_TIMEOUT_MS = 1500;
const PRELOAD_BATCH_DELAY_MS = 80;
const STANDARD_TRANSLATION_BATCH_SIZE = 16;
// Batch by both cue count and serialized size. Twenty-four nearby cues usually
// cover 45-90 seconds without making the first useful response too large.
const AI_TRANSLATION_BATCH_CUE_LIMIT = 24;
const AI_TRANSLATION_MAX_CHARS = 4500;
const AI_TRANSLATION_CONTEXT_CUE_LIMIT = 3;
const AI_TRANSLATION_LOOKAHEAD_SECONDS = 75;
const AI_VISIBLE_BATCH_GRACE_MS = 650;
const AI_BATCH_RETRY_CUE_LIMIT = 8;
const AI_TRANSLATION_RETRY_COOLDOWN_MS = 30 * 1000;
const AI_BATCH_PAYLOAD_PREFIX = 'LASDOSCAS_BATCH_V2\n';
const SUBTITLE_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const SUBTITLE_CACHE_MAX_CUES = 2500;
const SUBTITLE_CACHE_SAVE_DEBOUNCE_MS = 1200;
const DOM_TRANSLATION_DEBOUNCE_MS = 80;
const LIVE_ASR_PREFETCH_MS = 120;
const LIVE_ASR_COMMIT_STABILITY_MS = 260;
const LIVE_ASR_NOTICE_DURATION_MS = 5000;
const ASR_STRUCTURAL_GAP_SECONDS = 1.6;
const ASR_EMERGENCY_MAX_DURATION_SECONDS = 30;
const ASR_EMERGENCY_MAX_CHARS = 320;
const ASR_EMERGENCY_MAX_COMPACT_CHARS = 180;
const DISPLAY_MAX_CHARS = 180;
const DISPLAY_MAX_COMPACT_CHARS = 60;
const DISPLAY_MAX_PARTS = 4;
const DISPLAY_MIN_WORDS_PER_PART = 3;
const DISPLAY_MIN_COMPACT_CHARS_PER_PART = 4;
const DISPLAY_MIN_PART_DURATION_SECONDS = 1.5;
const AUTO_FILE_RENDER_INTERVAL_MS = 50;
const FILE_RENDER_INTERVAL_MS = 50;
const COPY_FEEDBACK_DURATION_MS = 500;
const BASE_PLAYER_WIDTH_PX = 850;
const PLAYER_SCALE_EXPONENT = 0.5;
const MIN_PLAYER_SCALE = 0.75;
const MAX_PLAYER_SCALE = 1.4;
const MIN_MEASURABLE_PLAYER_WIDTH_PX = 200;
const FULLSCREEN_WRAPPER_WIDTH_RATIO = 0.8;

function calculatePlayerScale(playerWidth) {
  const normalizedWidth = Number(playerWidth);
  if (!Number.isFinite(normalizedWidth) || normalizedWidth <= 0) return MIN_PLAYER_SCALE;
  const baseRatio = normalizedWidth / BASE_PLAYER_WIDTH_PX;
  const scale = Math.pow(baseRatio, PLAYER_SCALE_EXPONENT);
  return Math.max(MIN_PLAYER_SCALE, Math.min(scale, MAX_PLAYER_SCALE));
}

let trackMode = TRACK_MODE.UNKNOWN;
let isAutoGenerated = false;
let liveAsrConfirmed = false;
let liveAsrNoticeOpen = false;
let liveAsrNoticeTimer = null;
const shownLiveAsrNoticeVideos = new Set();
let currentTrackKey = '';
let trackLoadGeneration = 0;
let trackAbortController = null;
let trackRetryTimer = null;
let fileRendererTimer = null;
let fileCueTranslationRetryTimer = null;
let fileCueTranslationGraceTimer = null;
let currentCueIndex = -1;
let pendingFileCueIndex = -1;
let renderedFileCueIndex = -1;
let renderedFileCuePartIndex = -1;
let visibleFileAiWindowAnchorCueIndex = -1;
let autoTranslationWindowSequence = 0;
let autoTranslationWindowAnchor = -1;
let autoTranslationAiAnchorCueIndex = -1;
let bridgeRequestSequence = 0;
const bridgeRequests = new Map();
const inflightTranslations = new Map();
const inflightAiTranslations = new Map();
const visibleAiGraceRequests = new Map();
const settledAiTranslations = new Set();
const failedAiTranslations = new Map();
const queuedAiTranslations = new Set();
const aiTranslationStates = new Map();
const aiTranslationOrigins = new Map();
// Green means AI has successfully participated in this track. Keep it sticky
// so later network activity cannot make the indicator oscillate per cue.
let aiIndicatorSessionState = 'standby';
let aiIndicatorSessionOrigin = '';
let activeAiPrefetchJob = null;
let pendingAiPrefetchJob = null;
let activeVisibleAiJob = null;
let pendingVisibleAiJob = null;
let isShiftPressed = false;
let copyFeedbackTimer = null;
let currentVideoMetadata = { videoId: '', title: '', publishDate: '' };

let preloadedTranslations = new Map();
let translationSources = new Map();
function isAiTranslationSource(source) {
  return source === 'gemini' || source === 'groq' || source === 'openrouter';
}
function getNextAiIndicatorSessionState(currentState, requestedState) {
  if (currentState === 'enhanced' || requestedState === 'enhanced') return 'enhanced';
  return requestedState === 'processing' ? 'processing' : 'standby';
}
function getNextAiIndicatorSessionOrigin(currentOrigin, requestedOrigin) {
  if (currentOrigin === 'live' || requestedOrigin === 'live') return 'live';
  return requestedOrigin === 'cache' || currentOrigin === 'cache' ? 'cache' : '';
}
function getAiIndicatorTitle(state, origin) {
  const language = String(currentSettings.uiLang || 'en').toLowerCase().split('-')[0];
  const messages = {
    zh: {
      off: 'AI 增强已关闭，点击开启',
      standby: 'AI 增强已开启，当前处于待命状态；点击关闭',
      processing: '正在等待第一条 AI 增强结果；点击关闭',
      live: 'AI 已在本次播放中实时增强字幕；点击关闭',
      cache: '正在使用缓存的 AI 增强译文，本次播放未发起新的 API 请求；点击关闭',
      enhanced: 'AI 已增强当前字幕轨；点击关闭'
    },
    en: {
      off: 'AI enhancement is off; click to enable',
      standby: 'AI enhancement is enabled and standing by; click to disable',
      processing: 'Waiting for the first AI-enhanced result; click to disable',
      live: 'AI enhanced subtitles through a live request in this playback; click to disable',
      cache: 'Using cached AI-enhanced subtitles; no new API request was made in this playback; click to disable',
      enhanced: 'AI has enhanced this subtitle track; click to disable'
    },
    es: {
      off: 'La mejora con IA está desactivada; haz clic para activarla',
      standby: 'La mejora con IA está activada y en espera; haz clic para desactivarla',
      processing: 'Esperando el primer resultado mejorado por IA; haz clic para desactivarla',
      live: 'La IA mejoró los subtítulos mediante una solicitud en esta reproducción; haz clic para desactivarla',
      cache: 'Se usan subtítulos de IA en caché; no se hizo una nueva solicitud de API; haz clic para desactivarla',
      enhanced: 'La IA ha mejorado esta pista de subtítulos; haz clic para desactivarla'
    }
  };
  const dictionary = messages[language] || messages.en;
  if (state === 'enhanced') return dictionary[origin] || dictionary.enhanced;
  return dictionary[state] || dictionary.standby;
}
function setWrapperAiDisplayState(wrapper, state) {
  if (!wrapper) return;
  const displayState = currentSettings.aiEnabled ? (state || 'standby') : 'off';
  wrapper.setAttribute('data-ai-state', displayState);
  const origin = displayState === 'enhanced' ? aiIndicatorSessionOrigin : '';
  if (origin) wrapper.setAttribute('data-ai-origin', origin);
  else wrapper.removeAttribute('data-ai-origin');
  const indicator = wrapper.querySelector('.lasdoscas-ai-indicator');
  if (!indicator) return;
  const statusText = getAiIndicatorTitle(displayState, origin);
  indicator.setAttribute('aria-pressed', String(currentSettings.aiEnabled));
  indicator.setAttribute('aria-label', statusText);
  const tooltip = indicator.querySelector('.lasdoscas-ai-tooltip');
  if (tooltip) tooltip.textContent = statusText;
}
function setAiIndicatorSessionState(state, origin = '') {
  aiIndicatorSessionState = getNextAiIndicatorSessionState(aiIndicatorSessionState, state);
  if (aiIndicatorSessionState === 'enhanced') {
    aiIndicatorSessionOrigin = getNextAiIndicatorSessionOrigin(aiIndicatorSessionOrigin, origin);
  }
  const wrapper = document.querySelector('.custom-subtitle-wrapper');
  if (!wrapper || !currentSettings.aiEnabled) return;
  const displaySource = lastMatchedSource || lastAiIndicatorSource || lastText;
  const translationSource = translationSources.get(displaySource) || '';
  const displayState = getAiDisplayState(displaySource, translationSource) ||
    getIdleAiDisplayState(wrapper);
  setWrapperAiDisplayState(wrapper, displayState);
}
function getAiDisplayState(sourceText, translationSource = '') {
  if (!currentSettings.aiEnabled || !String(sourceText || '').trim()) return '';
  if (aiIndicatorSessionState === 'enhanced' || isAiTranslationSource(translationSource)) {
    aiIndicatorSessionState = 'enhanced';
    aiIndicatorSessionOrigin = getNextAiIndicatorSessionOrigin(
      aiIndicatorSessionOrigin,
      aiTranslationOrigins.get(sourceText) || 'cache'
    );
    return 'enhanced';
  }
  return aiTranslationStates.get(sourceText) || aiIndicatorSessionState || 'standby';
}
function getIdleAiDisplayState(wrapper) {
  if (!currentSettings.aiEnabled || !wrapper) return '';
  return wrapper.getAttribute('data-layout-mode') === 'fullscreen'
    ? ''
    : aiIndicatorSessionState || 'standby';
}
function setAiTranslationState(sourceText, state) {
  if (!sourceText) return;
  if (state) aiTranslationStates.set(sourceText, state);
  else aiTranslationStates.delete(sourceText);

  if (trackMode === TRACK_MODE.FILE_READY && sourceText === lastMatchedSource) {
    renderFileCue();
    return;
  }
  if (sourceText !== lastText && sourceText !== lastAiIndicatorSource) return;
  const wrapper = document.querySelector('.custom-subtitle-wrapper');
  if (!wrapper) return;
  const translationSource = translationSources.get(sourceText) || '';
  const displayState = getAiDisplayState(sourceText, translationSource) || getIdleAiDisplayState(wrapper);
  setWrapperAiDisplayState(wrapper, displayState);
}
let preloadedSentencesList = [];
let subtitleCacheLoadPromise = null;
let subtitleCacheSaveTimer = null;

function getSubtitleCacheKey() {
  const videoId = String(currentVideoMetadata.videoId || getCurrentVideoId() || '').trim();
  const trackKey = String(currentTrackKey || '').trim();
  const language = String(currentSettings.lang || '').toLowerCase();
  const provider = currentSettings.aiEnabled ? String(currentSettings.aiProvider || 'gemini') : 'standard';
  if (!videoId || !trackKey || !language) return '';
  // Keep storage keys compact even when YouTube's baseUrl is long.
  let hash = 5381;
  for (let index = 0; index < trackKey.length; index += 1) {
    hash = ((hash * 33) ^ trackKey.charCodeAt(index)) >>> 0;
  }
  return `lasdoscasSubtitleCache:${videoId}:${hash.toString(16)}:${language}:${provider}`;
}

function loadSubtitleTranslationCache() {
  const cacheKey = getSubtitleCacheKey();
  if (!cacheKey) return Promise.resolve(false);
  subtitleCacheLoadPromise = new Promise((resolve) => {
    chrome.storage.local.get(cacheKey, (data) => {
      const entry = data?.[cacheKey];
      if (!entry || Number(entry.expiresAt) <= Date.now() || typeof entry.translations !== 'object') {
        resolve(false);
        return;
      }
      Object.entries(entry.translations).forEach(([source, translation]) => {
        if (source && typeof translation === 'string' && translation) {
          const translationSource = entry.sources?.[source] || 'standard';
          preloadedTranslations.set(source, translation);
          translationSources.set(source, translationSource);
          if (isAiTranslationSource(translationSource)) aiTranslationOrigins.set(source, 'cache');
          else aiTranslationOrigins.delete(source);
        }
      });
      resolve(true);
    });
  });
  return subtitleCacheLoadPromise;
}

function scheduleSubtitleTranslationCacheSave() {
  const cacheKey = getSubtitleCacheKey();
  if (!cacheKey || !preloadedTranslations.size) return;
  clearTimeout(subtitleCacheSaveTimer);
  subtitleCacheSaveTimer = setTimeout(() => {
    const translations = {};
    const sources = {};
    let count = 0;
    preloadedTranslations.forEach((translation, source) => {
      if (count >= SUBTITLE_CACHE_MAX_CUES || !source || !translation) return;
      translations[source] = translation;
      sources[source] = translationSources.get(source) || 'standard';
      count += 1;
    });
    chrome.storage.local.set({
      [cacheKey]: { version: 1, expiresAt: Date.now() + SUBTITLE_CACHE_TTL_MS, translations, sources }
    });
  }, SUBTITLE_CACHE_SAVE_DEBOUNCE_MS);
}

let currentSettings = {
  enabled: false,
  showSrc: true,
  showTrans: true,
  lang: getSmartDefaultLang(), 
  font: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",  
  srcSize: '0.75',
  fsSrcSize: '1.15', 
  srcColor: '#63e6be',
  srcNormalBold: false,
  srcFsBold: false,
  transSize: '0.75',
  fsTransSize: '1.15',
  transColor: '#ffffff',
  transNormalBold: false,
  transFsBold: true,
  fsBgStyle: 'none',
  fsBgOpacity: '75',
  aiEnabled: false,
  aiProvider: 'gemini',
  aiFallback: true,
  uiLang: getDefaultUiLang()
};

const LAYOUT_SETTING_KEYS = new Set([
  'showSrc', 'showTrans', 'font',
  'srcSize', 'fsSrcSize', 'srcColor', 'srcNormalBold', 'srcFsBold',
  'transSize', 'fsTransSize', 'transColor', 'transNormalBold', 'transFsBold',
  'fsBgStyle', 'fsBgOpacity'
]);

function loadAndApplySettings() {
  if (!checkContext()) return;
  chrome.storage.local.get(Object.keys(currentSettings), (settings) => {
    if (isOrphaned) return;
    Object.assign(currentSettings, settings);
    syncPluginState();
  });
}

try {
  chrome.storage.onChanged.addListener((changes) => {
    if (!checkContext()) return;
    const changedKeys = Object.keys(changes);
    for (const key of changedKeys) {
      currentSettings[key] = changes[key].newValue;
    }

    const enabledChanged = changedKeys.includes('enabled');
    const layoutChanged = changedKeys.some((key) => LAYOUT_SETTING_KEYS.has(key));
    if (enabledChanged) {
      syncPluginState();
    } else if (layoutChanged) {
      triggerLayoutUpdate();
    }
    if (changedKeys.includes('uiLang')) {
      updateCopyButtonLanguage();
      const wrapper = document.querySelector('.custom-subtitle-wrapper');
      if (wrapper) {
        setWrapperAiDisplayState(wrapper, wrapper.getAttribute('data-ai-state') || 'standby');
        updateLiveAsrIndicator(wrapper);
      }
    }

    if (changes.showTrans && trackMode === TRACK_MODE.FILE_READY) {
      pendingFileCueIndex = -1;
      renderedFileCueIndex = -1;
      renderFileCue();
    }
    if (changes.lang || changes.enabled || changes.aiEnabled || changes.aiProvider || changes.aiFallback) {
      lastText = ""; 
      lastMatchedSource = "";
      lastAiIndicatorSource = "";
      if (currentSettings.enabled) {
        preloadedTranslations.clear();
        translationSources.clear();
        aiTranslationOrigins.clear();
        settledAiTranslations.clear();
        resetAiTranslationScheduling();
        aiTranslationStates.clear();
        const wrapper = document.querySelector('.custom-subtitle-wrapper');
        if (wrapper) setWrapperAiDisplayState(wrapper, currentSettings.aiEnabled ? 'standby' : 'off');
        beginTrackLoad('settings changed');
      } else {
        cancelTrackLoad();
        stopFileRenderer();
        resetLiveAsrBuffer();
      }
    }
  });
} catch (e) {
  dieQuietly();
}

function syncPluginState() {
  if (isOrphaned || isSyncingPluginState) return;
  isSyncingPluginState = true;

  try {
    initCCButtonObserver();
    const shouldRun = currentSettings.enabled && isCCAvailable && isYouTubeWatchPage();

    document.body.setAttribute('data-yt-dual-sub-active', shouldRun ? 'true' : 'false');

    const wrapper = document.querySelector('.custom-subtitle-wrapper');
    if (!shouldRun) {
      loadingMessageVisible = false;
      setLiveAsrConfirmed(false);
      if (wrapper) wrapper.remove();
      if (flexyObserver) flexyObserver.disconnect();
      if (playerResizeObserver) playerResizeObserver.disconnect();

      if (observer) observer.disconnect();
      if (containerMonitor) clearInterval(containerMonitor);
      cancelTrackLoad();
      stopFileRenderer();
      resetLiveAsrBuffer();
      currentCaptionContainer = null;

      clearSubtitleContent();
      return;
    }

    triggerLayoutUpdate();
    startContainerMonitor();
    initLayoutObserver();
    initPlayerResizeObserver();
  } finally {
    isSyncingPluginState = false;
  }
}

function showLoadingMessage() {
  loadingMessageVisible = true;
  lastText = getLoadingMessage();
  lastMatchedSource = '';
  const wrapper = ensureSubtitleContainer();
  if (!wrapper) {
    setTimeout(() => {
      if (loadingMessageVisible && currentSettings.enabled && isCCAvailable && isYouTubeWatchPage() && !isOrphaned) {
        showLoadingMessage();
      }
    }, 150);
    return;
  }
  updateSubtitleContent('\u00A0', getSecondSubtitleStatusHtml(lastText), true);
  applyStylesToDOM();
}

function showYouTubeCaptionsDisabledMessage() {
  setLiveAsrConfirmed(false);
  cancelTrackLoad();
  stopFileRenderer();
  resetLiveAsrBuffer();
  hideLoadingMessage();
  trackMode = TRACK_MODE.WAITING_FOR_YOUTUBE_CAPTIONS;
  const message = getYouTubeCaptionsDisabledMessage();
  lastText = message;
  lastMatchedSource = '';
  updateSubtitleContent('\u00A0', getSecondSubtitleStatusHtml(message), true);
  applyStylesToDOM();
}

function hideLoadingMessage() {
  const wasVisible = loadingMessageVisible;
  loadingMessageVisible = false;
  if (!wasVisible) return;

  // showLoadingMessage() writes the status into the subtitle DOM. Clearing
  // only the boolean leaves that old text visible until another cue renders.
  clearSubtitleContent();
  applyStylesToDOM();
}

function getLayoutMode() {
  const watchFlexy = document.querySelector('ytd-watch-flexy');
  const moviePlayer = getMoviePlayerElement();
  const isFs = document.fullscreenElement != null || 
               (watchFlexy && watchFlexy.hasAttribute('fullscreen')) || 
               (moviePlayer && moviePlayer.classList.contains('ytp-fullscreen'));
  if (isFs) return 'fullscreen';
  if (watchFlexy && watchFlexy.hasAttribute('theater')) return 'theater';
  return 'default';
}

function getCopyUiText() {
  return copyUiText[currentSettings.uiLang] || copyUiText.en;
}

function getCurrentVideoId() {
  return new URLSearchParams(window.location.search).get('v') || '';
}

function cachePlayerSnapshotMetadata(snapshot) {
  const currentVideoId = getCurrentVideoId();
  if (!snapshot?.videoId || snapshot.videoId !== currentVideoId) return;

  const isSameVideo = currentVideoMetadata.videoId === snapshot.videoId;
  currentVideoMetadata = {
    videoId: snapshot.videoId,
    title: snapshot.videoTitle || (isSameVideo ? currentVideoMetadata.title : ''),
    publishDate: snapshot.publishDate || (isSameVideo ? currentVideoMetadata.publishDate : '')
  };
}

function resetCurrentVideoMetadata() {
  currentVideoMetadata = { videoId: getCurrentVideoId(), title: '', publishDate: '' };
}

function resetPlayerElementCache() {
  cachedMoviePlayerElement = null;
  cachedVideoElement = null;
}

function getMoviePlayerElement() {
  if (!cachedMoviePlayerElement?.isConnected) {
    cachedMoviePlayerElement = document.querySelector('#movie_player');
    cachedVideoElement = null;
  }
  return cachedMoviePlayerElement;
}

function getPlayerVideoElement() {
  const moviePlayer = getMoviePlayerElement();
  if (!moviePlayer) return null;

  const cachedVideoIsCurrent = cachedVideoElement?.isConnected &&
    cachedVideoElement.closest('#movie_player') === moviePlayer;
  if (!cachedVideoIsCurrent) {
    cachedVideoElement =
      moviePlayer.querySelector('video.html5-main-video') ||
      moviePlayer.querySelector('video');
  }
  return cachedVideoElement;
}

function getVisibleVideoTitle() {
  const selectors = [
    'ytd-watch-metadata h1 yt-formatted-string',
    'ytd-watch-metadata h1',
    '#above-the-fold #title h1 yt-formatted-string'
  ];

  for (const selector of selectors) {
    for (const titleNode of document.querySelectorAll(selector)) {
      const rect = titleNode.getBoundingClientRect();
      if (!rect.width || !rect.height) continue;
      const title = (titleNode.textContent || '').trim();
      if (title) return title;
    }
  }
  return '';
}

function getDateOnly(value) {
  const date = String(value || '').trim();
  const isoDate = date.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
  return isoDate || date;
}

function getCurrentVideoMetadata() {
  const videoId = getCurrentVideoId();
  const cached = currentVideoMetadata.videoId === videoId ? currentVideoMetadata : null;
  const visibleTitle = getVisibleVideoTitle();
  const metaTitle = document.querySelector('meta[name="title"], meta[property="og:title"]')?.content || '';
  const documentTitle = document.title.replace(/\s*-\s*YouTube\s*$/, '').trim();
  const metaDate = document.querySelector(
    'meta[itemprop="datePublished"], meta[itemprop="uploadDate"]'
  )?.content || '';

  return {
    videoId,
    title: visibleTitle || metaTitle || cached?.title || documentTitle,
    publishDate: getDateOnly(cached?.publishDate || metaDate)
  };
}

function getCurrentSourceSubtitle(wrapper = document.querySelector('.custom-subtitle-wrapper')) {
  const text = wrapper?.querySelector('.custom-source-text')?.textContent || '';
  return text.replace(/\u00a0/g, ' ').trim();
}

function formatPlaybackTimestamp(seconds) {
  const totalSeconds = Math.max(0, Math.floor(Number(seconds) || 0));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const remainingSeconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
  }
  return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`;
}

function buildTimestampedSubtitle(sourceSubtitle) {
  const video = getPlayerVideoElement();
  return `[${formatPlaybackTimestamp(video?.currentTime)}]  ${sourceSubtitle}`;
}

function buildFullCopyText(sourceSubtitle) {
  const metadata = getCurrentVideoMetadata();
  const heading = metadata.title
    ? (metadata.publishDate ? `${metadata.title} (${metadata.publishDate})` : metadata.title)
    : '';
  const videoUrl = metadata.videoId
    ? `https://www.youtube.com/watch?v=${encodeURIComponent(metadata.videoId)}`
    : window.location.href;
  const timestampedSubtitle = buildTimestampedSubtitle(sourceSubtitle);

  const lines = [];
  if (heading) lines.push(heading);
  lines.push(videoUrl, '', timestampedSubtitle);
  return lines.join('\n');
}

async function writeTextToClipboard(text) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch (error) {
      // Fall through to the selection-based copy path below.
    }
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.setProperty('position', 'fixed', 'important');
  textarea.style.setProperty('left', '-9999px', 'important');
  textarea.style.setProperty('top', '0', 'important');
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  const copied = document.execCommand('copy');
  textarea.remove();
  if (!copied) throw new Error('Clipboard write was rejected');
}

function updateCopyButtonLanguage(wrapper = document.querySelector('.custom-subtitle-wrapper')) {
  const button = wrapper?.querySelector('.lasdoscas-copy-button');
  if (!button) return;

  const text = getCopyUiText();
  const label = button.getAttribute('data-copy-mode') === 'full' ? text.fullLabel : text.subtitleLabel;
  button.setAttribute('aria-label', button.classList.contains('is-copied') ? text.copied : label);
}

function updateCopyButtonIcon(wrapper = document.querySelector('.custom-subtitle-wrapper')) {
  if (isOrphaned) return;
  const button = wrapper?.querySelector('.lasdoscas-copy-button');
  const icon = button?.querySelector('.lasdoscas-copy-main-icon');
  if (!button || !icon || button.classList.contains('is-copied')) return;

  const useFullCopy = isShiftPressed;
  icon.src = chrome.runtime.getURL(useFullCopy ? 'copyfull48.svg' : 'copy48.svg');
  button.setAttribute('data-copy-mode', useFullCopy ? 'full' : 'subtitle');
  updateCopyButtonLanguage(wrapper);
}

function updateCopyAvailability(wrapper = document.querySelector('.custom-subtitle-wrapper')) {
  if (!wrapper) return;
  const isAvailable = !loadingMessageVisible && Boolean(getCurrentSourceSubtitle(wrapper));
  const button = wrapper.querySelector('.lasdoscas-copy-button');
  wrapper.setAttribute('data-copy-available', isAvailable ? 'true' : 'false');
  if (button) button.tabIndex = isAvailable ? 0 : -1;
}

function showCopySuccess(button) {
  clearTimeout(copyFeedbackTimer);
  button.classList.add('is-copied');
  button.setAttribute('aria-label', getCopyUiText().copied);
  copyFeedbackTimer = setTimeout(() => {
    button.classList.remove('is-copied');
    updateCopyButtonLanguage(button.closest('.custom-subtitle-wrapper'));
    updateCopyButtonIcon(button.closest('.custom-subtitle-wrapper'));
  }, COPY_FEEDBACK_DURATION_MS);
}

function showCopyFailure(button) {
  button.setAttribute('aria-label', getCopyUiText().failed);
  button.classList.remove('is-copy-error');
  void button.offsetWidth;
  button.classList.add('is-copy-error');
  setTimeout(() => {
    button.classList.remove('is-copy-error');
    updateCopyButtonLanguage(button.closest('.custom-subtitle-wrapper'));
  }, COPY_FEEDBACK_DURATION_MS);
}

async function copyCurrentSubtitle(event) {
  if (!checkContext() || isOrphaned) return;
  const button = event.currentTarget;
  const wrapper = button.closest('.custom-subtitle-wrapper');
  const sourceSubtitle = getCurrentSourceSubtitle(wrapper);
  if (!sourceSubtitle) return;

  const copyFullDetails = Boolean(event.shiftKey || isShiftPressed);
  const copyText = copyFullDetails
    ? buildFullCopyText(sourceSubtitle)
    : buildTimestampedSubtitle(sourceSubtitle);
  try {
    await writeTextToClipboard(copyText);
    showCopySuccess(button);
  } catch (error) {
    console.warn('lasDoscas: 无法写入剪贴板。', error);
    showCopyFailure(button);
  }
}

function bindCopyButton(wrapper) {
  const button = wrapper.querySelector('.lasdoscas-copy-button');
  if (!button) return;

  button.addEventListener('pointerdown', (event) => event.stopPropagation());
  button.addEventListener('dblclick', (event) => event.stopPropagation());
  button.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    copyCurrentSubtitle(event);
  });
  wrapper.addEventListener('pointerenter', (event) => {
    isShiftPressed = Boolean(event.shiftKey);
    updateCopyButtonIcon(wrapper);
  });
  updateCopyButtonLanguage(wrapper);
  updateCopyButtonIcon(wrapper);
  updateCopyAvailability(wrapper);
}

function bindAiToggleButton(wrapper) {
  const button = wrapper.querySelector('.lasdoscas-ai-indicator');
  if (!button) return;

  button.addEventListener('pointerdown', (event) => event.stopPropagation());
  button.addEventListener('dblclick', (event) => event.stopPropagation());
  button.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (button.disabled) return;

    const previousValue = currentSettings.aiEnabled;
    const nextValue = !previousValue;
    currentSettings.aiEnabled = nextValue;
    button.disabled = true;
    setWrapperAiDisplayState(wrapper, nextValue ? 'standby' : 'off');
    chrome.storage.local.set({ aiEnabled: nextValue }, () => {
      button.disabled = false;
      if (!chrome.runtime.lastError) return;
      currentSettings.aiEnabled = previousValue;
      setWrapperAiDisplayState(wrapper, previousValue ? aiIndicatorSessionState : 'off');
      console.warn('lasDoscas: 无法更新 AI 增强开关。', chrome.runtime.lastError);
    });
  });
}

document.addEventListener('keydown', (event) => {
  if (isOrphaned || event.key !== 'Shift' || isShiftPressed) return;
  isShiftPressed = true;
  updateCopyButtonIcon();
});

document.addEventListener('keyup', (event) => {
  if (isOrphaned || event.key !== 'Shift') return;
  isShiftPressed = false;
  updateCopyButtonIcon();
});

window.addEventListener('blur', () => {
  if (isOrphaned || !isShiftPressed) return;
  isShiftPressed = false;
  updateCopyButtonIcon();
});

function applyStylesToDOM() {
  if (isOrphaned) return;
  const wrapper = document.querySelector('.custom-subtitle-wrapper');
  if (!wrapper) return;

  const layoutMode = getLayoutMode();
  wrapper.setAttribute('data-layout-mode', layoutMode);
  const isFullscreen = (layoutMode === 'fullscreen');

  const sourceText = wrapper.querySelector('.custom-source-text');
  const transText = wrapper.querySelector('.custom-translated-text');

  let srcScale = parseFloat(isFullscreen ? currentSettings.fsSrcSize : currentSettings.srcSize);
  if (isNaN(srcScale)) srcScale = isFullscreen ? 1.15 : 0.75;
  
  let transScale = parseFloat(isFullscreen ? currentSettings.fsTransSize : currentSettings.transSize);
  if (isNaN(transScale)) transScale = isFullscreen ? 1.15 : 0.75;

  const needsAutoShadow = (isFullscreen && currentSettings.fsBgStyle === 'none');
  const autoShadowStyle = "0 2px 6px rgba(0,0,0,0.9), 0 0 2px rgba(0,0,0,1)";
  const autoStrokeStyle = "1.5px #0a192f"; 

  const isSrcBold = isFullscreen ? currentSettings.srcFsBold : currentSettings.srcNormalBold;
  const isTransBold = isFullscreen ? currentSettings.transFsBold : currentSettings.transNormalBold;
  const forceStatusLayout = loadingMessageVisible ||
    trackMode === TRACK_MODE.WAITING_FOR_YOUTUBE_CAPTIONS ||
    trackMode === TRACK_MODE.YOUTUBE_AUTO_TRANSLATE;

  if (sourceText) {
    sourceText.style.setProperty('font-family', currentSettings.font, 'important');
    sourceText.style.setProperty('color', currentSettings.srcColor, 'important');
    sourceText.style.setProperty('font-weight', isSrcBold ? '800' : '400', 'important'); 
    sourceText.style.setProperty('--user-scale', srcScale, 'important');
    sourceText.style.setProperty(
      'display',
      currentSettings.showSrc || forceStatusLayout ? 'block' : 'none',
      'important'
    );
    
    if (needsAutoShadow) {
      sourceText.style.setProperty('text-shadow', autoShadowStyle, 'important');
      sourceText.style.setProperty('-webkit-text-stroke', autoStrokeStyle, 'important');
      sourceText.style.setProperty('paint-order', 'stroke fill', 'important'); 
    } else {
      sourceText.style.setProperty('text-shadow', 'none', 'important');
      sourceText.style.setProperty('-webkit-text-stroke', '0px', 'important');
    }
  }

  if (transText) {
    transText.style.setProperty('font-family', currentSettings.font, 'important');
    transText.style.setProperty('color', currentSettings.transColor, 'important');
    transText.style.setProperty('font-weight', isTransBold ? '800' : '400', 'important'); 
    transText.style.setProperty('--user-scale', transScale, 'important');
    transText.style.setProperty(
      'display',
      currentSettings.showTrans || forceStatusLayout ? 'block' : 'none',
      'important'
    );
    
    if (needsAutoShadow) {
      transText.style.setProperty('text-shadow', autoShadowStyle, 'important');
      transText.style.setProperty('-webkit-text-stroke', autoStrokeStyle, 'important');
      transText.style.setProperty('paint-order', 'stroke fill', 'important');
    } else {
      transText.style.setProperty('text-shadow', 'none', 'important');
      transText.style.setProperty('-webkit-text-stroke', '0px', 'important');
    }
  }

  wrapper.setAttribute('data-fs-bg-style', currentSettings.fsBgStyle);
  
  if (isFullscreen) {
    if (currentSettings.fsBgStyle === 'none') {
      wrapper.style.setProperty('background', 'transparent', 'important');
      wrapper.style.setProperty('box-shadow', 'none', 'important');
    } else {
      const opacityVal = (parseInt(currentSettings.fsBgOpacity, 10) || 75) / 100;
      wrapper.style.setProperty('background', `rgba(31, 31, 31, ${opacityVal})`, 'important');
      wrapper.style.setProperty('box-shadow', currentSettings.fsBgStyle === 'fit' ? '0 4px 15px rgba(0, 0, 0, 0.4)' : '0 10px 30px rgba(0, 0, 0, 0.6)', 'important');
    }
  } else {
    wrapper.style.setProperty('background', '#1f1f1f', 'important');
    wrapper.style.setProperty('box-shadow', '0 4px 15px rgba(0, 0, 0, 0.3)', 'important');
  }
}

function updateWrapperVisibility() {
  if (isOrphaned) return;
  const wrapper = document.querySelector('.custom-subtitle-wrapper');
  if (!wrapper) return;
  const canRenderWithoutCc = trackMode === TRACK_MODE.FILE_READY ||
    trackMode === TRACK_MODE.LIVE_ASR ||
    trackMode === TRACK_MODE.RETRYABLE_ERROR ||
    trackMode === TRACK_MODE.WAITING_FOR_YOUTUBE_CAPTIONS ||
    trackMode === TRACK_MODE.YOUTUBE_AUTO_TRANSLATE;
  const isFullscreen = wrapper.getAttribute('data-layout-mode') === 'fullscreen';
  const keepIdleBackground = !isFullscreen &&
    currentSettings.enabled &&
    isCCAvailable &&
    isYouTubeWatchPage();
  
  const isEmpty = !lastText && !lastMatchedSource && !liveAsrConfirmed;
  const bothHidden = !loadingMessageVisible &&
    !currentSettings.showSrc &&
    !currentSettings.showTrans &&
    !liveAsrConfirmed &&
    trackMode !== TRACK_MODE.WAITING_FOR_YOUTUBE_CAPTIONS &&
    trackMode !== TRACK_MODE.YOUTUBE_AUTO_TRANSLATE;

  if (!keepIdleBackground && (
      bothHidden ||
      (!loadingMessageVisible && isEmpty) ||
      (!canRenderWithoutCc && !lastText && !lastMatchedSource && !loadingMessageVisible)
    )) {
    wrapper.style.setProperty('display', 'none', 'important');
  } else {
    if (isFullscreen && (currentSettings.fsBgStyle === 'none' || currentSettings.fsBgStyle === 'fit') && isEmpty) {
      wrapper.style.setProperty('display', 'none', 'important');
    } else {
      wrapper.style.removeProperty('display');
    }
  }
}

function ensureSubtitleContainer() {
  if (isOrphaned || !currentSettings.enabled || !isCCAvailable) return null;
  
  const watchFlexy = document.querySelector('ytd-watch-flexy');
  const moviePlayer = getMoviePlayerElement();
  if (!watchFlexy || !moviePlayer) return null;

  const layoutMode = getLayoutMode();
  let wrapper = document.querySelector('.custom-subtitle-wrapper');
  
  if (!wrapper) {
    wrapper = document.createElement('div');
    wrapper.className = 'custom-subtitle-wrapper';
    wrapper.setAttribute('role', 'status');
    wrapper.setAttribute('aria-live', 'polite');
    wrapper.setAttribute('aria-atomic', 'true');

    wrapper.innerHTML = `
      <button type="button" class="lasdoscas-ai-indicator" aria-pressed="false">
        <img class="lasdoscas-ai-off-icon" alt="" src="${chrome.runtime.getURL('ai_off.svg')}">
        <img class="lasdoscas-ai-loading-icon" alt="" src="${chrome.runtime.getURL('ai_loading.svg')}">
        <img class="lasdoscas-ai-standby-icon" alt="" src="${chrome.runtime.getURL('ai_standby.svg')}">
        <img class="lasdoscas-ai-ready-icon" alt="" src="${chrome.runtime.getURL('ai.svg')}">
        <span class="lasdoscas-ai-tooltip" role="tooltip"></span>
      </button>
      <div class="lasdoscas-live-asr-indicator" role="status" tabindex="-1"
           aria-hidden="true" aria-describedby="lasdoscas-live-asr-tooltip">
        <span class="lasdoscas-live-asr-dot" aria-hidden="true"></span>
        <span class="lasdoscas-live-asr-label"></span>
        <span id="lasdoscas-live-asr-tooltip" class="lasdoscas-live-asr-tooltip" role="tooltip"></span>
      </div>
      <div class="custom-source-text" dir="auto">&nbsp;</div>
      <div class="custom-translated-text" dir="auto">&nbsp;</div>
      <button type="button" class="lasdoscas-copy-button" data-copy-mode="subtitle" tabindex="-1">
        <span class="lasdoscas-copy-icon" aria-hidden="true">
          <img class="lasdoscas-copy-main-icon" alt="" src="${chrome.runtime.getURL('copy48.svg')}">
          <img class="lasdoscas-copy-check-icon" alt="" src="${chrome.runtime.getURL('check48.svg')}">
        </span>
      </button>
    `;
    wrapper.style.setProperty('color-scheme', 'only light', 'important');
    bindAiToggleButton(wrapper);
    bindCopyButton(wrapper);
  }

  if (layoutMode === 'fullscreen') {
    if (wrapper.parentNode !== moviePlayer) {
      moviePlayer.appendChild(wrapper);
    }
  } else if (layoutMode === 'theater') {
    const columns = document.querySelector('#columns');
    if (columns && columns.parentNode === watchFlexy) {
      if (columns.previousSibling !== wrapper) {
        watchFlexy.insertBefore(wrapper, columns);
      }
    }
  } else {
    const playerContainer = document.querySelector('#primary-inner #player');
    if (playerContainer && playerContainer.parentNode) {
      if (playerContainer.nextSibling !== wrapper) {
        playerContainer.parentNode.insertBefore(wrapper, playerContainer.nextSibling);
      }
    }
  }

  wrapper.setAttribute('dir', isRtlLanguage(currentSourceLang) ? 'rtl' : 'ltr');
  wrapper.setAttribute('data-layout-mode', layoutMode);
  wrapper.setAttribute('data-caption-flow', usesRollingAsrFlow() ? 'rolling' : 'stable');
  if (!currentSettings.aiEnabled) {
    setWrapperAiDisplayState(wrapper, 'off');
  } else {
    setWrapperAiDisplayState(
      wrapper,
      wrapper.getAttribute('data-ai-state') || getIdleAiDisplayState(wrapper) || 'standby'
    );
  }
  updateCopyButtonLanguage(wrapper);
  updateCopyAvailability(wrapper);
  updateLiveAsrIndicator(wrapper);
  return wrapper;
}

function executeLayoutRefresh() {
  if (isOrphaned || !currentSettings.enabled) return;
  ensureSubtitleContainer();
  applyStylesToDOM();
  updateWrapperVisibility();
  updateWrapperDimensions();
}

function triggerLayoutUpdate() {
  executeLayoutRefresh();
  setTimeout(executeLayoutRefresh, 150);
  setTimeout(executeLayoutRefresh, 400);
}

document.addEventListener('fullscreenchange', () => {
  if (!checkContext() || isOrphaned) return;
  triggerLayoutUpdate();
});

function initLayoutObserver() {
  if (flexyObserver) flexyObserver.disconnect();
  const watchFlexy = document.querySelector('ytd-watch-flexy');
  if (!watchFlexy) return;

  flexyObserver = new MutationObserver((mutations) => {
    if (isOrphaned) return;
    let needsUpdate = false;
    for (let mutation of mutations) {
      if (mutation.type === 'attributes' && (mutation.attributeName === 'theater' || mutation.attributeName === 'fullscreen')) {
        needsUpdate = true;
        break;
      }
    }
    if (needsUpdate) triggerLayoutUpdate();
  });
  flexyObserver.observe(watchFlexy, { attributes: true, attributeFilter: ['theater', 'fullscreen'] });
}

function usesRollingAsrFlow() {
  return trackMode === TRACK_MODE.LIVE_ASR ||
    (isAutoGenerated && trackMode !== TRACK_MODE.FILE_READY);
}

function getRollingCaptionLane(playerWidth) {
  if (playerWidth < 640) return { start: '12%', end: '3%' };
  if (playerWidth < 900) return { start: '18%', end: '4%' };
  return { start: '25%', end: '4%' };
}

function updateWrapperDimensions() {
  const wrapper = document.querySelector('.custom-subtitle-wrapper');
  const actualPlayer = getMoviePlayerElement();
  if (!wrapper || !actualPlayer || isOrphaned) return;

  const layoutMode = getLayoutMode(); 
  wrapper.setAttribute('data-layout-mode', layoutMode);

  const targetWidth = actualPlayer.getBoundingClientRect().width;
  const rollingLane = getRollingCaptionLane(targetWidth);
  
  const playerScale = calculatePlayerScale(targetWidth);
  
  wrapper.style.setProperty('--player-scale', playerScale, 'important');
  wrapper.style.setProperty('--rolling-caption-start', rollingLane.start, 'important');
  wrapper.style.setProperty('--rolling-caption-end', rollingLane.end, 'important');

  if (layoutMode === 'theater') {
    if (targetWidth > MIN_MEASURABLE_PLAYER_WIDTH_PX) {
      wrapper.style.setProperty('width', `${targetWidth}px`, 'important');
      wrapper.style.setProperty('max-width', `${targetWidth}px`, 'important');
    }
    wrapper.style.setProperty('margin', '8px auto 12px', 'important');
    wrapper.style.setProperty('border-radius', '8px', 'important');
  } else if (layoutMode === 'fullscreen') {
    if (usesRollingAsrFlow() && targetWidth > MIN_MEASURABLE_PLAYER_WIDTH_PX) {
      wrapper.style.setProperty('width', `${targetWidth * FULLSCREEN_WRAPPER_WIDTH_RATIO}px`, 'important');
      wrapper.style.setProperty('max-width', '85%', 'important');
      wrapper.style.removeProperty('inset-inline-start');
      wrapper.style.setProperty('left', '0', 'important');
      wrapper.style.setProperty('right', '0', 'important');
      wrapper.style.setProperty('margin', '0 auto', 'important');
    } else if (currentSettings.fsBgStyle === 'fit' || currentSettings.fsBgStyle === 'none') {
      wrapper.style.setProperty('width', 'fit-content', 'important');
      wrapper.style.setProperty('max-width', '85%', 'important');
      wrapper.style.removeProperty('inset-inline-start');
      wrapper.style.setProperty('left', '0', 'important');
      wrapper.style.setProperty('right', '0', 'important');
      wrapper.style.setProperty('margin', '0 auto', 'important');
    } else if (targetWidth > MIN_MEASURABLE_PLAYER_WIDTH_PX) {
      wrapper.style.setProperty('width', `${targetWidth * FULLSCREEN_WRAPPER_WIDTH_RATIO}px`, 'important');
      wrapper.style.setProperty('max-width', '100%', 'important');
      wrapper.style.removeProperty('inset-inline-start');
      wrapper.style.setProperty('left', '0', 'important');
      wrapper.style.setProperty('right', '0', 'important');
      wrapper.style.setProperty('margin', '0 auto', 'important');
    }
    wrapper.style.setProperty('border-radius', '8px', 'important');
  } else {
    wrapper.style.setProperty('width', '100%', 'important');
    wrapper.style.setProperty('max-width', '100%', 'important');
    wrapper.style.removeProperty('margin');
    wrapper.style.setProperty('border-radius', '8px', 'important'); 
  }
}

function initPlayerResizeObserver() {
  if (playerResizeObserver) playerResizeObserver.disconnect();

  const playerTarget = getMoviePlayerElement() || document.querySelector('ytd-watch-flexy');
  if (!playerTarget) {
    if (!isOrphaned) setTimeout(initPlayerResizeObserver, 500);
    return;
  }

  playerResizeObserver = new ResizeObserver(() => {
    if (isOrphaned) return;
    window.requestAnimationFrame(() => {
      if (isOrphaned) return;
      updateWrapperDimensions();
    });
  });

  playerResizeObserver.observe(playerTarget);
  const moviePlayer = getMoviePlayerElement();
  if (moviePlayer && moviePlayer !== playerTarget) {
    playerResizeObserver.observe(moviePlayer);
  }
}

function findPlayerSubtitleButton() {
  return document.querySelector(
    '.ytp-subtitles-button, ' +
    '#movie_player button[data-tooltip-target-id="ytp-subtitles-button"], ' +
    '#movie_player button[aria-label*="Subtitles"], ' +
    '#movie_player button[aria-label*="字幕"]'
  );
}

function getYouTubeCCEnabledFromButton() {
  const ccBtn = findPlayerSubtitleButton();
  if (!ccBtn) return null;
  const ariaPressed = ccBtn.getAttribute('aria-pressed');
  if (ariaPressed === 'true') return true;
  if (ariaPressed === 'false') return false;
  return null;
}

function setYouTubeCCEnabled(nextEnabled, reason = 'state changed') {
  if (typeof nextEnabled !== 'boolean' || nextEnabled === isYouTubeCCEnabled) return false;
  isYouTubeCCEnabled = nextEnabled;

  if (!currentSettings.enabled || !isCCAvailable || !isYouTubeWatchPage() || isOrphaned) {
    return true;
  }

  if (isYouTubeCCEnabled) beginTrackLoad(`YouTube captions enabled: ${reason}`);
  else showYouTubeCaptionsDisabledMessage();
  return true;
}

function cacheYouTubeCCEnabled(snapshot) {
  if (!snapshot?.videoId || snapshot.videoId !== getCurrentVideoId()) return false;
  return setYouTubeCCEnabled(snapshot.captionsEnabled, 'player snapshot');
}

function getCCAvailability() {
  if (!isYouTubeWatchPage()) return false;

  const ccBtn = findPlayerSubtitleButton();
  const isExplicitlyDisabled = Boolean(ccBtn && (
    ccBtn.disabled ||
    ccBtn.hasAttribute('disabled') ||
    ccBtn.getAttribute('aria-disabled') === 'true' ||
    ccBtn.classList.contains('ytp-button-disabled')
  ));
  if (isExplicitlyDisabled) return false;

  const currentVideoId = getCurrentVideoId();
  if (
    captionTrackAvailabilityVideoId === currentVideoId &&
    captionTrackAvailability !== null
  ) {
    return captionTrackAvailability;
  }

  // Until the player response identifies the current video's caption tracks,
  // keep both switches disabled instead of treating a visually present CC
  // button as proof that captions exist.
  return false;
}

function hasKnownCCAvailability() {
  return Boolean(
    getCurrentVideoId() &&
    captionTrackAvailabilityVideoId === getCurrentVideoId() &&
    captionTrackAvailability !== null
  );
}

function cacheCCAvailability(snapshot) {
  const currentVideoId = getCurrentVideoId();
  if (
    !snapshot?.captionTracksKnown ||
    !snapshot.videoId ||
    snapshot.videoId !== currentVideoId
  ) {
    return false;
  }

  captionTrackAvailabilityVideoId = snapshot.videoId;
  captionTrackAvailability = Number(snapshot.trackCount) > 0;
  updateCCAvailability();
  return true;
}

function resetCCAvailability() {
  captionTrackAvailabilityVideoId = getCurrentVideoId();
  captionTrackAvailability = null;
  isYouTubeCCEnabled = null;
  updateCCAvailability();
}

async function refreshCCAvailability() {
  const requestedVideoId = getCurrentVideoId();
  if (!requestedVideoId || !isYouTubeWatchPage()) {
    resetCCAvailability();
    return false;
  }

  const snapshot = await requestPlayerSnapshot();
  if (requestedVideoId !== getCurrentVideoId()) return false;
  cacheCCAvailability(snapshot);
  return getCCAvailability();
}

function updateCCAvailability() {
  const nextAvailability = getCCAvailability();
  const availabilityChanged = nextAvailability !== isCCAvailable;
  isCCAvailable = nextAvailability;

  if (playerPluginSwitch) {
    playerPluginSwitch.disabled = !isCCAvailable;
    const switchLabel = playerPluginSwitch.closest('.lasdoscas-player-switch');
    if (switchLabel) {
      switchLabel.classList.toggle('is-disabled', !isCCAvailable);
      switchLabel.setAttribute('aria-disabled', String(!isCCAvailable));
    }
  }

  if (availabilityChanged) {
    chrome.runtime.sendMessage({
      action: 'cc_availability_changed',
      ccAvailable: isCCAvailable
    }, () => {
      const suppressMessageError = chrome.runtime.lastError;
    });

    syncPluginState();
    if (isCCAvailable && currentSettings.enabled) {
      beginTrackLoad('caption availability changed');
    }
  }

  return isCCAvailable;
}

function getPlayerControlsContext() {
  const ccBtn = findPlayerSubtitleButton();
  const controls =
    ccBtn?.closest('.ytp-right-controls') ||
    document.querySelector('#movie_player .ytp-right-controls') ||
    ccBtn?.closest('.ytp-chrome-controls') ||
    ccBtn?.parentElement;
  return { ccBtn, controls };
}

function ensurePlayerPluginControl() {
  const { ccBtn, controls } = getPlayerControlsContext();
  if (!controls) return false;

  let control = controls.querySelector('.lasdoscas-player-control');
  if (!control) {
    control = document.createElement('div');
    control.className = 'lasdoscas-player-control';
    control.setAttribute('role', 'group');
    control.setAttribute('aria-label', 'lasDoscas controls');
    control.innerHTML = `
      <button type="button" class="lasdoscas-player-icon ytp-button" aria-label="lasDoscas settings" title="lasDoscas settings">
        <img alt="" src="${chrome.runtime.getURL('icon48.png')}">
      </button>
      <label class="lasdoscas-player-switch" title="Toggle lasDoscas subtitles">
        <input type="checkbox" aria-label="Toggle lasDoscas subtitles">
        <span></span>
      </label>
    `;
    ['pointerdown', 'mousedown', 'click', 'dblclick'].forEach((eventName) => {
      control.addEventListener(eventName, (event) => event.stopPropagation());
    });
    const iconButton = control.querySelector('.lasdoscas-player-icon');
    iconButton.addEventListener('click', () => {
      if (typeof toggleFullscreenSettings === 'function') toggleFullscreenSettings();
    });
    const input = control.querySelector('input');
    input.addEventListener('change', () => {
      if (isOrphaned) return;
      chrome.storage.local.set({ enabled: input.checked });
    });
    if (ccBtn && ccBtn.parentNode === controls) {
      controls.insertBefore(control, ccBtn.nextSibling);
    } else {
      controls.appendChild(control);
    }
  }

  playerPluginControl = control;
  playerPluginSwitch = control.querySelector('input');
  if (playerPluginSwitch) playerPluginSwitch.checked = Boolean(currentSettings.enabled);
  updateCCAvailability();
  return true;
}

function initCCButtonObserver() {
  if (ccButtonObserver) ccButtonObserver.disconnect();
  if (playerControlMonitor) clearInterval(playerControlMonitor);
  playerControlMonitor = null;
  if (!isYouTubeWatchPage()) {
    updateCCAvailability();
    return;
  }

  // YouTube can replace the entire chrome control tree without emitting a
  // navigation event. Keep a lightweight reconciliation pass so the plugin
  // switch is reattached after those player state changes as well.
  playerControlMonitor = setInterval(() => {
    if (document.hidden || !checkContext() || isOrphaned || !isYouTubeWatchPage()) return;
    if (!ensurePlayerPluginControl()) updateCCAvailability();
    const ccEnabled = getYouTubeCCEnabledFromButton();
    if (ccEnabled !== null) setYouTubeCCEnabled(ccEnabled, 'player control');
    if (!hasKnownCCAvailability()) refreshCCAvailability();
  }, 1000);

  refreshCCAvailability();

  if (!ensurePlayerPluginControl()) {
    updateCCAvailability();
    return;
  }

  const controls = playerPluginControl?.parentElement;
  if (!controls) return;
  ccButtonObserver = new MutationObserver((mutations) => {
    if (!checkContext() || isOrphaned) return;
    const ccBtn = findPlayerSubtitleButton();
    const shouldReconcile = mutations.some((mutation) =>
      mutation.type === 'childList' || mutation.target === ccBtn
    );
    if (!shouldReconcile) return;
    ensurePlayerPluginControl();
    const ccEnabled = getYouTubeCCEnabledFromButton();
    if (ccEnabled !== null) setYouTubeCCEnabled(ccEnabled, 'caption button');
  });
  ccButtonObserver.observe(controls, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['disabled', 'aria-disabled', 'aria-pressed', 'class']
  });
}

function updateSubtitleContent(source, translated, isHtmlFlag = false, translationSource = '', aiState = '') {
  if (isOrphaned) return;
  const wrapper = ensureSubtitleContainer();
  if (!wrapper) return;

  const sourceText = wrapper.querySelector('.custom-source-text');
  const transText = wrapper.querySelector('.custom-translated-text');

  if (sourceText) sourceText.textContent = source;
  if (transText) {
    if (isHtmlFlag && translated) {
        transText.innerHTML = translated;
    } else {
        transText.textContent = translated || "";
        if (!translated) transText.innerHTML = "&nbsp;";
    }
  }

  wrapper.setAttribute('data-translation-source', translationSource || '');
  if (String(source || '').trim()) {
    lastAiIndicatorSource = lastMatchedSource || source;
  }
  const resolvedAiState = aiState ||
    getAiDisplayState(source, translationSource) ||
    getIdleAiDisplayState(wrapper);
  setWrapperAiDisplayState(wrapper, resolvedAiState);

  updateCopyAvailability(wrapper);
  updateWrapperVisibility(); 
}

function clearSubtitleContent() {
  const wrapper = document.querySelector('.custom-subtitle-wrapper');
  if (!wrapper) return;
  
  lastText = loadingMessageVisible ? getLoadingMessage() : "";
  lastMatchedSource = "";

  const srcNode = wrapper.querySelector('.custom-source-text');
  const transNode = wrapper.querySelector('.custom-translated-text');
  
  if (srcNode) srcNode.innerHTML = "&nbsp;";
  if (transNode) {
    if (loadingMessageVisible) transNode.innerHTML = getSecondSubtitleStatusHtml(lastText);
    else transNode.innerHTML = "&nbsp;";
  }
  wrapper.setAttribute('data-translation-source', '');
  const idleAiState = getIdleAiDisplayState(wrapper);
  const retainedAiState = lastAiIndicatorSource
    ? getAiDisplayState(
        lastAiIndicatorSource,
        translationSources.get(lastAiIndicatorSource) || ''
      )
    : '';
  if (!idleAiState) {
    setWrapperAiDisplayState(wrapper, '');
  } else if (loadingMessageVisible) {
    setWrapperAiDisplayState(wrapper, idleAiState);
  } else {
    setWrapperAiDisplayState(wrapper, retainedAiState || idleAiState);
  }

  updateCopyAvailability(wrapper);
  updateWrapperVisibility();
}

function startContainerMonitor() {
  if (containerMonitor) clearInterval(containerMonitor);
  
  containerMonitor = setInterval(() => {
    if (!checkContext() || isOrphaned) {
      clearInterval(containerMonitor);
      return;
    }
    if (document.hidden) return;
    if (!currentSettings.enabled) return;
    
    const actualContainer = document.querySelector('.ytp-caption-window-container');
    
    if (actualContainer && actualContainer !== currentCaptionContainer) {
      currentCaptionContainer = actualContainer;
      bindMutationObserver(actualContainer);
    } else if (!actualContainer && currentCaptionContainer) {
      currentCaptionContainer = null;
      if (observer) observer.disconnect();
    }
  }, 1000);
}

let translateDebounceTimer = null;
let liveAsrPrefetchTimer = null;
let liveAsrCommitTimer = null;
let liveAsrClearTimer = null;
let liveAsrPendingText = '';
let liveAsrCommittedText = '';
let liveAsrRenderSequence = 0;

function normalizeCaptionText(text) {
  return (text || '')
    .replace(/>{2,}/g, ' ')
    .replace(/[\u200B-\u200F\u202A-\u202E\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function getNativeCaptionText(containerTarget) {
  const captionWindows = Array.from(containerTarget.querySelectorAll('.caption-window'));
  return normalizeCaptionText(captionWindows.map((captionWindow) => {
    const segments = Array.from(captionWindow.querySelectorAll('.ytp-caption-segment'));
    const joinChar = isSpaceDelimitedLang(currentSourceLang) ? ' ' : '';
    return segments.map((segment) => segment.textContent.trim()).join(joinChar);
  }).join(' '));
}

function getSecondSubtitleStatusHtml(message) {
  return `<span class="lasdoscas-status-message">${message}</span>`;
}

function getAutoGeneratedHintHtml() {
  if (!currentSettings.showTrans) return '';
  const promptMsg = getHintMessage(currentSettings.lang);
  return getSecondSubtitleStatusHtml(promptMsg);
}

function hasTerminalCaptionPunctuation(text) {
  return /[.!?。！？…؟۔।॥]+["'”’」』）)\]}】]*$/.test((text || '').trim());
}

const CAPTION_PERIOD_ABBREVIATIONS = new Set([
  'mr', 'mrs', 'ms', 'dr', 'prof', 'sr', 'jr', 'st', 'vs', 'etc',
  'e.g', 'i.e', 'a.m', 'p.m', 'cf', 'fig', 'no', 'vol', 'pp', 'inc',
  'ltd', 'co', 'dept', 'est', 'z.b', 'd.h', 'u.a', 'bzw', 'ca', 'nr',
  'abb', 'usw', 'u.s', 'mme', 'mlle', 'p.ex', 'sra', 'srta', 'dra',
  'ud', 'uds', 'p.ej'
]);
const sentenceSegmenters = new Map();

function getSentenceSegmenter(languageCode) {
  const locale = languageCode || 'en';
  const cacheKey = locale.toLowerCase();
  let segmenter = sentenceSegmenters.get(cacheKey);
  if (!segmenter) {
    segmenter = new Intl.Segmenter(locale, { granularity: 'sentence' });
    sentenceSegmenters.set(cacheKey, segmenter);
  }

  return segmenter;
}

function isLikelyFalsePeriodBoundary(sentenceText, fullText, boundaryEndIndex) {
  const sentence = normalizeCaptionText(sentenceText);
  const terminalMatch = sentence.match(/([.!?。！？…؟۔।॥]+)["'”’」』）)\]}】]*$/);
  if (!terminalMatch || terminalMatch[1] !== '.') return false;

  const nextText = fullText.slice(boundaryEndIndex).trimStart();
  if (!nextText) return false;
  const periodIndex = sentence.lastIndexOf('.');
  const beforePeriod = sentence.slice(0, periodIndex);
  const previousChar = beforePeriod.slice(-1);
  const nextChar = nextText[0];
  if (/\d/.test(previousChar) && /\d/.test(nextChar)) return true;

  const token = beforePeriod.split(/\s+/).pop()?.toLowerCase() || '';
  if (CAPTION_PERIOD_ABBREVIATIONS.has(token)) return true;
  if (/^[a-z]$/i.test(token) && /[\p{Lu}\p{Lt}]/u.test(nextChar)) return true;
  return /(?:[a-z]\.){2,}$/i.test(`${token}.`);
}

function splitCompletedCaptionSentences(text, languageCode = currentSourceLang) {
  const normalized = normalizeCaptionText(text);
  if (!normalized) return { completed: [], remainder: '' };

  let segments = [];
  try {
    if (typeof Intl?.Segmenter === 'function') {
      const segmenter = getSentenceSegmenter(languageCode);
      segments = Array.from(segmenter.segment(normalized), (entry) => ({
        text: entry.segment,
        startIndex: entry.index,
        endIndex: entry.index + entry.segment.length
      }));
    }
  } catch (error) {
    segments = [];
  }

  if (!segments.length) {
    const boundaryPattern = /(?:[!?。！？…؟۔।॥]+["'”’」』）)\]}】]*|\.+["'”’」』）)\]}】]*(?=\s|$))/gu;
    let startIndex = 0;
    let match;
    while ((match = boundaryPattern.exec(normalized))) {
      segments.push({
        text: normalized.slice(startIndex, match.index + match[0].length),
        startIndex,
        endIndex: match.index + match[0].length
      });
      startIndex = match.index + match[0].length;
    }
    if (startIndex < normalized.length) {
      segments.push({
        text: normalized.slice(startIndex),
        startIndex,
        endIndex: normalized.length
      });
    }
  }

  const completed = [];
  let consumedEndIndex = 0;
  let pendingSentenceText = '';
  for (const segment of segments) {
    const joinChar = pendingSentenceText && isSpaceDelimitedLang(languageCode) ? ' ' : '';
    pendingSentenceText = normalizeCaptionText(`${pendingSentenceText}${joinChar}${segment.text}`);
    const sentenceText = pendingSentenceText;
    if (!sentenceText || !hasTerminalCaptionPunctuation(sentenceText)) continue;
    if (isLikelyFalsePeriodBoundary(sentenceText, normalized, segment.endIndex)) continue;
    completed.push({ text: sentenceText, endIndex: segment.endIndex });
    consumedEndIndex = segment.endIndex;
    pendingSentenceText = '';
  }

  return {
    completed,
    remainder: normalizeCaptionText(normalized.slice(consumedEndIndex))
  };
}

function getCaptionDisplayPartCount(text, languageCode) {
  const normalized = normalizeCaptionText(text);
  if (!normalized) return 1;
  const maxChars = isSpaceDelimitedLang(languageCode)
    ? DISPLAY_MAX_CHARS
    : DISPLAY_MAX_COMPACT_CHARS;
  const { completed, remainder } = splitCompletedCaptionSentences(normalized, languageCode);
  const strongPartCount = completed.length + (remainder ? 1 : 0);
  return Math.min(
    DISPLAY_MAX_PARTS,
    Math.max(1, strongPartCount, Math.ceil(normalized.length / maxChars))
  );
}

function getCaptionDisplayPartCapacity(text, languageCode) {
  const normalized = normalizeCaptionText(text);
  if (!normalized) return 1;
  const unitCount = isSpaceDelimitedLang(languageCode)
    ? normalized.split(/\s+/).length
    : normalized.length;
  const minimumUnits = isSpaceDelimitedLang(languageCode)
    ? DISPLAY_MIN_WORDS_PER_PART
    : DISPLAY_MIN_COMPACT_CHARS_PER_PART;
  return Math.max(1, Math.floor(unitCount / minimumUnits));
}

function getCaptionDisplayBoundaries(text) {
  const boundaries = [];
  const punctuationPattern = /[.!?…。！？؟۔।॥]+["'”’」』）)\]}】]*|[,;:，；：、]+/gu;
  let match;
  while ((match = punctuationPattern.exec(text))) {
    const endIndex = match.index + match[0].length;
    if (endIndex >= text.length) continue;
    const prefix = text.slice(0, endIndex);
    const strong = hasTerminalCaptionPunctuation(prefix) &&
      !isLikelyFalsePeriodBoundary(prefix, text, endIndex);
    boundaries.push({ index: endIndex, weight: strong ? 2 : 1 });
  }

  for (let index = 1; index < text.length - 1; index += 1) {
    if (/\s/.test(text[index])) boundaries.push({ index: index + 1, weight: 0 });
  }
  return boundaries;
}

function getStrongCaptionBoundaryRatios(text, languageCode) {
  const normalized = normalizeCaptionText(text);
  if (!normalized) return [];
  const { completed, remainder } = splitCompletedCaptionSentences(normalized, languageCode);
  const boundaries = remainder ? completed : completed.slice(0, -1);
  return boundaries
    .map((sentence) => sentence.endIndex / normalized.length)
    .filter((ratio) => ratio > 0 && ratio < 1);
}

function splitCaptionIntoDisplayParts(text, languageCode, requestedPartCount, boundaryRatios = []) {
  const normalized = normalizeCaptionText(text);
  if (!normalized || requestedPartCount <= 1) return [normalized];

  const partCount = Math.min(requestedPartCount, DISPLAY_MAX_PARTS, normalized.length);
  const candidates = getCaptionDisplayBoundaries(normalized);
  const averagePartLength = normalized.length / partCount;
  const minimumPartLength = Math.max(4, Math.floor(averagePartLength * 0.35));
  const selectedBoundaries = [];
  let previousBoundary = 0;

  for (let partIndex = 1; partIndex < partCount; partIndex += 1) {
    const targetRatio = boundaryRatios[partIndex - 1] || partIndex / partCount;
    const targetIndex = Math.round(normalized.length * targetRatio);
    const maximumBoundary = normalized.length - minimumPartLength * (partCount - partIndex);
    const available = candidates.filter((candidate) =>
      candidate.index >= previousBoundary + minimumPartLength &&
      candidate.index <= maximumBoundary &&
      !selectedBoundaries.includes(candidate.index)
    );
    let selected = available.sort((left, right) => {
      const leftScore = Math.abs(left.index - targetIndex) +
        (1 - left.weight) * averagePartLength * 0.35;
      const rightScore = Math.abs(right.index - targetIndex) +
        (1 - right.weight) * averagePartLength * 0.35;
      return leftScore - rightScore;
    })[0];

    if (!selected) {
      const minimumBoundary = previousBoundary + minimumPartLength;
      selected = {
        index: Math.min(maximumBoundary, Math.max(minimumBoundary, targetIndex))
      };
    }
    selectedBoundaries.push(selected.index);
    previousBoundary = selected.index;
  }

  const parts = [];
  let startIndex = 0;
  [...selectedBoundaries, normalized.length].forEach((endIndex) => {
    const part = normalizeCaptionText(normalized.slice(startIndex, endIndex));
    if (part) parts.push(part);
    startIndex = endIndex;
  });
  return parts.length ? parts : [normalized];
}

function buildBilingualDisplayParts(sourceText, translation, cueDuration = Infinity) {
  const sourcePartCount = getCaptionDisplayPartCount(sourceText, currentSourceLang);
  const sourcePartCapacity = getCaptionDisplayPartCapacity(sourceText, currentSourceLang);
  const translationPartCapacity = translation
    ? getCaptionDisplayPartCapacity(translation, currentSettings.lang)
    : sourcePartCapacity;
  const durationPartCapacity = Number.isFinite(cueDuration)
    ? Math.max(1, Math.floor(cueDuration / DISPLAY_MIN_PART_DURATION_SECONDS))
    : DISPLAY_MAX_PARTS;
  const partCount = Math.min(
    DISPLAY_MAX_PARTS,
    sourcePartCount,
    sourcePartCapacity,
    durationPartCapacity
  );
  const sourceStrongRatios = getStrongCaptionBoundaryRatios(sourceText, currentSourceLang);
  const translationStrongRatios = translation
    ? getStrongCaptionBoundaryRatios(translation, currentSettings.lang)
    : [];
  // Character offsets are language-local: applying one language's sentence
  // ratio to the other can expose translated content before its source words.
  const sourceBoundaryRatios = sourceStrongRatios.length === partCount - 1
    ? sourceStrongRatios
    : [];
  const translationRequestedPartCount = Math.min(partCount, translationPartCapacity);
  const translationBoundaryRatios = translationStrongRatios.length === translationRequestedPartCount - 1
    ? translationStrongRatios
    : [];
  const sourceParts = splitCaptionIntoDisplayParts(
    sourceText,
    currentSourceLang,
    partCount,
    sourceBoundaryRatios
  );
  const rawTranslationParts = translation
    ? splitCaptionIntoDisplayParts(
        translation,
        currentSettings.lang,
        translationRequestedPartCount,
        translationBoundaryRatios
      )
    : [];
  const translationParts = rawTranslationParts.length
    ? Array.from({ length: partCount }, (_, index) => {
        const mappedIndex = Math.min(
          rawTranslationParts.length - 1,
          Math.floor(index * rawTranslationParts.length / partCount)
        );
        return rawTranslationParts[mappedIndex] || '';
      })
    : Array(partCount).fill('');

  return Array.from({ length: partCount }, (_, index) => ({
    source: sourceParts[index] || '',
    translation: translationParts[index] || ''
  }));
}

function getDisplayPartIndex(cue, displayParts, playbackTime) {
  if (displayParts.length <= 1 || cue.end <= cue.start) return 0;
  const progress = Math.max(0, Math.min(1, (playbackTime - cue.start) / (cue.end - cue.start)));
  const cueDuration = cue.end - cue.start;
  const elapsed = progress * cueDuration;
  const totalSourceLength = displayParts.reduce((total, part) => total + part.source.length, 0);
  if (!totalSourceLength) return Math.min(displayParts.length - 1, Math.floor(progress * displayParts.length));

  let consumedLength = 0;
  let previousBoundaryTime = 0;
  for (let index = 0; index < displayParts.length - 1; index += 1) {
    consumedLength += displayParts[index].source.length;
    const proportionalTime = cueDuration * consumedLength / totalSourceLength;
    const remainingParts = displayParts.length - index - 1;
    const earliestBoundary = previousBoundaryTime + DISPLAY_MIN_PART_DURATION_SECONDS;
    const latestBoundary = cueDuration - remainingParts * DISPLAY_MIN_PART_DURATION_SECONDS;
    const boundaryTime = Math.min(latestBoundary, Math.max(earliestBoundary, proportionalTime));
    if (elapsed < boundaryTime) return index;
    previousBoundaryTime = boundaryTime;
  }
  return displayParts.length - 1;
}

function getStableDisplayPart(displayParts, partIndex) {
  const currentPart = displayParts[partIndex] || { source: '', translation: '' };
  return currentPart;
}

function getRollingAsrDelta(previousText, nextText, useSpace) {
  const previous = normalizeCaptionText(previousText);
  const next = normalizeCaptionText(nextText);
  if (!previous) return next;
  if (!next || next === previous || previous.startsWith(next)) return '';
  if (next.startsWith(previous)) return normalizeCaptionText(next.slice(previous.length));

  if (useSpace) {
    const previousWords = previous.split(' ');
    const nextWords = next.split(' ');
    const maxOverlap = Math.min(previousWords.length, nextWords.length);
    for (let size = maxOverlap; size >= 1; size -= 1) {
      if (previousWords.slice(-size).join(' ') === nextWords.slice(0, size).join(' ')) {
        return normalizeCaptionText(nextWords.slice(size).join(' '));
      }
    }
  } else {
    const maxOverlap = Math.min(previous.length, next.length);
    for (let size = maxOverlap; size >= 2; size -= 1) {
      if (previous.slice(-size) === next.slice(0, size)) {
        return normalizeCaptionText(next.slice(size));
      }
    }
  }

  return next;
}

function renderLiveAsrContent(sourceText, translation, useHint, renderSequence, generation, translationSource = '') {
  if (renderSequence !== liveAsrRenderSequence || generation !== trackLoadGeneration) return;
  hideLoadingMessage();
  lastText = sourceText;
  lastMatchedSource = '';
  updateSubtitleContent(
    sourceText,
    useHint ? getAutoGeneratedHintHtml() : translation,
    useHint,
    useHint ? '' : translationSource
  );
}

function resetLiveAsrBuffer() {
  clearTimeout(liveAsrPrefetchTimer);
  clearTimeout(liveAsrCommitTimer);
  clearTimeout(liveAsrClearTimer);
  liveAsrPrefetchTimer = null;
  liveAsrCommitTimer = null;
  liveAsrClearTimer = null;
  liveAsrPendingText = '';
  liveAsrCommittedText = '';
  liveAsrRenderSequence += 1;
}

function translateLiveAsrSentence(sourceText, renderSequence, generation) {
  if (!currentSettings.showTrans) {
    renderLiveAsrContent(sourceText, '', false, renderSequence, generation);
    return;
  }

  const cachedTranslation = preloadedTranslations.get(sourceText);
  if (cachedTranslation) {
    if (currentSettings.aiEnabled && !isAiTranslationSource(translationSources.get(sourceText))) {
      startAiEnhancement(sourceText, generation);
    }
    renderLiveAsrContent(
      sourceText,
      cachedTranslation,
      false,
      renderSequence,
      generation,
      translationSources.get(sourceText) || ''
    );
    return;
  }

  ensureCueTranslation(sourceText, generation).then((translation) => {
    if (!translation || renderSequence !== liveAsrRenderSequence || generation !== trackLoadGeneration) return;
    renderLiveAsrContent(
      sourceText,
      translation,
      false,
      renderSequence,
      generation,
      translationSources.get(sourceText) || ''
    );
  });
}

function commitLiveAsrSentence(text = liveAsrPendingText) {
  const finalText = normalizeCaptionText(text);
  if (!finalText || finalText === liveAsrCommittedText) return;

  clearTimeout(liveAsrPrefetchTimer);
  liveAsrPrefetchTimer = null;
  liveAsrPendingText = '';
  const generation = trackLoadGeneration;
  liveAsrCommittedText = finalText;
  const renderSequence = ++liveAsrRenderSequence;
  translateLiveAsrSentence(finalText, renderSequence, generation);
}

function feedLiveAsrSnapshot(snapshot) {
  let nextText = normalizeCaptionText(snapshot);
  if (!nextText || nextText === liveAsrPendingText || nextText === liveAsrCommittedText) return;

  if (hasTerminalCaptionPunctuation(liveAsrCommittedText) &&
      nextText.startsWith(liveAsrCommittedText)) {
    nextText = normalizeCaptionText(nextText.slice(liveAsrCommittedText.length));
    if (!nextText) return;
  }

  clearTimeout(liveAsrCommitTimer);
  clearTimeout(liveAsrClearTimer);

  if (liveAsrPendingText && !nextText.startsWith(liveAsrPendingText)) {
    commitLiveAsrSentence(liveAsrPendingText);
  }

  liveAsrPendingText = nextText;
  if (hasTerminalCaptionPunctuation(nextText)) {
    commitLiveAsrSentence(nextText);
    return;
  }

  clearTimeout(liveAsrPrefetchTimer);
  liveAsrPrefetchTimer = setTimeout(() => {
    const candidate = normalizeCaptionText(liveAsrPendingText);
    if (!candidate || candidate !== liveAsrPendingText || !currentSettings.showTrans) return;
    if (currentSettings.aiFallback) {
      // Growing ASR snapshots are unstable. Only prefetch standard
      // translation here; the committed sentence is the first AI request.
      ensureCueTranslation(candidate, trackLoadGeneration, { skipAi: true });
    }
  }, LIVE_ASR_PREFETCH_MS);

  // YouTube ASR usually appends words every 50-250 ms. Waiting for a short
  // stable window turns the rolling word stream into one phrase update.
  liveAsrCommitTimer = setTimeout(() => {
    commitLiveAsrSentence(liveAsrPendingText);
  }, LIVE_ASR_COMMIT_STABILITY_MS);
}

function scheduleLiveAsrClear(containerTarget) {
  clearTimeout(liveAsrClearTimer);
  liveAsrClearTimer = setTimeout(() => {
    if (trackMode === TRACK_MODE.FILE_READY) return;
    if (!containerTarget.querySelector('.caption-window')) {
      resetLiveAsrBuffer();
      clearSubtitleContent();
    }
  }, 1400);
}

function sendTranslationRequest(action, text, lang = currentSettings.lang, options = {}) {
  return new Promise((resolve) => {
    if (!text || isOrphaned || !currentSettings.enabled) {
      resolve({ text: '', source: '' });
      return;
    }

    const finish = (response) => resolve({
      text: response?.translation?.trim() || '',
      source: response?.source || '',
      error: response?.error || '',
      cached: Boolean(response?.cached)
    });

    try {
      chrome.runtime.sendMessage({
        action,
        text,
        lang,
        sourceLang: currentSourceLang,
        priority: options.priority || ''
      }, (response) => {
        if (chrome.runtime.lastError) {
          if (chrome.runtime.lastError.message?.includes('Extension context invalidated')) dieQuietly();
          resolve({ text: '', source: '' });
          return;
        }
        finish(response);
      });
    } catch (error) {
      if (error.message?.includes('Extension context invalidated')) dieQuietly();
      resolve({ text: '', source: '' });
    }
  });
}

function requestTranslation(text, lang = currentSettings.lang) {
  return sendTranslationRequest('translate', text, lang);
}

function requestAiTranslation(text, lang = currentSettings.lang, priority = 'visible') {
  return sendTranslationRequest('translate_ai', text, lang, { priority });
}

function renderDomTranslationFallback(currentText) {
  if (currentText === lastText) return;

  clearTimeout(translateDebounceTimer);
  const cachedTranslation = preloadedTranslations.get(currentText);
  if (cachedTranslation) {
    if (currentSettings.aiEnabled) startAiEnhancement(currentText, trackLoadGeneration);
    hideLoadingMessage();
    lastText = currentText;
    lastMatchedSource = '';
    updateSubtitleContent(
      currentText,
      cachedTranslation,
      false,
      translationSources.get(currentText) || ''
    );
    return;
  }

  lastText = currentText;
  lastMatchedSource = '';
  const waitingForAi = currentSettings.aiEnabled && currentSettings.showTrans;
  if (waitingForAi) {
    hideLoadingMessage();
    updateSubtitleContent(currentText, '', false, '', 'standby');
  }

  translateDebounceTimer = setTimeout(async () => {
    const generation = trackLoadGeneration;
    const targetLang = currentSettings.lang;
    if (currentSettings.aiEnabled) startAiEnhancement(currentText, generation);
    if (currentSettings.aiEnabled && !currentSettings.aiFallback) return;
    const result = await requestTranslation(currentText, targetLang);
    if (!result.text || generation !== trackLoadGeneration || currentText !== lastText) return;

    if (!isAiTranslationSource(translationSources.get(currentText))) {
      preloadedTranslations.set(currentText, result.text);
      translationSources.set(currentText, result.source || 'standard');
      hideLoadingMessage();
      updateSubtitleContent(currentText, result.text, false, result.source || 'standard');
    }
  }, DOM_TRANSLATION_DEBOUNCE_MS);
}

function bindMutationObserver(containerTarget) {
  if (observer) observer.disconnect();
  if (!containerTarget) return;

  observer = new MutationObserver(() => {
    if (!checkContext() || isOrphaned) {
      observer.disconnect();
      return;
    }
    if (!currentSettings.enabled) return;

    // Authored captions can fall back to the native DOM while the downloadable
    // track is warming. FILE_READY takes over with the timestamped renderer
    // once the file is available.
    if (trackMode === TRACK_MODE.YOUTUBE_AUTO_TRANSLATE) return;

    if (trackMode === TRACK_MODE.FILE_READY) {
      renderFileCue();
      return;
    }

    const captionWindow = containerTarget.querySelector('.caption-window');
    if (!captionWindow) {
      if (liveAsrPendingText) commitLiveAsrSentence();
      scheduleLiveAsrClear(containerTarget);
      return;
    }

    const currentText = getNativeCaptionText(containerTarget);

    if (!currentText) {
      scheduleLiveAsrClear(containerTarget);
      return;
    }

    if (isAutoGenerated || trackMode === TRACK_MODE.LIVE_ASR) {
      feedLiveAsrSnapshot(currentText);
      return;
    }

    renderDomTranslationFallback(currentText);
  });

  observer.observe(containerTarget, { childList: true, subtree: true });
}

function handlePlayerBridgeMessage(event) {
  if (event.source !== window || event.origin !== window.location.origin) return;
  const message = event.data;
  if (!message || message.source !== PLAYER_BRIDGE_SOURCE) return;

  if (message.type === 'SNAPSHOT_RESPONSE') {
    const pendingRequest = bridgeRequests.get(message.requestId);
    if (!pendingRequest) return;
    clearTimeout(pendingRequest.timeoutId);
    bridgeRequests.delete(message.requestId);
    cachePlayerSnapshotMetadata(message.snapshot);
    cacheYouTubeCCEnabled(message.snapshot);
    cacheCCAvailability(message.snapshot);
    pendingRequest.resolve(message.snapshot || null);
    return;
  }

  if (message.type === 'TRACK_CHANGED') {
    cachePlayerSnapshotMetadata(message.snapshot);
    cacheCCAvailability(message.snapshot);
    cacheYouTubeCCEnabled(message.snapshot);
    if (!currentSettings.enabled || isOrphaned) return;
    // A track selection can briefly toggle YouTube's CC button while the
    // player swaps caption tracks. Do not discard the track change just
    // because that transient button state changed; only stop when CC is
    // actually off.
    if (message.snapshot?.captionsEnabled === false) return;
    const nextTrackKey = message.snapshot?.trackKey || '';
    if (nextTrackKey && nextTrackKey !== currentTrackKey) {
      beginTrackLoad('YouTube caption track changed');
    }
  }
}

window.addEventListener('message', handlePlayerBridgeMessage);

function requestPlayerSnapshot() {
  return new Promise((resolve) => {
    const requestId = `${Date.now()}-${++bridgeRequestSequence}`;
    const timeoutId = setTimeout(() => {
      bridgeRequests.delete(requestId);
      resolve(null);
    }, PLAYER_SNAPSHOT_TIMEOUT_MS);

    bridgeRequests.set(requestId, { resolve, timeoutId });
    window.postMessage({
      source: PLAYER_BRIDGE_SOURCE,
      type: 'REQUEST_SNAPSHOT',
      requestId
    }, window.location.origin);
  });
}

function cancelTrackLoad() {
  trackLoadGeneration += 1;
  autoTranslationWindowSequence += 1;
  autoTranslationWindowAnchor = -1;
  autoTranslationAiAnchorCueIndex = -1;
  clearTimeout(trackRetryTimer);
  clearTimeout(translateDebounceTimer);
  trackRetryTimer = null;
  translateDebounceTimer = null;
  if (trackAbortController) trackAbortController.abort();
  trackAbortController = null;
  inflightTranslations.clear();
  resetAiTranslationScheduling();
  subtitleCacheLoadPromise = null;
  clearTimeout(subtitleCacheSaveTimer);
  subtitleCacheSaveTimer = null;
}

function beginTrackLoad(reason = 'refresh') {
  if (isOrphaned || !currentSettings.enabled || !isCCAvailable || !isYouTubeWatchPage()) return;

  setLiveAsrConfirmed(false);

  const buttonState = getYouTubeCCEnabledFromButton();
  if (buttonState !== null) isYouTubeCCEnabled = buttonState;
  if (isYouTubeCCEnabled !== true) {
    showYouTubeCaptionsDisabledMessage();
    return;
  }

  cancelTrackLoad();
  stopFileRenderer();
  resetLiveAsrBuffer();

  const generation = trackLoadGeneration;
  trackMode = TRACK_MODE.DISCOVERING;
  isAutoGenerated = false;
  currentTrackKey = '';
  currentCueIndex = -1;
  preloadedTranslations.clear();
  translationSources.clear();
  aiTranslationOrigins.clear();
  settledAiTranslations.clear();
  resetAiTranslationScheduling();
  aiTranslationStates.clear();
  lastAiIndicatorSource = '';
  preloadedSentencesList = [];
  showLoadingMessage();

  console.log(`lasDoscas: 开始识别字幕轨道 (${reason})...`);
  preloadFullTrack(generation, 0);
}

function showYouTubeAutoTranslateWarning() {
  stopFileRenderer();
  resetLiveAsrBuffer();
  hideLoadingMessage();
  const message = getAutoTranslateSelectionMessage(currentSettings.lang);
  lastText = message;
  lastMatchedSource = '';
  updateSubtitleContent('\u00A0', getSecondSubtitleStatusHtml(message), true);
  applyStylesToDOM();
}

function scheduleTrackRetry(generation, attempt, terminalMode, reason) {
  if (generation !== trackLoadGeneration || isOrphaned || !currentSettings.enabled) return;

  if (attempt >= TRACK_RETRY_DELAYS_MS.length) {
    trackMode = terminalMode;
    if (terminalMode === TRACK_MODE.LIVE_ASR) confirmLiveAsrFallback();
    else setLiveAsrConfirmed(false);
    console.info(`lasDoscas: 字幕轨道预加载未完成，进入 ${terminalMode} 模式：${reason}`);
    // A failed track load must not leave the permanent loading banner up.
    // The native-caption observer can still provide the source line while
    // the retryable state is visible.
    hideLoadingMessage();
    updateWrapperVisibility();
    return;
  }

  const delay = TRACK_RETRY_DELAYS_MS[attempt];
  trackRetryTimer = setTimeout(() => preloadFullTrack(generation, attempt + 1), delay);
}

async function downloadCaptionJson3(trackUrl, signal, targetLang = '') {
  const url = new URL(trackUrl);
  url.searchParams.set('fmt', 'json3');
  if (targetLang) url.searchParams.set('tlang', targetLang);

  const timeoutController = new AbortController();
  const abortFromParent = () => timeoutController.abort();
  if (signal?.aborted) timeoutController.abort();
  else signal?.addEventListener('abort', abortFromParent, { once: true });
  const timeoutId = setTimeout(() => timeoutController.abort(), CAPTION_FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url.toString(), {
      signal: timeoutController.signal,
      credentials: 'include'
    });
    if (!response.ok) throw new Error(`字幕服务器返回 ${response.status}`);

    const text = await response.text();
    if (!text.trim()) throw new Error('字幕文件为空');

    let data;
    try {
      data = JSON.parse(text);
    } catch (error) {
      throw new Error('字幕文件不是有效的 JSON3');
    }

    if (!Array.isArray(data.events)) throw new Error('字幕文件不包含 events');
    return data;
  } catch (error) {
    if (error?.name === 'AbortError') throw new Error('字幕文件请求超时');
    throw error;
  } finally {
    clearTimeout(timeoutId);
    signal?.removeEventListener('abort', abortFromParent);
  }
}

async function downloadAndParseSubtitles(trackUrl, signal, options = {}) {
  const data = await downloadCaptionJson3(trackUrl, signal);

  const cues = [];
  const useSpace = isSpaceDelimitedLang(currentSourceLang);
  const mergeRolling = options.mergeRolling === true;

  // Manually authored tracks already carry deliberate cue boundaries. Keeping
  // those events intact prevents a translated track with different sentence
  // segmentation from shifting the visible source line onto the next cue.
  if (!mergeRolling) {
    data.events.forEach((event, eventIndex) => {
      if (!Array.isArray(event.segs)) return;
      const text = normalizeCaptionText(
        event.segs.map((segment) => segment.utf8 || '').join('').replace(/\n/g, ' ')
      );
      if (!text) return;
      const start = Number(event.tStartMs || 0) / 1000;
      const duration = Number(event.dDurationMs || 0) / 1000;
      cues.push({
        text,
        start,
        end: Math.max(start + Math.max(duration, 0.6), start + 0.6),
        eventStartIndex: eventIndex,
        eventEndIndex: eventIndex
      });
    });

    cues.sort((a, b) => a.start - b.start);
    cues.forEach((cue, index) => {
      const nextCue = cues[index + 1];
      if (nextCue && cue.end >= nextCue.start) {
        cue.end = Math.max(cue.start + 0.5, nextCue.start - 0.04);
      }
    });

    if (!cues.length) throw new Error('字幕文件没有可显示文本');
    return cues;
  }

  let buffer = '';
  let bufferStart = -1;
  let bufferEnd = -1;
  let bufferEventStartIndex = -1;
  let bufferEventEndIndex = -1;
  let previousEventText = '';
  let previousEventEnd = -1;

  const appendCue = (text, start, end, eventStartIndex, eventEndIndex) => {
    const finalText = normalizeCaptionText(text);
    if (finalText && start >= 0) {
      cues.push({
        text: finalText,
        start,
        end: Math.max(end, start + 0.6),
        eventStartIndex,
        eventEndIndex
      });
    }
  };

  const flushBuffer = () => {
    appendCue(
      buffer,
      bufferStart,
      Math.max(bufferEnd, bufferStart + 1.2),
      bufferEventStartIndex,
      bufferEventEndIndex
    );
    buffer = '';
    bufferStart = -1;
    bufferEnd = -1;
    bufferEventStartIndex = -1;
    bufferEventEndIndex = -1;
  };

  const flushCompletedSentences = () => {
    const originalBuffer = normalizeCaptionText(buffer);
    const { completed, remainder } = splitCompletedCaptionSentences(
      originalBuffer,
      currentSourceLang
    );
    if (!completed.length || bufferStart < 0) return;

    const originalStart = bufferStart;
    const originalEnd = Math.max(bufferEnd, originalStart + 0.6);
    const duration = originalEnd - originalStart;
    let sentenceStart = originalStart;

    completed.forEach((sentence) => {
      const boundaryRatio = Math.min(1, sentence.endIndex / Math.max(originalBuffer.length, 1));
      const sentenceEnd = Math.max(sentenceStart + 0.25, originalStart + duration * boundaryRatio);
      appendCue(
        sentence.text,
        sentenceStart,
        sentenceEnd,
        bufferEventStartIndex,
        bufferEventEndIndex
      );
      sentenceStart = sentenceEnd;
    });

    buffer = remainder;
    if (buffer) {
      bufferStart = Math.min(sentenceStart, originalEnd);
      bufferEventStartIndex = bufferEventEndIndex;
    } else {
      bufferStart = -1;
      bufferEnd = -1;
      bufferEventStartIndex = -1;
      bufferEventEndIndex = -1;
    }
  };

  data.events.forEach((event, eventIndex) => {
    if (!Array.isArray(event.segs)) return;
    const segmentText = normalizeCaptionText(
      event.segs.map((segment) => segment.utf8 || '').join('').replace(/\n/g, ' ')
    );
    if (!segmentText) return;

    const start = Number(event.tStartMs || 0) / 1000;
    const duration = Number(event.dDurationMs || 0) / 1000;
    const end = start + Math.max(duration, 0.6);
    const gap = bufferEnd >= 0 ? start - bufferEnd : 0;
    const startsNewSpeaker = event.segs.some((segment) =>
      segment.isSpeakerChange === 1 || /^>>/.test(segment.utf8 || '')
    );

    if (buffer && (gap > ASR_STRUCTURAL_GAP_SECONDS || startsNewSpeaker)) {
      flushBuffer();
      previousEventText = '';
      previousEventEnd = -1;
    }

    const overlapsPreviousEvent = previousEventEnd >= 0 && start <= previousEventEnd + 0.1;
    const textToAppend = overlapsPreviousEvent
      ? getRollingAsrDelta(previousEventText, segmentText, useSpace)
      : segmentText;
    previousEventText = segmentText;
    previousEventEnd = end;
    if (!textToAppend) {
      if (buffer) bufferEnd = Math.max(bufferEnd, end);
      return;
    }

    if (!buffer) {
      bufferStart = start;
      bufferEventStartIndex = eventIndex;
    }
    bufferEventEndIndex = eventIndex;
    buffer += `${buffer && useSpace ? ' ' : ''}${textToAppend}`;
    buffer = normalizeCaptionText(buffer);
    bufferEnd = Math.max(bufferEnd, end);
    flushCompletedSentences();

    const emergencyCharLimit = useSpace
      ? ASR_EMERGENCY_MAX_CHARS
      : ASR_EMERGENCY_MAX_COMPACT_CHARS;
    const bufferDuration = bufferStart >= 0 ? bufferEnd - bufferStart : 0;
    if (buffer && (buffer.length >= emergencyCharLimit ||
        bufferDuration >= ASR_EMERGENCY_MAX_DURATION_SECONDS)) {
      flushBuffer();
    }
  });
  flushBuffer();

  cues.sort((a, b) => a.start - b.start);
  cues.forEach((cue, index) => {
    const nextCue = cues[index + 1];
    if (nextCue && cue.end >= nextCue.start) cue.end = Math.max(cue.start + 0.5, nextCue.start - 0.04);
  });

  if (!cues.length) throw new Error('字幕文件没有可显示文本');
  return cues;
}

function seedTranslationsFromYouTubeTrack(sourceCues, translatedData, targetLang, rolling = isAutoGenerated) {
  if (!Array.isArray(translatedData?.events)) return 0;

  const useSpace = isSpaceDelimitedLang(targetLang);
  const mappedPairs = [];
  const sourceEventRangeCounts = new Map();
  if (rolling) {
    sourceCues.forEach((cue) => {
      const rangeKey = `${cue.eventStartIndex}:${cue.eventEndIndex}`;
      sourceEventRangeCounts.set(rangeKey, (sourceEventRangeCounts.get(rangeKey) || 0) + 1);
    });
  }
  const translatedEvents = translatedData.events.map((event, index) => {
    const start = Number(event?.tStartMs || 0) / 1000;
    const duration = Number(event?.dDurationMs || 0) / 1000;
    const text = Array.isArray(event?.segs)
      ? normalizeCaptionText(event.segs.map((segment) => segment.utf8 || '').join('').replace(/\n/g, ' '))
      : '';
    return { event, index, start, end: start + Math.max(duration, 0.6), text };
  });

  sourceCues.forEach((cue) => {
    if (cue.eventStartIndex < 0 || cue.eventEndIndex < cue.eventStartIndex) return;
    let candidates;
    if (rolling) {
      const rangeKey = `${cue.eventStartIndex}:${cue.eventEndIndex}`;
      if (sourceEventRangeCounts.get(rangeKey) !== 1) return;
      const translatedAnchor = translatedData.events[cue.eventStartIndex];
      const translatedAnchorStart = Number(translatedAnchor?.tStartMs || 0) / 1000;
      if (!translatedAnchor || Math.abs(translatedAnchorStart - cue.start) > 2.5) return;
      candidates = translatedEvents.filter(({ index }) =>
        index >= cue.eventStartIndex && index <= cue.eventEndIndex
      );
    } else {
      // Manual tracks may have a different event count/order after YouTube
      // generates the translated track. Match by cue time overlap first, then
      // fall back to the nearest translated event within a short tolerance.
      candidates = translatedEvents.filter(({ start, end, text }) =>
        text && start < cue.end + 0.12 && end > cue.start - 0.12
      );
      if (!candidates.length) {
        const nearest = translatedEvents
          .filter(({ text }) => text)
          .sort((a, b) => Math.abs(a.start - cue.start) - Math.abs(b.start - cue.start))[0];
        if (!nearest || Math.abs(nearest.start - cue.start) > 1.5) return;
        candidates = [nearest];
      }
    }

    let translatedText = '';
    for (const candidate of candidates) {
      const eventText = candidate.text;
      if (!eventText) continue;

      // Translated ASR tracks can also contain rolling snapshots. Keep the
      // expanded snapshot rather than appending the same words twice.
      if (translatedText && eventText.startsWith(translatedText)) {
        translatedText = eventText;
      } else if (!translatedText.endsWith(eventText)) {
        translatedText += `${translatedText && useSpace ? ' ' : ''}${eventText}`;
      }
    }

    translatedText = normalizeCaptionText(translatedText);
    if (rolling && translatedText) {
      const { completed, remainder } = splitCompletedCaptionSentences(translatedText, targetLang);
      if (completed.length !== 1 || remainder) return;
      translatedText = completed[0].text;
    }
    if (translatedText) {
      mappedPairs.push([cue.text, translatedText]);
    }
  });

  const sourcePrefix = (currentSourceLang || '').toLowerCase().split('-')[0];
  const targetPrefix = (targetLang || '').toLowerCase().split('-')[0];
  if (sourcePrefix !== targetPrefix && mappedPairs.length >= 3) {
    const identicalCount = mappedPairs.filter(([source, translation]) => source === translation).length;
    if (identicalCount / mappedPairs.length > 0.8) return 0;
  }

  mappedPairs.forEach(([source, translation]) => {
    if (isAiTranslationSource(translationSources.get(source))) return;
    preloadedTranslations.set(source, translation);
    translationSources.set(source, 'standard');
  });
  scheduleSubtitleTranslationCacheSave();
  return mappedPairs.length;
}

function waitForTranslationWarmup(translationPromise) {
  return Promise.race([
    translationPromise,
    new Promise((resolve) => setTimeout(() => resolve(null), YOUTUBE_TRANSLATION_WARMUP_MS))
  ]);
}

function getCueVisibleEnd(cueIndex) {
  const cue = preloadedSentencesList[cueIndex];
  if (!cue) return -1;
  const nextCue = preloadedSentencesList[cueIndex + 1];
  const extendedEnd = cue.end + 0.45;
  return nextCue
    ? Math.min(extendedEnd, nextCue.start - 0.01)
    : extendedEnd;
}

function findCueIndexAtTime(time) {
  if (!preloadedSentencesList.length || time < 0) return -1;

  const currentCue = preloadedSentencesList[currentCueIndex];
  if (currentCue && time >= currentCue.start && time <= getCueVisibleEnd(currentCueIndex)) {
    return currentCueIndex;
  }

  let low = 0;
  let high = preloadedSentencesList.length - 1;
  let candidate = -1;
  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    if (preloadedSentencesList[middle].start <= time) {
      candidate = middle;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }

  if (candidate < 0) return -1;
  const cue = preloadedSentencesList[candidate];
  return time <= getCueVisibleEnd(candidate) ? candidate : -1;
}

function findNextCueIndexAtTime(time) {
  const activeIndex = findCueIndexAtTime(time);
  if (activeIndex >= 0) return activeIndex;

  let low = 0;
  let high = preloadedSentencesList.length - 1;
  let candidate = -1;
  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    if (preloadedSentencesList[middle].start >= time) {
      candidate = middle;
      high = middle - 1;
    } else {
      low = middle + 1;
    }
  }
  return candidate;
}

function getTranslationRequestKey(sourceText, generation, lang = currentSettings.lang) {
  return `${generation}|${lang}|${sourceText}`;
}

function getAiRequestKey(sourceText, generation, lang = currentSettings.lang) {
  return `ai|${getTranslationRequestKey(sourceText, generation, lang)}`;
}

function getAiBatchContext(texts) {
  if (!texts.length || !preloadedSentencesList.length) return [];
  const firstIndex = preloadedSentencesList.findIndex((cue) => cue.text === texts[0]);
  if (firstIndex <= 0) return [];
  return Array.from(new Set(
    preloadedSentencesList
      .slice(Math.max(0, firstIndex - AI_TRANSLATION_CONTEXT_CUE_LIMIT), firstIndex)
      .map((cue) => cue.text)
      .filter(Boolean)
  ));
}

function buildAiBatchPayload(texts, contextTexts = getAiBatchContext(texts)) {
  const context = Array.from(new Set(contextTexts.filter(Boolean)))
    .slice(-AI_TRANSLATION_CONTEXT_CUE_LIMIT);
  return `${AI_BATCH_PAYLOAD_PREFIX}${JSON.stringify({
    c: context,
    i: texts.map((text, index) => [index, text])
  })}`;
}

function parseAiBatchResponse(responseText, texts) {
  const trimmed = String(responseText || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const objectStart = trimmed.indexOf('{');
  const objectEnd = trimmed.lastIndexOf('}');
  if (objectStart < 0 || objectEnd <= objectStart) return new Map();
  try {
    const parsed = JSON.parse(trimmed.slice(objectStart, objectEnd + 1));
    if (!Array.isArray(parsed?.i)) return new Map();
    const translations = new Map();
    parsed.i.forEach((item) => {
      if (!Array.isArray(item) || !Number.isInteger(item[0]) || item[0] < 0 ||
          item[0] >= texts.length || typeof item[1] !== 'string') return;
      const translation = item[1].trim();
      if (translation && !translations.has(item[0])) translations.set(item[0], translation);
    });
    return translations;
  } catch {
    return new Map();
  }
}

function getAppliedAiResult(sourceText) {
  const source = translationSources.get(sourceText);
  const text = preloadedTranslations.get(sourceText) || '';
  return text && isAiTranslationSource(source) ? { text, source, cached: false } : null;
}

function isAiRetryCoolingDown(requestKey) {
  const retryAt = failedAiTranslations.get(requestKey) || 0;
  if (retryAt > Date.now()) return true;
  failedAiTranslations.delete(requestKey);
  return false;
}

function markAiRetryFailure(sourceText, generation) {
  failedAiTranslations.set(
    getAiRequestKey(sourceText, generation),
    Date.now() + AI_TRANSLATION_RETRY_COOLDOWN_MS
  );
}

function applyAiTranslation(sourceText, result, generation) {
  if (!result?.text || !isAiTranslationSource(result.source) || generation !== trackLoadGeneration ||
      !currentSettings.enabled || !currentSettings.aiEnabled) return false;
  const origin = result.cached ? 'cache' : 'live';
  aiTranslationOrigins.set(sourceText, origin);
  failedAiTranslations.delete(getAiRequestKey(sourceText, generation));
  setAiIndicatorSessionState('enhanced', origin);
  preloadedTranslations.set(sourceText, result.text);
  translationSources.set(sourceText, result.source);
  aiTranslationStates.set(sourceText, 'enhanced');
  scheduleSubtitleTranslationCacheSave();
  if (trackMode === TRACK_MODE.FILE_READY && sourceText === lastMatchedSource) {
    renderFileCue();
  } else if (sourceText === lastText) {
    hideLoadingMessage();
    updateSubtitleContent(sourceText, result.text, false, result.source, 'enhanced');
  } else {
    setAiTranslationState(sourceText, 'enhanced');
  }
  return true;
}

function discardPendingAiPrefetch() {
  if (!pendingAiPrefetchJob) return;
  pendingAiPrefetchJob.texts.forEach((sourceText) => {
    queuedAiTranslations.delete(getAiRequestKey(sourceText, pendingAiPrefetchJob.generation));
  });
  pendingAiPrefetchJob.resolve([]);
  pendingAiPrefetchJob = null;
}

function resetAiTranslationScheduling() {
  discardPendingAiPrefetch();
  visibleAiGraceRequests.forEach((entry) => {
    clearTimeout(entry.timer);
    entry.resolve({ text: '', source: '' });
  });
  visibleAiGraceRequests.clear();
  if (pendingVisibleAiJob) pendingVisibleAiJob.resolve({ text: '', source: '' });
  activeAiPrefetchJob = null;
  activeVisibleAiJob = null;
  pendingVisibleAiJob = null;
  queuedAiTranslations.clear();
  failedAiTranslations.clear();
  aiIndicatorSessionState = 'standby';
  aiIndicatorSessionOrigin = '';
}

function removeFromPendingAiPrefetch(sourceText, generation) {
  const job = pendingAiPrefetchJob;
  if (!job || job.generation !== generation || !job.texts.includes(sourceText)) return false;
  job.texts = job.texts.filter((text) => text !== sourceText);
  queuedAiTranslations.delete(getAiRequestKey(sourceText, generation));
  if (!job.texts.length) {
    pendingAiPrefetchJob = null;
    job.resolve([]);
  }
  return true;
}

function maybeStartNextAiJob() {
  if (!activeVisibleAiJob && pendingVisibleAiJob) {
    const nextVisibleJob = pendingVisibleAiJob;
    pendingVisibleAiJob = null;
    runVisibleAiJob(nextVisibleJob);
    return;
  }
  if (!activeVisibleAiJob && !activeAiPrefetchJob && pendingAiPrefetchJob) {
    const nextPrefetchJob = pendingAiPrefetchJob;
    pendingAiPrefetchJob = null;
    runAiPrefetchJob(nextPrefetchJob);
  }
}

function refreshAiIndicatorSessionState() {
  if (aiIndicatorSessionState === 'enhanced') return;
  setAiIndicatorSessionState(
    activeVisibleAiJob || activeAiPrefetchJob ? 'processing' : 'standby'
  );
}

function runVisibleAiJob(job) {
  if (job.generation !== trackLoadGeneration || isOrphaned || !currentSettings.enabled) {
    job.resolve({ text: '', source: '' });
    return job.promise;
  }

  activeVisibleAiJob = job;
  setAiIndicatorSessionState('processing');
  setAiTranslationState(job.sourceText, 'processing');
  requestAiTranslation(
    job.sourceText,
    currentSettings.lang,
    'visible'
  ).then((result) => {
    if (applyAiTranslation(job.sourceText, result, job.generation)) {
      settledAiTranslations.add(job.requestKey);
    } else if (job.generation === trackLoadGeneration) {
      markAiRetryFailure(job.sourceText, job.generation);
      setAiTranslationState(job.sourceText, 'standby');
    }
    return result;
  }).catch(() => {
    if (job.generation === trackLoadGeneration) {
      markAiRetryFailure(job.sourceText, job.generation);
      setAiTranslationState(job.sourceText, 'standby');
    }
    return { text: '', source: '' };
  }).then((result) => {
    inflightAiTranslations.delete(job.requestKey);
    job.resolve(result);
    if (activeVisibleAiJob === job) {
      activeVisibleAiJob = null;
      maybeStartNextAiJob();
      refreshAiIndicatorSessionState();
    }
    return result;
  });
  inflightAiTranslations.set(job.requestKey, job.promise);
  return job.promise;
}

function waitForAiPrefetchOrPromote(sourceText, generation) {
  const requestKey = getAiRequestKey(sourceText, generation);
  if (visibleAiGraceRequests.has(requestKey)) return visibleAiGraceRequests.get(requestKey).promise;

  let resolveGrace;
  const entry = {
    promise: new Promise((resolve) => { resolveGrace = resolve; }),
    resolve: (result) => resolveGrace(result),
    timer: null
  };
  const finish = (result) => {
    if (visibleAiGraceRequests.get(requestKey) === entry) visibleAiGraceRequests.delete(requestKey);
    entry.resolve(result || { text: '', source: '' });
  };
  entry.timer = setTimeout(() => {
    const applied = getAppliedAiResult(sourceText);
    if (applied || generation !== trackLoadGeneration) {
      finish(applied);
      return;
    }

    const activeBatch = activeAiPrefetchJob?.generation === generation &&
      activeAiPrefetchJob.texts.includes(sourceText)
      ? activeAiPrefetchJob
      : null;
    if (activeBatch) {
      activeBatch.promise.then(() => {
        const activeResult = getAppliedAiResult(sourceText);
        if (activeResult) finish(activeResult);
        else Promise.resolve(startAiEnhancement(sourceText, generation, { immediate: true }))
          .then(finish, () => finish(null));
      });
      return;
    }

    removeFromPendingAiPrefetch(sourceText, generation);
    Promise.resolve(startAiEnhancement(sourceText, generation, { immediate: true }))
      .then(finish, () => finish(null));
  }, AI_VISIBLE_BATCH_GRACE_MS);
  visibleAiGraceRequests.set(requestKey, entry);
  return entry.promise;
}

function startAiEnhancement(sourceText, generation = trackLoadGeneration, options = {}) {
  if (!sourceText || !currentSettings.aiEnabled || !currentSettings.showTrans ||
      generation !== trackLoadGeneration) return null;
  if (isAiTranslationSource(translationSources.get(sourceText))) return null;
  if (sourceText.length > AI_TRANSLATION_MAX_CHARS) return null;
  const requestKey = getAiRequestKey(sourceText, generation);
  if (inflightAiTranslations.has(requestKey)) return inflightAiTranslations.get(requestKey);
  if (activeAiPrefetchJob?.generation === generation &&
      activeAiPrefetchJob.texts.includes(sourceText)) {
    return activeAiPrefetchJob.promise.then(() => getAppliedAiResult(sourceText) || { text: '', source: '' });
  }
  if (pendingVisibleAiJob?.requestKey === requestKey) return pendingVisibleAiJob.promise;
  if (settledAiTranslations.has(requestKey)) return null;
  if (isAiRetryCoolingDown(requestKey)) return null;

  if (!options.immediate && pendingAiPrefetchJob?.generation === generation &&
      pendingAiPrefetchJob.texts.includes(sourceText)) {
    return waitForAiPrefetchOrPromote(sourceText, generation);
  }

  // After the bounded grace period, a still-pending visible cue becomes a
  // dedicated high-priority request so seeks and cold starts remain responsive.
  removeFromPendingAiPrefetch(sourceText, generation);
  let resolveJob;
  const job = {
    sourceText,
    generation,
    requestKey,
    promise: new Promise((resolve) => { resolveJob = resolve; }),
    resolve: (result) => resolveJob(result)
  };
  if (!activeVisibleAiJob) return runVisibleAiJob(job);

  // Playback may advance faster than the provider's pacing window. Retain only
  // the newest visible cue instead of sending every transient cue to Gemini.
  if (pendingVisibleAiJob) {
    setAiTranslationState(pendingVisibleAiJob.sourceText, 'standby');
    pendingVisibleAiJob.resolve({ text: '', source: '' });
  }
  pendingVisibleAiJob = job;
  setAiTranslationState(sourceText, 'standby');
  return job.promise;
}

async function ensureCueTranslation(sourceText, generation = trackLoadGeneration, options = {}) {
  if (!sourceText) return '';
  if (preloadedTranslations.has(sourceText)) {
    const cachedTranslation = preloadedTranslations.get(sourceText);
    if (currentSettings.aiEnabled && !isAiTranslationSource(translationSources.get(sourceText))) {
      const canUseAi = !options.skipAi && sourceText.length <= AI_TRANSLATION_MAX_CHARS;
      const aiRequest = canUseAi ? startAiEnhancement(sourceText, generation) : null;
      if (!currentSettings.aiFallback && canUseAi) {
        return aiRequest?.then((result) => result?.text || '').catch(() => '') || '';
      }
    }
    return cachedTranslation;
  }
  const requestKey = getTranslationRequestKey(sourceText, generation);
  if (inflightTranslations.has(requestKey)) return inflightTranslations.get(requestKey);

  const aiRequest = currentSettings.aiEnabled && !options.skipAi
    ? startAiEnhancement(sourceText, generation)
    : null;
  if (currentSettings.aiEnabled && !currentSettings.aiFallback && !options.skipAi) {
    return aiRequest?.then((result) => result?.text || '').catch(() => '') || '';
  }

  const request = requestTranslation(sourceText).then((result) => {
    inflightTranslations.delete(requestKey);
    if (!result.text || generation !== trackLoadGeneration) return result.text || '';
    if (!isAiTranslationSource(translationSources.get(sourceText))) {
      preloadedTranslations.set(sourceText, result.text);
      translationSources.set(sourceText, result.source || 'standard');
      scheduleSubtitleTranslationCacheSave();
      if (sourceText === lastMatchedSource && trackMode === TRACK_MODE.FILE_READY) renderFileCue();
      else if (sourceText === lastText) {
        hideLoadingMessage();
        updateSubtitleContent(sourceText, result.text, false, result.source || 'standard');
      }
    }
    return preloadedTranslations.get(sourceText) || result.text;
  });
  inflightTranslations.set(requestKey, request);
  return request;
}

function displayFileCue(cueIndex, translation = '', playbackTime = null, options = {}) {
  const cue = preloadedSentencesList[cueIndex];
  if (!cue || cueIndex !== currentCueIndex || trackMode !== TRACK_MODE.FILE_READY) return;

  const translationSource = translationSources.get(cue.text) || '';
  const aiState = getAiDisplayState(cue.text, translationSource);
  const cacheKey = `${currentSourceLang}|${currentSettings.lang}|${translationSource}|${aiState}|${translation}`;
  const displayPartsChanged = cue.displayPartsCacheKey !== cacheKey;
  if (displayPartsChanged) {
    cue.displayPartsCacheKey = cacheKey;
    cue.displayParts = buildBilingualDisplayParts(cue.text, translation, cue.end - cue.start);
  }
  const effectivePlaybackTime = Number.isFinite(playbackTime)
    ? playbackTime
    : getPlayerVideoElement()?.currentTime ?? cue.start;
  const partIndex = getDisplayPartIndex(cue, cue.displayParts, effectivePlaybackTime);
  if (!displayPartsChanged && cueIndex === renderedFileCueIndex && partIndex === renderedFileCuePartIndex) {
    if (!options.keepPending) pendingFileCueIndex = -1;
    return;
  }
  const displayPart = getStableDisplayPart(cue.displayParts, partIndex);
  renderedFileCueIndex = cueIndex;
  renderedFileCuePartIndex = partIndex;
  if (!options.keepPending) pendingFileCueIndex = -1;
  hideLoadingMessage();
  lastMatchedSource = cue.text;
  lastText = displayPart.source;
  const waitingForAi = !displayPart.translation && currentSettings.aiEnabled && currentSettings.showTrans;
  updateSubtitleContent(
    displayPart.source,
    waitingForAi ? '' : displayPart.translation,
    false,
    translationSource,
    aiState
  );
}

function shouldRefreshVisibleFileAiLookahead(cueIndex, anchorCueIndex) {
  const refreshStride = Math.max(1, Math.floor(AI_TRANSLATION_BATCH_CUE_LIMIT / 2));
  return anchorCueIndex < 0 ||
    cueIndex < anchorCueIndex ||
    cueIndex >= anchorCueIndex + refreshStride;
}

function startVisibleFileAiWindow(cueIndex, generation = trackLoadGeneration) {
  if (!currentSettings.aiEnabled || !currentSettings.showTrans ||
      generation !== trackLoadGeneration || cueIndex < 0) return null;
  const visibleText = preloadedSentencesList[cueIndex]?.text;
  const visibleRequest = visibleText
    ? startAiEnhancement(visibleText, generation)
    : null;

  // Auto-generated tracks already have a time-based 60-second refill window.
  // Starting another sliding cue window here would duplicate that scheduler.
  if (isAutoGenerated) return visibleRequest;

  const shouldRefreshLookahead = shouldRefreshVisibleFileAiLookahead(
    cueIndex,
    visibleFileAiWindowAnchorCueIndex
  );
  if (!shouldRefreshLookahead) return visibleRequest;
  visibleFileAiWindowAnchorCueIndex = cueIndex;

  // Refill only after half the anchored window has been consumed. The visible
  // cue shares this prefetch when possible and only becomes a dedicated request
  // after its bounded grace period; a per-cue sliding window would otherwise
  // degenerate into one new provider request for every cue.
  const texts = [];
  const lookaheadEnd = preloadedSentencesList[cueIndex]?.start + AI_TRANSLATION_LOOKAHEAD_SECONDS;
  for (let index = cueIndex + 1;
       index < Math.min(cueIndex + 1 + AI_TRANSLATION_BATCH_CUE_LIMIT, preloadedSentencesList.length);
       index += 1) {
    if (preloadedSentencesList[index]?.start > lookaheadEnd) break;
    const text = preloadedSentencesList[index]?.text;
    if (!text || texts.includes(text) || isAiTranslationSource(translationSources.get(text)) ||
        settledAiTranslations.has(getAiRequestKey(text, generation)) ||
        queuedAiTranslations.has(getAiRequestKey(text, generation))) continue;
    texts.push(text);
  }
  const lookaheadRequest = startAiBatchEnhancement(texts, generation);
  return visibleRequest || lookaheadRequest;
}

function renderFileCue() {
  if (trackMode !== TRACK_MODE.FILE_READY || isOrphaned || !currentSettings.enabled) return;
  const video = getPlayerVideoElement();
  if (!video) return;

  const playbackTime = video.currentTime;
  if (isAutoGenerated && pendingFileCueIndex >= 0 && renderedFileCueIndex >= 0 &&
      pendingFileCueIndex !== renderedFileCueIndex) {
    const displayedCue = preloadedSentencesList[renderedFileCueIndex];
    if (displayedCue && playbackTime > getCueVisibleEnd(renderedFileCueIndex)) {
      renderedFileCueIndex = -1;
      renderedFileCuePartIndex = -1;
      clearSubtitleContent();
    }
  }

  const nextCueIndex = findCueIndexAtTime(playbackTime);
  if (nextCueIndex < 0) {
    if (isAutoGenerated) refreshAutoTranslationWindow(playbackTime);
    clearTimeout(fileCueTranslationGraceTimer);
    fileCueTranslationGraceTimer = null;
    clearTimeout(fileCueTranslationRetryTimer);
    fileCueTranslationRetryTimer = null;
    pendingFileCueIndex = -1;
    renderedFileCueIndex = -1;
    renderedFileCuePartIndex = -1;
    if (lastMatchedSource || lastText) clearSubtitleContent();
    currentCueIndex = -1;
    return;
  }

  currentCueIndex = nextCueIndex;
  const cue = preloadedSentencesList[nextCueIndex];
  if (currentSettings.aiEnabled) startVisibleFileAiWindow(nextCueIndex);
  if (isAutoGenerated) refreshAutoTranslationWindow(playbackTime);
  const translation = preloadedTranslations.get(cue.text);
  if (nextCueIndex === renderedFileCueIndex) {
    if (pendingFileCueIndex === nextCueIndex && !translation) return;
    displayFileCue(nextCueIndex, translation || '', playbackTime);
    return;
  }
  if (nextCueIndex === pendingFileCueIndex) return;

  clearTimeout(fileCueTranslationGraceTimer);
  fileCueTranslationGraceTimer = null;
  clearTimeout(fileCueTranslationRetryTimer);
  fileCueTranslationRetryTimer = null;
  pendingFileCueIndex = nextCueIndex;
  if (!currentSettings.showTrans) {
    displayFileCue(nextCueIndex, '', playbackTime);
    return;
  }

  if (translation) {
    displayFileCue(nextCueIndex, translation, playbackTime);
    return;
  }

  // Nearby cues are normally warm before playback reaches them. On a seek or
  // cache miss, allow the fast standard provider one short grace period so the
  // two rows can still paint together. The source is never held indefinitely.
  if (renderedFileCueIndex >= 0 && renderedFileCueIndex !== nextCueIndex) {
    clearSubtitleContent();
  }
  const translationRequest = ensureCueTranslation(cue.text);
  const finishPendingCue = () => {
    if (nextCueIndex !== currentCueIndex || pendingFileCueIndex !== nextCueIndex) return;
    const readyTranslation = preloadedTranslations.get(cue.text);
    if (readyTranslation) {
      clearTimeout(fileCueTranslationGraceTimer);
      fileCueTranslationGraceTimer = null;
      clearTimeout(fileCueTranslationRetryTimer);
      fileCueTranslationRetryTimer = null;
      displayFileCue(nextCueIndex, readyTranslation, getPlayerVideoElement()?.currentTime);
      return;
    }

    displayFileCue(nextCueIndex, '', getPlayerVideoElement()?.currentTime, { keepPending: true });
    clearTimeout(fileCueTranslationRetryTimer);
    fileCueTranslationRetryTimer = setTimeout(() => {
      if (nextCueIndex !== currentCueIndex || pendingFileCueIndex !== nextCueIndex) return;
      fileCueTranslationRetryTimer = null;
      pendingFileCueIndex = -1;
      renderFileCue();
    }, AUTO_FILE_TRANSLATION_RETRY_MS);
  };
  translationRequest.then(finishPendingCue);
  fileCueTranslationGraceTimer = setTimeout(() => {
    fileCueTranslationGraceTimer = null;
    finishPendingCue();
  }, FILE_CUE_TRANSLATION_GRACE_MS);
}

function startFileRenderer() {
  stopFileRenderer();
  renderFileCue();
  const renderInterval = isAutoGenerated ? AUTO_FILE_RENDER_INTERVAL_MS : FILE_RENDER_INTERVAL_MS;
  fileRendererTimer = setInterval(renderFileCue, renderInterval);
}

function stopFileRenderer() {
  if (fileRendererTimer) clearInterval(fileRendererTimer);
  clearTimeout(fileCueTranslationGraceTimer);
  fileCueTranslationGraceTimer = null;
  clearTimeout(fileCueTranslationRetryTimer);
  fileCueTranslationRetryTimer = null;
  fileRendererTimer = null;
  currentCueIndex = -1;
  pendingFileCueIndex = -1;
  renderedFileCueIndex = -1;
  renderedFileCuePartIndex = -1;
  visibleFileAiWindowAnchorCueIndex = -1;
}

async function translateBatch(batch, generation, options = {}) {
  if (!batch.length || generation !== trackLoadGeneration) return;
  const delimiter = '\n\n[[[LASDOSCAS_BREAK_9F2D]]]\n\n';
  let standardBatch = batch;
  // Start the enhancement request immediately. Google remains the first
  // visible provider, while Gemini can finish independently and take over.
  if (currentSettings.aiEnabled && options.enableAi !== false) {
    startAiBatchEnhancement(batch, generation);
    if (!currentSettings.aiFallback) {
      // Oversized single cues cannot safely enter an AI request. They retain
      // standard translation even in AI-only mode so subtitles never vanish.
      standardBatch = batch.filter((sourceText) => sourceText.length > AI_TRANSLATION_MAX_CHARS);
      if (!standardBatch.length) return;
    }
  }
  const result = await requestTranslation(standardBatch.join(delimiter));
  const translated = result.text;
  if (generation !== trackLoadGeneration) return;

  // An empty response is a failed request (commonly a 429). Splitting that
  // batch into individual cues would multiply the same failure many times.
  if (!translated && currentSettings.aiEnabled) return;

  const parts = translated
    ? translated.split(/\s*\[\[\[\s*LASDOSCAS_BREAK_9F2D\s*\]\]\]\s*/i)
    : [];

  if (parts.length === standardBatch.length) {
    standardBatch.forEach((sourceText, index) => {
      const translation = parts[index]?.trim();
      if (translation && !isAiTranslationSource(translationSources.get(sourceText))) {
        preloadedTranslations.set(sourceText, translation);
        translationSources.set(sourceText, result.source || 'standard');
        scheduleSubtitleTranslationCacheSave();
      }
    });
  } else {
    // Google occasionally translates or removes the delimiter. Retry this
    // batch in small groups so cue-to-translation mapping cannot shift.
    for (let i = 0; i < standardBatch.length; i += 3) {
      const group = standardBatch.slice(i, i + 3);
      await Promise.all(group.map((sourceText) => ensureCueTranslation(sourceText, generation, { skipAi: true })));
      if (generation !== trackLoadGeneration) return;
    }
  }

  const visibleTranslation = preloadedTranslations.get(lastMatchedSource);
  if (visibleTranslation && generation === trackLoadGeneration) {
    renderFileCue();
  }

}

function getAutoTranslationWindowTexts(playhead) {
  const nearestIndex = Math.max(0, findNextCueIndexAtTime(playhead));
  const windowEnd = playhead + AUTO_TRANSLATION_LOOKAHEAD_SECONDS;
  const windowTexts = [];

  for (let index = nearestIndex;
       index < preloadedSentencesList.length && windowTexts.length < AUTO_TRANSLATION_WINDOW_MAX_CUES;
       index += 1) {
    const cue = preloadedSentencesList[index];
    if (windowTexts.length && cue.start > windowEnd) break;
    if (!windowTexts.includes(cue.text)) windowTexts.push(cue.text);
  }

  return windowTexts;
}

async function translateAiBatchItems(texts, contextTexts, generation, allowRetry = true) {
  if (!texts.length || generation !== trackLoadGeneration) return [];
  texts.forEach((sourceText) => setAiTranslationState(sourceText, 'processing'));

  const result = await requestAiTranslation(
    buildAiBatchPayload(texts, contextTexts),
    currentSettings.lang,
    'prefetch'
  ).catch(() => ({ text: '', source: '' }));
  if (!result?.text || generation !== trackLoadGeneration || !isAiTranslationSource(result.source)) {
    if (generation === trackLoadGeneration) {
      texts.forEach((sourceText) => {
        markAiRetryFailure(sourceText, generation);
        setAiTranslationState(sourceText, 'standby');
      });
    }
    return [];
  }

  const translations = parseAiBatchResponse(result.text, texts);
  const successfulTexts = [];
  texts.forEach((sourceText, index) => {
    const translation = translations.get(index);
    if (!translation) {
      setAiTranslationState(sourceText, 'standby');
      return;
    }
    if (applyAiTranslation(
      sourceText,
      { text: translation, source: result.source, cached: result.cached },
      generation
    )) {
      settledAiTranslations.add(getAiRequestKey(sourceText, generation));
      successfulTexts.push(sourceText);
    }
  });

  const missingTexts = texts.filter((sourceText) => !successfulTexts.includes(sourceText));
  if (allowRetry && missingTexts.length && generation === trackLoadGeneration) {
    const retryTexts = missingTexts.slice(0, AI_BATCH_RETRY_CUE_LIMIT);
    const retrySuccesses = await translateAiBatchItems(
      retryTexts,
      getAiBatchContext(retryTexts),
      generation,
      false
    );
    successfulTexts.push(...retrySuccesses);
  }
  if (generation === trackLoadGeneration) {
    missingTexts
      .filter((sourceText) => !successfulTexts.includes(sourceText))
      .forEach((sourceText) => markAiRetryFailure(sourceText, generation));
  }
  console.debug('lasDoscas: AI batch mapping', {
    requested: texts.length,
    mapped: successfulTexts.length,
    retried: allowRetry ? Math.min(missingTexts.length, AI_BATCH_RETRY_CUE_LIMIT) : 0
  });
  return successfulTexts;
}

function runAiPrefetchJob(job) {
  if (job.generation !== trackLoadGeneration || isOrphaned || !currentSettings.enabled) {
    job.resolve([]);
    return job.promise;
  }

  activeAiPrefetchJob = job;
  setAiIndicatorSessionState('processing');
  job.texts.forEach((sourceText) => {
    queuedAiTranslations.delete(getAiRequestKey(sourceText, job.generation));
    setAiTranslationState(sourceText, 'processing');
  });
  const payload = buildAiBatchPayload(job.texts, job.contextTexts);
  const requestKey = `${getAiRequestKey(payload, job.generation)}|batch`;
  const request = translateAiBatchItems(
    job.texts,
    job.contextTexts,
    job.generation
  ).catch(() => {
    if (job.generation === trackLoadGeneration) {
      job.texts.forEach((sourceText) => {
        markAiRetryFailure(sourceText, job.generation);
        setAiTranslationState(sourceText, 'standby');
      });
    }
    return [];
  }).then((successfulTexts) => {
    inflightAiTranslations.delete(requestKey);
    job.resolve(successfulTexts);
    if (activeAiPrefetchJob === job) {
      activeAiPrefetchJob = null;
      maybeStartNextAiJob();
      refreshAiIndicatorSessionState();
    }
    return successfulTexts;
  });
  inflightAiTranslations.set(requestKey, request);
  return job.promise;
}

function startAiBatchEnhancement(
  batch,
  generation,
  options = {}
) {
  if (!batch.length || !currentSettings.aiEnabled || generation !== trackLoadGeneration) return null;

  const activeTexts = activeAiPrefetchJob?.generation === generation
    ? new Set(activeAiPrefetchJob.texts)
    : new Set();
  const texts = [];
  const contextTexts = options.contextTexts || getAiBatchContext(batch);
  for (const sourceText of batch) {
    if (!sourceText) continue;
    const requestKey = getAiRequestKey(sourceText, generation);
    const nextTexts = [...texts, sourceText];
    const nextLength = buildAiBatchPayload(nextTexts, contextTexts).length;
    if (texts.includes(sourceText) || sourceText.length > AI_TRANSLATION_MAX_CHARS ||
        texts.length >= AI_TRANSLATION_BATCH_CUE_LIMIT || nextLength > AI_TRANSLATION_MAX_CHARS ||
        isAiTranslationSource(translationSources.get(sourceText)) ||
        settledAiTranslations.has(requestKey) || isAiRetryCoolingDown(requestKey) ||
        inflightAiTranslations.has(requestKey) ||
        pendingVisibleAiJob?.requestKey === requestKey ||
        activeTexts.has(sourceText)) continue;
    texts.push(sourceText);
  }
  if (!texts.length) return null;
  if ((activeAiPrefetchJob || activeVisibleAiJob) && pendingAiPrefetchJob &&
      options.preservePending) {
    return pendingAiPrefetchJob.promise;
  }

  let resolveJob;
  const job = {
    texts,
    generation,
    contextTexts,
    promise: new Promise((resolve) => { resolveJob = resolve; }),
    resolve: (result) => resolveJob(result)
  };
  if (!activeAiPrefetchJob && !activeVisibleAiJob) return runAiPrefetchJob(job);

  // Keep only one not-yet-started lookahead job. Callers may preserve the
  // nearest pending window; explicit seeks discard stale future work first.
  discardPendingAiPrefetch();
  texts.forEach((sourceText) => queuedAiTranslations.add(getAiRequestKey(sourceText, generation)));
  pendingAiPrefetchJob = job;
  return job.promise;
}

function isAiTranslationScheduled(sourceText, generation) {
  const requestKey = getAiRequestKey(sourceText, generation);
  return inflightAiTranslations.has(requestKey) ||
    queuedAiTranslations.has(requestKey) ||
    activeVisibleAiJob?.requestKey === requestKey ||
    pendingVisibleAiJob?.requestKey === requestKey ||
    (activeAiPrefetchJob?.generation === generation &&
      activeAiPrefetchJob.texts.includes(sourceText)) ||
    (pendingAiPrefetchJob?.generation === generation &&
      pendingAiPrefetchJob.texts.includes(sourceText));
}

async function fillAutoTranslationWindow(generation, playhead, windowSequence) {
  const windowTexts = getAutoTranslationWindowTexts(playhead).filter((text) =>
    (currentSettings.aiEnabled
      ? !isAiTranslationSource(translationSources.get(text)) &&
        !settledAiTranslations.has(getAiRequestKey(text, generation)) &&
        !isAiTranslationScheduled(text, generation)
      : !preloadedTranslations.has(text)) &&
    !inflightTranslations.has(getTranslationRequestKey(text, generation))
  );

  if (currentSettings.aiEnabled) {
    // Only the nearest AI batch enters the bounded prefetch scheduler. Sending
    // the second half of a 24-cue window immediately used to replace the first
    // pending batch, so playback reached cues 1-12 before AI had touched them.
    startAiBatchEnhancement(
      windowTexts.slice(0, AI_TRANSLATION_BATCH_CUE_LIMIT),
      generation,
      { preservePending: true }
    );
    for (let index = 0; index < windowTexts.length; index += AI_TRANSLATION_BATCH_CUE_LIMIT) {
      if (generation !== trackLoadGeneration || windowSequence !== autoTranslationWindowSequence ||
          isOrphaned || !currentSettings.enabled) return;
      const batch = windowTexts.slice(index, index + AI_TRANSLATION_BATCH_CUE_LIMIT);
      const missingStandardTranslations = batch.filter((text) => !preloadedTranslations.has(text));
      await translateBatch(missingStandardTranslations, generation, { enableAi: false });
    }
    return;
  }

  for (let index = 0; index < windowTexts.length; index += AUTO_TRANSLATION_WINDOW_CONCURRENCY) {
    if (generation !== trackLoadGeneration || windowSequence !== autoTranslationWindowSequence ||
        isOrphaned || !currentSettings.enabled) return;
    const group = windowTexts.slice(index, index + AUTO_TRANSLATION_WINDOW_CONCURRENCY);
    await Promise.all(group.map((text) => ensureCueTranslation(text, generation)));
  }
}

function refreshAutoTranslationWindow(playhead, force = false) {
  if (!isAutoGenerated || !currentSettings.showTrans) return null;
  const nearestCueIndex = Math.max(0, findNextCueIndexAtTime(playhead));
  if (!force && autoTranslationWindowAnchor >= 0) {
    const anchorDistance = Math.abs(playhead - autoTranslationWindowAnchor);
    if (currentSettings.aiEnabled && autoTranslationAiAnchorCueIndex >= 0) {
      const cueProgress = nearestCueIndex - autoTranslationAiAnchorCueIndex;
      const refillStride = Math.max(1, Math.floor(AI_TRANSLATION_BATCH_CUE_LIMIT / 2));
      if (cueProgress >= 0 && cueProgress < refillStride &&
          anchorDistance < AUTO_TRANSLATION_LOOKAHEAD_SECONDS / 2) {
        return null;
      }
    } else if (anchorDistance < AUTO_TRANSLATION_WINDOW_REFRESH_SECONDS) {
      return null;
    }
  }

  const movedBeyondCurrentWindow = autoTranslationWindowAnchor >= 0 &&
    Math.abs(playhead - autoTranslationWindowAnchor) > AUTO_TRANSLATION_LOOKAHEAD_SECONDS;
  if (movedBeyondCurrentWindow) discardPendingAiPrefetch();
  autoTranslationWindowAnchor = playhead;
  autoTranslationAiAnchorCueIndex = currentSettings.aiEnabled ? nearestCueIndex : -1;
  const generation = trackLoadGeneration;
  const windowSequence = ++autoTranslationWindowSequence;
  const refillPromise = fillAutoTranslationWindow(generation, playhead, windowSequence);
  refillPromise.catch((error) => {
    if (generation === trackLoadGeneration) {
      console.info(`lasDoscas: 自动字幕滚动预翻译未完成：${error.message}`);
    }
  });
  return refillPromise;
}

async function warmAutoFileTranslations(generation) {
  if (!isAutoGenerated || !currentSettings.showTrans || generation !== trackLoadGeneration) return;
  const video = getPlayerVideoElement();
  const playhead = video?.currentTime || 0;
  const refillPromise = refreshAutoTranslationWindow(playhead, true);

  if (!refillPromise) return;
  await Promise.race([
    refillPromise,
    new Promise((resolve) => setTimeout(resolve, AUTO_FILE_WARMUP_TIMEOUT_MS))
  ]);
}

async function warmInitialFileTranslations(generation) {
  if (!currentSettings.showTrans || generation !== trackLoadGeneration) return;
  const video = getPlayerVideoElement();
  const nearestIndex = Math.max(0, findNextCueIndexAtTime(video?.currentTime || 0));
  const texts = Array.from(new Set(
    preloadedSentencesList
      .slice(nearestIndex, nearestIndex + INITIAL_TRANSLATION_LOOKAHEAD)
      .map((cue) => cue.text)
  )).filter((text) => !preloadedTranslations.has(text));
  if (!texts.length) return;

  const warmup = translateBatch(texts, generation, { enableAi: false });
  await Promise.race([
    warmup,
    new Promise((resolve) => setTimeout(resolve, AUTO_FILE_WARMUP_TIMEOUT_MS))
  ]);
}

function getPriorityFileTranslationTexts(playhead = getPlayerVideoElement()?.currentTime || 0) {
  const nearestIndex = Math.max(0, findNextCueIndexAtTime(playhead));
  const priorityCues = [
    ...preloadedSentencesList.slice(nearestIndex, nearestIndex + 24),
    ...preloadedSentencesList.slice(0, nearestIndex),
    ...preloadedSentencesList.slice(nearestIndex + 24)
  ];
  return Array.from(new Set(priorityCues.map((cue) => cue.text)));
}

function startInitialAuthoredFileAiWarmup(generation) {
  if (isAutoGenerated || !currentSettings.enabled || !currentSettings.aiEnabled ||
      !currentSettings.showTrans || generation !== trackLoadGeneration) return null;
  const initialCues = getPriorityFileTranslationTexts()
    .slice(0, AI_TRANSLATION_BATCH_CUE_LIMIT);
  return startAiBatchEnhancement(initialCues, generation);
}

async function preloadTranslations(generation) {
  const video = getPlayerVideoElement();
  const playhead = video?.currentTime || 0;
  const sourceSentences = getPriorityFileTranslationTexts(playhead);
  const batchSize = STANDARD_TRANSLATION_BATCH_SIZE;

  // Keep the first visible cues in one batch as well. Sending six individual
  // requests before the normal batches needlessly consumes RPM and can create
  // a burst when a new track is selected.
  const initialCues = sourceSentences.slice(
    0,
    currentSettings.aiEnabled ? AI_TRANSLATION_BATCH_CUE_LIMIT : INITIAL_TRANSLATION_LOOKAHEAD
  );
  if (currentSettings.aiEnabled) {
    // The AI batch started as soon as the source JSON3 and local cache were
    // ready. Keep warming any missing standard translations without awaiting AI.
    const missingStandardTranslations = initialCues.filter((text) =>
      !preloadedTranslations.has(text) &&
      !inflightTranslations.has(getTranslationRequestKey(text, generation))
    );
    await translateBatch(missingStandardTranslations, generation, { enableAi: false });
    // Remaining cues are translated on demand by renderFileCue(). Avoid
    // sending the entire authored subtitle track to the AI at startup.
    return;
  } else {
    const missingInitialCues = initialCues.filter((text) =>
      !preloadedTranslations.has(text) &&
      !inflightTranslations.has(getTranslationRequestKey(text, generation))
    );
    await Promise.all(missingInitialCues.map((text) => ensureCueTranslation(text, generation)));
  }

  const preloadStartIndex = 0;
  for (let index = preloadStartIndex; index < sourceSentences.length; index += batchSize) {
    if (generation !== trackLoadGeneration || isOrphaned || !currentSettings.enabled) return;
    const batch = sourceSentences
      .slice(index, index + batchSize)
      .filter((text) =>
        !preloadedTranslations.has(text) &&
        !inflightTranslations.has(getTranslationRequestKey(text, generation))
    );
    await translateBatch(batch, generation, {
      enableAi: currentSettings.aiEnabled
    });
    if (index + batchSize < sourceSentences.length) {
      await new Promise((resolve) => setTimeout(resolve, PRELOAD_BATCH_DELAY_MS));
    }
  }

  if (generation === trackLoadGeneration) {
    console.log('lasDoscas: 全片字幕翻译预加载完成。');
  }
}

async function preloadFullTrack(generation, attempt) {
  if (generation !== trackLoadGeneration || isOrphaned || !currentSettings.enabled) return;

  const snapshot = await requestPlayerSnapshot();
  if (generation !== trackLoadGeneration) return;

  if (snapshot?.captionsEnabled === false) {
    showYouTubeCaptionsDisabledMessage();
    return;
  }

  const selectedTrack = snapshot?.selectedTrack;
  currentTrackKey = snapshot?.trackKey || '';

  if (snapshot?.isAutoTranslated) {
    setLiveAsrConfirmed(false);
    trackMode = TRACK_MODE.YOUTUBE_AUTO_TRANSLATE;
    isAutoGenerated = false;
    preloadedTranslations.clear();
    translationSources.clear();
    aiTranslationOrigins.clear();
    settledAiTranslations.clear();
    resetAiTranslationScheduling();
    aiTranslationStates.clear();
    lastAiIndicatorSource = '';
    preloadedSentencesList = [];
    showYouTubeAutoTranslateWarning();
    console.info(
      `lasDoscas: 检测到 YouTube 自动翻译 (${snapshot.autoTranslationLanguageCode || 'unknown'})，等待用户选择原始字幕轨。`
    );
    return;
  }

  if (!selectedTrack) {
    const hasNativeCaptionDom = Boolean(document.querySelector('.ytp-caption-segment'));
    const terminalMode = hasNativeCaptionDom ? TRACK_MODE.RETRYABLE_ERROR : TRACK_MODE.NO_CAPTIONS;
    scheduleTrackRetry(generation, attempt, terminalMode, '播放器尚未提供字幕轨道');
    return;
  }

  currentSourceLang = selectedTrack.languageCode || 'en';
  isAutoGenerated = selectedTrack.kind === 'asr' || selectedTrack.vssId?.startsWith('a.');

  if (!selectedTrack.baseUrl) {
    scheduleTrackRetry(
      generation,
      attempt,
      isAutoGenerated ? TRACK_MODE.LIVE_ASR : TRACK_MODE.RETRYABLE_ERROR,
      '当前字幕轨道没有可下载 URL'
    );
    return;
  }

  // Suppress the DOM fallback while the source and translated files are being
  // fetched, otherwise the original line can paint before the warmup finishes.
  trackMode = TRACK_MODE.FILE_WARMING;

  try {
    trackAbortController = new AbortController();
    const youtubeTranslationPromise = currentSettings.showTrans
      ? downloadCaptionJson3(
          selectedTrack.baseUrl,
          trackAbortController.signal,
          currentSettings.lang
        ).catch((error) => {
          if (error.name !== 'AbortError') {
            console.info(`lasDoscas: YouTube 翻译轨不可用，已回退到逐句翻译：${error.message}`);
          }
          return null;
        })
      : Promise.resolve(null);

    const cues = await downloadAndParseSubtitles(
      selectedTrack.baseUrl,
      trackAbortController.signal,
      { mergeRolling: isAutoGenerated }
    );
    if (generation !== trackLoadGeneration) return;

    resetLiveAsrBuffer();
    preloadedSentencesList = cues;
    await loadSubtitleTranslationCache();
    if (generation !== trackLoadGeneration) return;

    // Use the standard-translation warmup time to get the first authored AI
    // batch in flight. This must not delay FILE_READY or the first subtitle.
    void startInitialAuthoredFileAiWarmup(generation);

    let youtubeTranslationApplied = false;
    const applyYouTubeTranslation = (translatedData) => {
      if (!translatedData || youtubeTranslationApplied || generation !== trackLoadGeneration) return 0;
      const mappedCount = seedTranslationsFromYouTubeTrack(
        cues,
        translatedData,
        currentSettings.lang,
        isAutoGenerated
      );
      youtubeTranslationApplied = mappedCount > 0;
      if (mappedCount > 0) {
        console.log(`lasDoscas: 已从 YouTube 翻译轨映射 ${mappedCount}/${cues.length} 条译文。`);
      }
      return mappedCount;
    };

    const warmTranslationData = await waitForTranslationWarmup(youtubeTranslationPromise);
    if (generation !== trackLoadGeneration) return;
    applyYouTubeTranslation(warmTranslationData);
    await warmInitialFileTranslations(generation);
    if (generation !== trackLoadGeneration) return;
    trackMode = TRACK_MODE.FILE_READY;
    setLiveAsrConfirmed(false);
    // The track is ready even when the playhead is between cues. Do not leave
    // the startup banner visible until the first caption becomes active.
    hideLoadingMessage();

    console.log(`lasDoscas: 已加载 ${cues.length} 条字幕，启用独立时间轴双语渲染。`);
    const video = getPlayerVideoElement();
    const initialCueIndex = findNextCueIndexAtTime(video?.currentTime || 0);
    if (initialCueIndex >= 0 && !preloadedTranslations.has(cues[initialCueIndex].text)) {
      ensureCueTranslation(cues[initialCueIndex].text, generation, { skipAi: currentSettings.aiEnabled });
    }
    startFileRenderer();
    if (isAutoGenerated) {
      warmAutoFileTranslations(generation).catch((error) => {
        if (generation === trackLoadGeneration) {
          console.info(`lasDoscas: AI 自动字幕预翻译未完成：${error.message}`);
        }
      });
    }
    if (!isAutoGenerated) preloadTranslations(generation);

    youtubeTranslationPromise.then((translatedData) => {
      if (!applyYouTubeTranslation(translatedData)) return;
      pendingFileCueIndex = -1;
      renderedFileCueIndex = -1;
      renderFileCue();
    });
  } catch (error) {
    if (error.name === 'AbortError' || generation !== trackLoadGeneration) return;
    trackMode = isAutoGenerated ? TRACK_MODE.LIVE_ASR : TRACK_MODE.DISCOVERING;
    scheduleTrackRetry(
      generation,
      attempt,
      isAutoGenerated ? TRACK_MODE.LIVE_ASR : TRACK_MODE.RETRYABLE_ERROR,
      error.message
    );
  }
}

setTimeout(() => {
  if (checkContext() && !isOrphaned && currentSettings.enabled && isYouTubeWatchPage()) {
    beginTrackLoad('initial load');
  }
}, 800);

window.addEventListener('yt-navigate-finish', () => {
  if (!checkContext() || isOrphaned) return;
  setLiveAsrConfirmed(false);
  resetPlayerElementCache();
  currentCaptionContainer = null;
  resetCurrentVideoMetadata();
  resetCCAvailability();

  const oldWrapper = document.querySelector('.custom-subtitle-wrapper');
  if (oldWrapper) oldWrapper.remove();
  syncPluginState();

  if (currentSettings.enabled && isYouTubeWatchPage()) {
    setTimeout(() => beginTrackLoad('YouTube navigation'), 200);
  }
});

loadAndApplySettings();

function toggleFullscreenSettings() {
  if (isOrphaned) return;

  const moviePlayer = getMoviePlayerElement();
  if (!moviePlayer) return;

  if (fullscreenSettingsIframe) {
    removeFullscreenSettings();
    return;
  }

  fullscreenSettingsIframe = document.createElement('iframe');
  fullscreenSettingsIframe.src = chrome.runtime.getURL('popup.html');
  fullscreenSettingsIframe.setAttribute('id', 'lasdoscas-fullscreen-iframe');
  
  fullscreenSettingsIframe.style.setProperty('position', 'absolute', 'important');
  fullscreenSettingsIframe.style.setProperty('top', '60px', 'important');
  fullscreenSettingsIframe.style.setProperty('right', '20px', 'important');
  fullscreenSettingsIframe.style.setProperty('width', '360px', 'important');

  fullscreenSettingsIframe.style.setProperty('height', '580px', 'important');
  
  fullscreenSettingsIframe.style.setProperty('border', 'none', 'important');
  fullscreenSettingsIframe.style.setProperty('z-index', '2147483647', 'important'); 
  fullscreenSettingsIframe.style.setProperty('border-radius', '12px', 'important');
  fullscreenSettingsIframe.style.setProperty('box-shadow', '0 12px 40px rgba(0, 0, 0, 0.6)', 'important');
  fullscreenSettingsIframe.style.setProperty('background', 'transparent', 'important');

  moviePlayer.appendChild(fullscreenSettingsIframe);
}

function removeFullscreenSettings() {
  if (fullscreenSettingsIframe) {
    fullscreenSettingsIframe.remove();
    fullscreenSettingsIframe = null;
  }
}

window.addEventListener('message', (event) => {
  if (isOrphaned) return;

  const expectedOrigin = chrome.runtime.getURL('').replace(/\/$/, '');
  if (event.origin !== expectedOrigin) {
    return;
  }
  
  if (event.data && event.data.action === "lasdoscas_resize") {
    if (fullscreenSettingsIframe) {
      const requestedHeight = Number(event.data.height);
      if (!Number.isFinite(requestedHeight) || requestedHeight <= 0) return;
      const moviePlayer = getMoviePlayerElement();
      let maxAllowedHeight = window.innerHeight * 0.9; 
      
      if (moviePlayer) {
        maxAllowedHeight = moviePlayer.clientHeight * 0.95;
      }
      
      const finalHeight = Math.max(120, Math.min(Math.ceil(requestedHeight), maxAllowedHeight));
      
      fullscreenSettingsIframe.style.setProperty('height', `${finalHeight}px`, 'important');
    }
  }
});

let isNativePopupActive = false;

chrome.runtime.onConnect.addListener((port) => {
  if (isOrphaned) return;
  
  if (port.name === "native_popup_active") {
    isNativePopupActive = true; 
    
    port.onDisconnect.addListener(() => {
      isNativePopupActive = false; 
    });
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (isOrphaned) return;
  
  if (message.action === "get_cc_availability") {
    refreshCCAvailability().then((ccAvailable) => {
      sendResponse({ ccAvailable });
    });
    return true;
  } else if (message.action === "toggle_settings_panel") {
    if (isNativePopupActive) return;
    toggleFullscreenSettings();
  } else if (message.action === "close_settings_panel") {
    removeFullscreenSettings();
  }
});
