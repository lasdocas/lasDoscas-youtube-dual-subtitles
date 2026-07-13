(() => {
  const BRIDGE_SOURCE = 'lasdoscas-player-bridge-v1';

  if (window.__lasDoscasPlayerBridgeInstalled) return;
  window.__lasDoscasPlayerBridgeInstalled = true;

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
    let playerResponse = null;

    try {
      if (moviePlayer && typeof moviePlayer.getPlayerResponse === 'function') {
        playerResponse = moviePlayer.getPlayerResponse();
      }
    } catch (error) {
      // The player can replace its API object during SPA navigation.
    }

    if (!playerResponse?.captions && window.ytInitialPlayerResponse?.captions) {
      playerResponse = window.ytInitialPlayerResponse;
    }

    const captionTracks =
      playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];

    let activeTrack = null;
    try {
      if (moviePlayer && typeof moviePlayer.getOption === 'function') {
        activeTrack = moviePlayer.getOption('captions', 'track');
      }
    } catch (error) {
      activeTrack = null;
    }

    const selectedTrack = selectTrack(captionTracks, activeTrack);
    const videoId =
      playerResponse?.videoDetails?.videoId ||
      new URL(window.location.href).searchParams.get('v') ||
      '';
    const normalizedTrack = normalizeTrack(selectedTrack);
    const autoTranslation = getAutoTranslationState(activeTrack, selectedTrack);
    const trackKey = normalizedTrack
      ? [
          videoId,
          normalizedTrack.languageCode,
          normalizedTrack.kind,
          normalizedTrack.vssId,
          autoTranslation.isAutoTranslated ? `auto-translate:${autoTranslation.languageCode || 'on'}` : 'source'
        ].join('|')
      : `${videoId}|none`;

    return {
      videoId,
      trackKey,
      selectedTrack: normalizedTrack,
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
