const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const bridgeSource = fs.readFileSync(
  path.resolve(__dirname, '..', 'page-bridge.js'),
  'utf8'
);

function createBridgeHarness({
  hidden = false,
  href = 'https://www.youtube.com/watch?v=abc',
  captionTracks: captionTracksOverride = null,
  resourceEntries = []
} = {}) {
  const windowListeners = new Map();
  const documentListeners = new Map();
  const postedMessages = [];
  const queryCounts = new Map();
  let intervalCallback = null;

  const selectedTrack = {
    baseUrl: 'https://www.youtube.com/api/timedtext?v=abc',
    kind: '',
    languageCode: 'en',
    name: { simpleText: 'English' },
    vssId: '.en'
  };
  const captionTracks = captionTracksOverride || [selectedTrack];
  let activeTrack = selectedTrack;
  let translationLanguage = null;
  const moviePlayer = {
    isConnected: true,
    getPlayerResponse: () => ({
      videoDetails: { videoId: 'abc', title: 'Test video' },
      captions: {
        playerCaptionsTracklistRenderer: { captionTracks }
      }
    }),
    getOption: (module, option) => {
      if (module === 'captions' && option === 'translationLanguage') return translationLanguage;
      return activeTrack;
    }
  };
  const ccButton = {
    isConnected: true,
    getAttribute: (name) => name === 'aria-pressed' ? 'true' : null
  };

  const document = {
    hidden,
    querySelector(selector) {
      queryCounts.set(selector, (queryCounts.get(selector) || 0) + 1);
      if (selector === '#movie_player') return moviePlayer;
      if (selector === '.ytp-subtitles-button') return ccButton;
      return null;
    },
    addEventListener(type, listener) {
      documentListeners.set(type, listener);
    }
  };
  const window = {
    fetch(input) {
      return Promise.resolve({ ok: true, input });
    },
    location: new URL(href),
    performance: {
      getEntriesByType(type) {
        return type === 'resource' ? resourceEntries : [];
      }
    },
    ytInitialPlayerResponse: null,
    addEventListener(type, listener) {
      windowListeners.set(type, listener);
    },
    postMessage(message) {
      postedMessages.push(message);
    }
  };
  const context = {
    console,
    document,
    Map,
    setInterval(callback, interval) {
      assert.equal(interval, 1000);
      intervalCallback = callback;
      return 1;
    },
    URL,
    window
  };
  vm.createContext(context);
  vm.runInContext(bridgeSource, context);

  return {
    document,
    documentListeners,
    getIntervalCallback: () => intervalCallback,
    getQueryCount: (selector) => queryCounts.get(selector) || 0,
    moviePlayer,
    requestCaption(url) { return context.window.fetch(url); },
    setActiveTrack(track) { activeTrack = track; },
    setTranslationLanguage(language) { translationLanguage = language; },
    postedMessages,
    window,
    windowListeners
  };
}

test('stale auto-translation metadata does not hide a selected authored track', () => {
  const harness = createBridgeHarness();
  harness.setActiveTrack({
    ...harness.moviePlayer.getOption(),
    tlang: 'es',
    translationLanguage: 'es'
  });
  harness.requestCaption('https://www.youtube.com/api/timedtext?v=abc&lang=en');
  harness.windowListeners.get('message')({
    source: harness.window,
    data: {
      source: 'lasdoscas-player-bridge-v1',
      type: 'REQUEST_SNAPSHOT',
      requestId: 'stale-translation'
    }
  });

  const snapshot = harness.postedMessages.at(-1).snapshot;
  assert.equal(snapshot.isAutoTranslated, false);
  assert.equal(snapshot.selectedTrack.languageCode, 'en');
});

test('embedded translation language detects a preselected YouTube auto-translation', () => {
  const harness = createBridgeHarness();
  harness.setActiveTrack({
    ...harness.moviePlayer.getOption(),
    translationLanguage: { languageCode: 'ja' }
  });
  harness.windowListeners.get('message')({
    source: harness.window,
    data: {
      source: 'lasdoscas-player-bridge-v1',
      type: 'REQUEST_SNAPSHOT',
      requestId: 'embedded-preselected-translation'
    }
  });

  const snapshot = harness.postedMessages.at(-1).snapshot;
  assert.equal(snapshot.isAutoTranslated, true);
  assert.equal(snapshot.autoTranslationLanguageCode, 'ja');
  assert.match(snapshot.trackKey, /auto-translate:ja/);
});

