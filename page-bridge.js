(() => {
  const BRIDGE_SOURCE = 'lasdoscas-player-bridge-v1';

  if (window.__lasDoscasPlayerBridgeInstalled) return;
  window.__lasDoscasPlayerBridgeInstalled = true;

  let lastVideoId = '';
  let lastActiveTrack = null;
  let performanceCaptionRecoveryComplete = false;
  let observedCaptionRequestVideoId = '';
  let observedTranslationLanguageCode = '';
  let cachedMoviePlayer = null;
  let cachedSubtitleButton = null;

  function observeNativeCaptionRequest(input) {
    const rawUrl = typeof input === 'string' ? input : input?.url;
    if (!rawUrl) return false;

    let url;
    try {
      url = new URL(rawUrl, window.location.href);
    } catch (error) {
      return false;
    }
    if (!/\/api\/timedtext\/?$/i.test(url.pathname)) return false;

    const videoId = url.searchParams.get('v') || '';
    const pageVideoId = new URL(window.location.href).searchParams.get('v') || '';
    if (videoId && pageVideoId && videoId !== pageVideoId) return false;

    observedCaptionRequestVideoId = videoId || pageVideoId;
    observedTranslationLanguageCode = url.searchParams.get('tlang') || '';
    return true;
  }

  function syncObservedCaptionRequestFromPerformance() {
    if (performanceCaptionRecoveryComplete) return;
    performanceCaptionRecoveryComplete = true;
    let entries = [];
    try {
      entries = window.performance?.getEntriesByType?.('resource') || [];
    } catch (error) {
      return;
    }

    for (let index = entries.length - 1; index >= 0; index -= 1) {
      if (observeNativeCaptionRequest(entries[index]?.name)) return;
    }
  }

  function installNativeCaptionRequestObserver() {
    if (typeof window.fetch === 'function') {
      const nativeFetch = window.fetch;
      window.fetch = function (...args) {
        observeNativeCaptionRequest(args[0]);
        return nativeFetch.apply(this, args);
      };
    }

    const xhrPrototype = window.XMLHttpRequest?.prototype;
    if (xhrPrototype && typeof xhrPrototype.open === 'function') {
      const nativeOpen = xhrPrototype.open;
      xhrPrototype.open = function (method, url, ...rest) {
        observeNativeCaptionRequest(url);
        return nativeOpen.call(this, method, url, ...rest);
      };
    }
  }

  installNativeCaptionRequestObserver();

  function getMoviePlayerElement() {
    if (!cachedMoviePlayer?.isConnected) {
      cachedMoviePlayer = document.querySelector('#movie_player');
    }
    return cachedMoviePlayer;
  }

  function getSubtitleButtonElement() {
    if (!cachedSubtitleButton?.isConnected) {
      cachedSubtitleButton = document.querySelector('.ytp-subtitles-button');
    }
    return cachedSubtitleButton;
  }

  function safeVssId(track) {
    return track?.vssId || track?.vss_id || track?.captionTrackId || track?.id || '';
  }

  function getTrackLanguageCode(track) {
    return getLanguageCode(track?.language) ||
      track?.languageCode ||
      track?.language_code ||
      track?.lang ||
      '';
  }

  function normalizeTrack(track) {
    if (!track) return null;
    return {
      baseUrl: track.baseUrl || '',
      kind: track.kind || '',
      languageCode: getTrackLanguageCode(track),
      name: track.name?.simpleText || track.name || '',
      vssId: safeVssId(track)
    };
  }

  function getLanguageCode(value) {
    if (typeof value === 'string') return value;
    return value?.languageCode ||
      value?.language_code ||
      value?.id ||
      value?.code ||
      value?.value ||
      '';
  }

  function hasTrackIdentity(track) {
    return Boolean(
      track && (
        safeVssId(track) ||
        getTrackLanguageCode(track) ||
        track.baseUrl ||
        getLanguageCode(track.translationLanguage) ||
        getLanguageCode(track.translation_language) ||
        track.tlang
      )
    );
  }

  function getAutoTranslationState(
    activeTrack,
    selectedTrack,
    captionTracks = [],
    translationLanguage = null,
    captionRequestState = null
  ) {
    const optionLanguageCode = getLanguageCode(translationLanguage);
    const requestObserved = captionRequestState?.observed === true;
    const requestLanguageCode = requestObserved
      ? getLanguageCode(captionRequestState.languageCode)
      : '';
    if (!activeTrack && !optionLanguageCode && !requestLanguageCode) {
      return { isAutoTranslated: false, languageCode: '' };
    }

    const embeddedLanguageCode =
      getLanguageCode(activeTrack?.translationLanguage) ||
      getLanguageCode(activeTrack?.translation_language) ||
      getLanguageCode(activeTrack?.translatedLanguage) ||
      activeTrack?.translationLanguageCode ||
      activeTrack?.translatedLanguageCode ||
      activeTrack?.tlang ||
      '';
    let languageCode = requestObserved
      ? requestLanguageCode
      : optionLanguageCode || embeddedLanguageCode;

    if (!languageCode && activeTrack?.baseUrl) {
      try {
        languageCode = new URL(activeTrack.baseUrl).searchParams.get('tlang') || '';
      } catch (error) {
        languageCode = '';
      }
    }

    const activeVssId = safeVssId(activeTrack);
    const selectedVssId = safeVssId(selectedTrack);
    const activeLanguageCode = getTrackLanguageCode(activeTrack);
    const selectedLanguageCode = getTrackLanguageCode(selectedTrack);
    const sourceLanguageCode =
      activeTrack?.sourceLanguageCode ||
      activeTrack?.source_language_code ||
      activeTrack?.originalLanguageCode ||
      activeTrack?.original_language_code ||
      getTrackLanguageCode(activeTrack?.sourceTrack) ||
      getTrackLanguageCode(activeTrack?.captionTrack) ||
      '';
    const languageChangedOnSameTrack = Boolean(
      selectedTrack &&
      activeVssId &&
      activeVssId === selectedVssId &&
      activeLanguageCode &&
      selectedLanguageCode &&
      activeLanguageCode !== selectedLanguageCode
    );
    const languageChangedFromSource = Boolean(
      sourceLanguageCode &&
      activeLanguageCode &&
      sourceLanguageCode !== activeLanguageCode
    );
    const availableLanguages = new Set(
      captionTracks.map((track) => getTrackLanguageCode(track)).filter(Boolean)
    );
    const activeLanguageIsUnavailable = Boolean(
      captionTracks.length &&
      activeLanguageCode &&
      !availableLanguages.has(activeLanguageCode)
    );
    const explicitlyTranslated =
      Boolean(requestLanguageCode) ||
      (!requestObserved && Boolean(optionLanguageCode || embeddedLanguageCode)) ||
      activeTrack?.isTranslated === true ||
      activeTrack?.is_translated === true ||
      activeTrack?.isAutoTranslated === true ||
      activeTrack?.is_auto_translated === true ||
      activeTrack?.kind === 'translate';

    // YouTube can leave translationLanguage/tlang on the player option for a
    // moment after switching back to an authored track. If the active and
    // selected tracks agree on language, treat that stale metadata as source
    // subtitles instead of parking the extension in the auto-translate state.
    const selectedTrackIsManual = Boolean(
      selectedTrack &&
      selectedTrack.kind !== 'asr' &&
      !safeVssId(selectedTrack).startsWith('a.')
    );
    const staleTranslationMetadata = Boolean(
      requestObserved &&
      !requestLanguageCode &&
      selectedTrack &&
      activeLanguageCode &&
      selectedLanguageCode &&
      activeLanguageCode === selectedLanguageCode &&
      selectedTrackIsManual &&
      !explicitlyTranslated &&
      !languageChangedOnSameTrack &&
      !languageChangedFromSource &&
      !activeLanguageIsUnavailable
    );

    if (!languageCode && languageChangedOnSameTrack) {
      languageCode = activeLanguageCode;
    }
    if (!languageCode && (languageChangedFromSource || activeLanguageIsUnavailable)) {
      languageCode = activeLanguageCode;
    }

    return {
      isAutoTranslated: Boolean(
        explicitlyTranslated ||
        languageChangedOnSameTrack ||
        languageChangedFromSource ||
        activeLanguageIsUnavailable ||
        (languageCode && !staleTranslationMetadata)
      ),
      languageCode
    };
  }

  function selectTrack(captionTracks, activeTrack) {
    if (!captionTracks.length) return null;

    const activeVssId = safeVssId(activeTrack);
    const activeLanguage = getTrackLanguageCode(activeTrack);
    const activeKind = activeTrack?.kind || '';

    if (activeVssId) {
      const exact = captionTracks.find((track) => safeVssId(track) === activeVssId);
      if (exact) return exact;
    }

    if (activeLanguage) {
      const sameLanguageAndKind = captionTracks.find((track) =>
        getTrackLanguageCode(track) === activeLanguage && (!activeKind || track.kind === activeKind)
      );
      if (sameLanguageAndKind) return sameLanguageAndKind;

      const sameLanguage = captionTracks.find((track) => getTrackLanguageCode(track) === activeLanguage);
      if (sameLanguage) return sameLanguage;
    }

    const manualTrack = captionTracks.find((track) => {
      const vssId = safeVssId(track);
      return track.kind !== 'asr' && !vssId.startsWith('a.');
    });
    return manualTrack || captionTracks[0];
  }

  function getSnapshot(pageUrl = new URL(window.location.href)) {
    syncObservedCaptionRequestFromPerformance();
    const moviePlayer = getMoviePlayerElement();
    const pageVideoId = pageUrl.searchParams.get('v') || '';
    let playerResponse = null;

    try {
      if (moviePlayer && typeof moviePlayer.getPlayerResponse === 'function') {
        playerResponse = moviePlayer.getPlayerResponse();
      }
    } catch (error) {
      // The player can replace its API object during SPA navigation.
    }

    const initialPlayerResponse = window.ytInitialPlayerResponse;
    const initialResponseVideoId = initialPlayerResponse?.videoDetails?.videoId || '';
    if (
      !playerResponse?.captions &&
      initialPlayerResponse?.captions &&
      initialResponseVideoId === pageVideoId
    ) {
      playerResponse = window.ytInitialPlayerResponse;
    }

    const captionTracks =
      playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];

    const videoId =
      playerResponse?.videoDetails?.videoId ||
      pageVideoId ||
      '';
    const captionTracksKnown = Boolean(
      playerResponse?.videoDetails?.videoId &&
      playerResponse.videoDetails.videoId === videoId
    );
    const playerMicroformat = playerResponse?.microformat?.playerMicroformatRenderer;
    const videoTitle =
      playerResponse?.videoDetails?.title ||
      playerMicroformat?.title?.simpleText ||
      '';
    const publishDate = playerMicroformat?.publishDate || playerMicroformat?.uploadDate || '';
    if (videoId !== lastVideoId) {
      lastVideoId = videoId;
      lastActiveTrack = null;
      if (observedCaptionRequestVideoId !== videoId) {
        observedCaptionRequestVideoId = '';
        observedTranslationLanguageCode = '';
      }
    }

    let activeTrack = null;
    let translationLanguage = null;
    try {
      if (moviePlayer && typeof moviePlayer.getOption === 'function') {
        activeTrack = moviePlayer.getOption('captions', 'track');
      }
    } catch (error) {
      activeTrack = null;
    }
    try {
      if (moviePlayer && typeof moviePlayer.getOption === 'function') {
        translationLanguage = moviePlayer.getOption('captions', 'translationLanguage');
      }
    } catch (error) {
      translationLanguage = null;
    }

    // YouTube clears the active caption track when its native CC button is
    // switched off. Keep its identity for track selection, but report the
    // enabled state separately so the extension can ask the user to turn CC on.
    const ccButton = getSubtitleButtonElement();
    const ariaPressed = ccButton?.getAttribute('aria-pressed');
    const captionsEnabled = ariaPressed === 'true' ||
      (ariaPressed !== 'false' && hasTrackIdentity(activeTrack));
    if (captionsEnabled) lastActiveTrack = activeTrack;
    const effectiveActiveTrack = captionsEnabled ? activeTrack : lastActiveTrack;
    const selectedTrack =
      selectTrack(captionTracks, effectiveActiveTrack) ||
      (hasTrackIdentity(lastActiveTrack) ? lastActiveTrack : null);
    const normalizedTrack = normalizeTrack(selectedTrack);
    const autoTranslation = getAutoTranslationState(
      effectiveActiveTrack,
      selectedTrack,
      captionTracks,
      translationLanguage,
      {
        observed: observedCaptionRequestVideoId === videoId,
        languageCode: observedCaptionRequestVideoId === videoId
          ? observedTranslationLanguageCode
          : ''
      }
    );
    const autoTranslationKey = autoTranslation.isAutoTranslated
      ? `auto-translate:${autoTranslation.languageCode || 'on'}`
      : 'source';
    const trackKey = normalizedTrack
      ? [
          videoId,
          normalizedTrack.languageCode,
          normalizedTrack.kind,
          normalizedTrack.vssId,
          captionsEnabled ? 'captions:on' : 'captions:off',
          autoTranslationKey
        ].join('|')
      : `${videoId}|none|${captionsEnabled ? 'captions:on' : 'captions:off'}|${autoTranslationKey}`;

    return {
      videoId,
      videoTitle,
      publishDate,
      trackKey,
      selectedTrack: normalizedTrack,
      captionsEnabled,
      captionTracksKnown,
      trackCount: captionTracks.length,
      isAutoTranslated: autoTranslation.isAutoTranslated,
      autoTranslationLanguageCode: autoTranslation.languageCode
    };
  }

  window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    const message = event.data;
    if (!message || message.source !== BRIDGE_SOURCE || message.type !== 'REQUEST_SNAPSHOT') return;

    window.postMessage({
      source: BRIDGE_SOURCE,
      type: 'SNAPSHOT_RESPONSE',
      requestId: message.requestId,
      snapshot: getSnapshot()
    }, window.location.origin);
  });

  let lastTrackKey = '';
  function pollTrackChanges() {
    if (document.hidden) return;
    const pageUrl = new URL(window.location.href);
    if (pageUrl.pathname !== '/watch' || !pageUrl.searchParams.has('v')) {
      lastTrackKey = '';
      return;
    }

    const snapshot = getSnapshot(pageUrl);
    if (!snapshot.videoId) return;

    if (lastTrackKey && snapshot.trackKey !== lastTrackKey) {
      window.postMessage({
        source: BRIDGE_SOURCE,
        type: 'TRACK_CHANGED',
        snapshot
      }, window.location.origin);
    }
    lastTrackKey = snapshot.trackKey;
  }

  setInterval(pollTrackChanges, 1000);

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) pollTrackChanges();
  });

  window.addEventListener('yt-navigate-finish', () => {
    cachedMoviePlayer = null;
    cachedSubtitleButton = null;
  });
})();
