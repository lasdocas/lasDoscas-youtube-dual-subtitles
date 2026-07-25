(() => {
  const BRIDGE_SOURCE = 'lasdoscas-player-bridge-v1';

  if (window.__lasDoscasPlayerBridgeInstalled) return;
  window.__lasDoscasPlayerBridgeInstalled = true;

  let lastVideoId = '';
  let lastActiveTrack = null;

  function safeVssId(track) {
    return track?.vssId || track?.vss_id || '';
  }

  function normalizeTrack(track) {
    if (!track) return null;
    return {
      baseUrl: track.baseUrl || '',
      kind: track.kind || '',
      languageCode: track.languageCode || '',
      name: track.name?.simpleText || track.name || '',
      vssId: safeVssId(track)
    };
  }

  function getLanguageCode(value) {
    if (typeof value === 'string') return value;
    return value?.languageCode || value?.language_code || '';
  }

  function hasTrackIdentity(track) {
    return Boolean(
      track && (
        safeVssId(track) ||
        track.languageCode ||
        track.baseUrl ||
        getLanguageCode(track.translationLanguage) ||
        getLanguageCode(track.translation_language) ||
        track.tlang
      )
    );
  }

  function getAutoTranslationState(activeTrack, selectedTrack) {
    if (!activeTrack) return { isAutoTranslated: false, languageCode: '' };

    let languageCode =
      getLanguageCode(activeTrack.translationLanguage) ||
      getLanguageCode(activeTrack.translation_language) ||
      getLanguageCode(activeTrack.translatedLanguage) ||
      activeTrack.translationLanguageCode ||
      activeTrack.translatedLanguageCode ||
      activeTrack.tlang ||
      '';

    if (!languageCode && activeTrack.baseUrl) {
      try {
        languageCode = new URL(activeTrack.baseUrl).searchParams.get('tlang') || '';
      } catch (error) {
        languageCode = '';
      }
    }

    const activeVssId = safeVssId(activeTrack);
    const selectedVssId = safeVssId(selectedTrack);
    const languageChangedOnSameTrack = Boolean(
      selectedTrack &&
      activeVssId &&
      activeVssId === selectedVssId &&
      activeTrack.languageCode &&
      selectedTrack.languageCode &&
      activeTrack.languageCode !== selectedTrack.languageCode
    );
    const explicitlyTranslated =
      activeTrack.isTranslated === true ||
      activeTrack.is_translated === true ||
      activeTrack.kind === 'translate';

    if (!languageCode && languageChangedOnSameTrack) {
      languageCode = activeTrack.languageCode;
    }

    return {
      isAutoTranslated: Boolean(languageCode || explicitlyTranslated || languageChangedOnSameTrack),
      languageCode
    };
  }

  function selectTrack(captionTracks, activeTrack) {
    if (!captionTracks.length) return null;

    const activeVssId = safeVssId(activeTrack);
    const activeLanguage = activeTrack?.languageCode || '';
    const activeKind = activeTrack?.kind || '';

    if (activeVssId) {
      const exact = captionTracks.find((track) => safeVssId(track) === activeVssId);
      if (exact) return exact;
    }

    if (activeLanguage) {
      const sameLanguageAndKind = captionTracks.find((track) =>
        track.languageCode === activeLanguage && (!activeKind || track.kind === activeKind)
      );
      if (sameLanguageAndKind) return sameLanguageAndKind;

      const sameLanguage = captionTracks.find((track) => track.languageCode === activeLanguage);
      if (sameLanguage) return sameLanguage;
    }

    const manualTrack = captionTracks.find((track) => {
      const vssId = safeVssId(track);
      return track.kind !== 'asr' && !vssId.startsWith('a.');
    });
    return manualTrack || captionTracks[0];
  }

  function getSnapshot() {
    const moviePlayer = document.querySelector('#movie_player');
    const pageVideoId = new URL(window.location.href).searchParams.get('v') || '';
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
    }

    let activeTrack = null;
    try {
      if (moviePlayer && typeof moviePlayer.getOption === 'function') {
        activeTrack = moviePlayer.getOption('captions', 'track');
      }
    } catch (error) {
      activeTrack = null;
    }

    // YouTube clears the active caption track when its native CC button is
    // switched off. Keep its identity for track selection, but report the
    // enabled state separately so the extension can ask the user to turn CC on.
    const ccButton = document.querySelector('.ytp-subtitles-button');
    const ariaPressed = ccButton?.getAttribute('aria-pressed');
    const captionsEnabled = ariaPressed === 'true' ||
      (ariaPressed !== 'false' && hasTrackIdentity(activeTrack));
    if (captionsEnabled) lastActiveTrack = activeTrack;
    const effectiveActiveTrack = captionsEnabled ? activeTrack : lastActiveTrack;
    const selectedTrack =
      selectTrack(captionTracks, effectiveActiveTrack) ||
      (hasTrackIdentity(lastActiveTrack) ? lastActiveTrack : null);
    const normalizedTrack = normalizeTrack(selectedTrack);
    const autoTranslation = getAutoTranslationState(effectiveActiveTrack, selectedTrack);
    const trackKey = normalizedTrack
      ? [
          videoId,
          normalizedTrack.languageCode,
          normalizedTrack.kind,
          normalizedTrack.vssId,
          captionsEnabled ? 'captions:on' : 'captions:off',
          autoTranslation.isAutoTranslated ? `auto-translate:${autoTranslation.languageCode || 'on'}` : 'source'
        ].join('|')
      : `${videoId}|none`;

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
  setInterval(() => {
    const snapshot = getSnapshot();
    if (!snapshot.videoId) return;

    if (lastTrackKey && snapshot.trackKey !== lastTrackKey) {
      window.postMessage({
        source: BRIDGE_SOURCE,
        type: 'TRACK_CHANGED',
        snapshot
      }, window.location.origin);
    }
    lastTrackKey = snapshot.trackKey;
  }, 1000);
})();