test('active target-language track outside the source catalog is auto-translation', () => {
  const harness = createBridgeHarness();
  harness.setActiveTrack({
    baseUrl: 'https://www.youtube.com/api/timedtext?v=abc&lang=zh-Hans',
    id: 'translated-zh-Hans',
    language: { languageCode: 'zh-Hans' },
    name: { simpleText: 'Chinese (Simplified)' }
  });
  harness.windowListeners.get('message')({
    source: harness.window,
    data: {
      source: 'lasdoscas-player-bridge-v1',
      type: 'REQUEST_SNAPSHOT',
      requestId: 'translated-language'
    }
  });

  const snapshot = harness.postedMessages.at(-1).snapshot;
  assert.equal(snapshot.isAutoTranslated, true);
  assert.equal(snapshot.autoTranslationLanguageCode, 'zh-Hans');
  assert.equal(snapshot.selectedTrack.languageCode, 'en');
});

test('source-language metadata identifies auto-translation without tlang', () => {
  const harness = createBridgeHarness();
  harness.setActiveTrack({
    captionTrackId: 'translated-es',
    languageCode: 'es',
    sourceLanguageCode: 'en',
    name: { simpleText: 'Spanish' }
  });
  harness.windowListeners.get('message')({
    source: harness.window,
    data: {
      source: 'lasdoscas-player-bridge-v1',
      type: 'REQUEST_SNAPSHOT',
      requestId: 'source-language'
    }
  });

  const snapshot = harness.postedMessages.at(-1).snapshot;
  assert.equal(snapshot.isAutoTranslated, true);
  assert.equal(snapshot.autoTranslationLanguageCode, 'es');
});

test('separate YouTube translation language option identifies auto-translation', () => {
  const harness = createBridgeHarness();
  harness.setTranslationLanguage({ languageCode: 'ja', languageName: 'Japanese' });
  harness.windowListeners.get('message')({
    source: harness.window,
    data: {
      source: 'lasdoscas-player-bridge-v1',
      type: 'REQUEST_SNAPSHOT',
      requestId: 'separate-translation-language'
    }
  });

  const snapshot = harness.postedMessages.at(-1).snapshot;
  assert.equal(snapshot.isAutoTranslated, true);
  assert.equal(snapshot.autoTranslationLanguageCode, 'ja');
  assert.equal(snapshot.selectedTrack.languageCode, 'en');
  assert.match(snapshot.trackKey, /auto-translate:ja/);
});

test('translation language remains detectable while YouTube is replacing its active track', () => {
  const harness = createBridgeHarness();
  harness.setActiveTrack(null);
  harness.setTranslationLanguage('ja');
  harness.windowListeners.get('message')({
    source: harness.window,
    data: {
      source: 'lasdoscas-player-bridge-v1',
      type: 'REQUEST_SNAPSHOT',
      requestId: 'translation-language-during-track-swap'
    }
  });

  const snapshot = harness.postedMessages.at(-1).snapshot;
  assert.equal(snapshot.isAutoTranslated, true);
  assert.equal(snapshot.autoTranslationLanguageCode, 'ja');
});

test('native timedtext request preserves preselected auto-translation for the first snapshot', () => {
  const harness = createBridgeHarness();
  harness.requestCaption(
    'https://www.youtube.com/api/timedtext?v=abc&lang=en&tlang=ja&fmt=json3'
  );
  harness.windowListeners.get('message')({
    source: harness.window,
    data: {
      source: 'lasdoscas-player-bridge-v1',
      type: 'REQUEST_SNAPSHOT',
      requestId: 'preselected-auto-translation'
    }
  });

  const snapshot = harness.postedMessages.at(-1).snapshot;
  assert.equal(snapshot.isAutoTranslated, true);
  assert.equal(snapshot.autoTranslationLanguageCode, 'ja');
  assert.match(snapshot.trackKey, /auto-translate:ja/);
});

