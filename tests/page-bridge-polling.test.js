const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const bridgeSource = fs.readFileSync(
  path.resolve(__dirname, '..', 'page-bridge.js'),
  'utf8'
);

function createBridgeHarness({ hidden = false, href = 'https://www.youtube.com/watch?v=abc' } = {}) {
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
  const moviePlayer = {
    isConnected: true,
    getPlayerResponse: () => ({
      videoDetails: { videoId: 'abc', title: 'Test video' },
      captions: {
        playerCaptionsTracklistRenderer: { captionTracks: [selectedTrack] }
      }
    }),
    getOption: () => selectedTrack
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
    location: new URL(href),
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
    postedMessages,
    window,
    windowListeners
  };
}

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