test('caption request evidence from another video is ignored', () => {
  const harness = createBridgeHarness();
  harness.requestCaption(
    'https://www.youtube.com/api/timedtext?v=old-video&lang=en&tlang=ja'
  );
  harness.windowListeners.get('message')({
    source: harness.window,
    data: {
      source: 'lasdoscas-player-bridge-v1',
      type: 'REQUEST_SNAPSHOT',
      requestId: 'other-video-auto-translation'
    }
  });

  const snapshot = harness.postedMessages.at(-1).snapshot;
  assert.equal(snapshot.isAutoTranslated, false);
});

test('first snapshot recovers preselected auto-translation from resource timing', () => {
  const harness = createBridgeHarness({
    resourceEntries: [
      { name: 'https://www.youtube.com/api/timedtext?v=abc&lang=en&tlang=ja' }
    ]
  });
  harness.windowListeners.get('message')({
    source: harness.window,
    data: {
      source: 'lasdoscas-player-bridge-v1',
      type: 'REQUEST_SNAPSHOT',
      requestId: 'resource-timing-auto-translation'
    }
  });

  const snapshot = harness.postedMessages.at(-1).snapshot;
  assert.equal(snapshot.isAutoTranslated, true);
  assert.equal(snapshot.autoTranslationLanguageCode, 'ja');
});

test('latest resource timing caption request determines translation state', () => {
  const harness = createBridgeHarness({
    resourceEntries: [
      { name: 'https://www.youtube.com/api/timedtext?v=abc&lang=en&tlang=ja' },
      { name: 'https://www.youtube.com/api/timedtext?v=abc&lang=en' }
    ]
  });
  harness.windowListeners.get('message')({
    source: harness.window,
    data: {
      source: 'lasdoscas-player-bridge-v1',
      type: 'REQUEST_SNAPSHOT',
      requestId: 'latest-resource-caption-state'
    }
  });

  const snapshot = harness.postedMessages.at(-1).snapshot;
  assert.equal(snapshot.isAutoTranslated, false);
});

test('periodic polling pauses while the page is hidden', () => {
  const harness = createBridgeHarness({ hidden: true });
  harness.getIntervalCallback()();

  assert.equal(harness.getQueryCount('#movie_player'), 0);
  assert.equal(harness.getQueryCount('.ytp-subtitles-button'), 0);
});

test('becoming visible reconciles immediately and reuses the player cache', () => {
  const harness = createBridgeHarness({ hidden: true });
  harness.document.hidden = false;
  harness.documentListeners.get('visibilitychange')();
  harness.getIntervalCallback()();

  assert.equal(harness.getQueryCount('#movie_player'), 1);
  assert.equal(harness.getQueryCount('.ytp-subtitles-button'), 1);
});

test('explicit snapshot requests still work while hidden', () => {
  const harness = createBridgeHarness({ hidden: true });
  harness.windowListeners.get('message')({
    source: harness.window,
    data: {
      source: 'lasdoscas-player-bridge-v1',
      type: 'REQUEST_SNAPSHOT',
      requestId: 'request-1'
    }
  });

  assert.equal(harness.getQueryCount('#movie_player'), 1);
  assert.equal(harness.postedMessages.length, 1);
  assert.equal(harness.postedMessages[0].type, 'SNAPSHOT_RESPONSE');
  assert.equal(harness.postedMessages[0].requestId, 'request-1');
});

test('SPA navigation invalidates the cached movie player', () => {
  const harness = createBridgeHarness();
  harness.getIntervalCallback()();
  assert.equal(harness.getQueryCount('#movie_player'), 1);

  harness.windowListeners.get('yt-navigate-finish')();
  harness.getIntervalCallback()();
  assert.equal(harness.getQueryCount('#movie_player'), 2);
});

test('non-watch pages skip periodic player snapshots', () => {
  const harness = createBridgeHarness({ href: 'https://www.youtube.com/' });
  harness.getIntervalCallback()();

  assert.equal(harness.getQueryCount('#movie_player'), 0);
  assert.equal(harness.getQueryCount('.ytp-subtitles-button'), 0);
});
