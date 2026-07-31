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

function createVideo() {
  return {
    isConnected: true,
    player: null,
    closest(selector) {
      assert.equal(selector, '#movie_player');
      return this.player;
    }
  };
}

function createPlayer(mainVideo = null, fallbackVideo = null) {
  return {
    isConnected: true,
    mainVideo,
    fallbackVideo,
    queries: [],
    querySelector(selector) {
      this.queries.push(selector);
      return selector === 'video.html5-main-video' ? this.mainVideo : this.fallbackVideo;
    }
  };
}

function loadVideoCache(activePlayerRef) {
  let documentQueries = 0;
  const context = {
    document: {
      querySelector(selector) {
        assert.equal(selector, '#movie_player');
        documentQueries += 1;
        return activePlayerRef.current;
      }
    }
  };
  vm.createContext(context);
  vm.runInContext([
    extractBetween('let cachedMoviePlayerElement', 'const TRACK_MODE'),
    extractBetween('function resetPlayerElementCache', 'function getVisibleVideoTitle'),
    `globalThis.videoCache = { getPlayerVideoElement, resetPlayerElementCache };`
  ].join('\n'), context);

  return {
    ...context.videoCache,
    getDocumentQueryCount: () => documentQueries
  };
}

test('reuses the connected main video without repeating DOM queries', () => {
  const video = createVideo();
  const player = createPlayer(video);
  video.player = player;
  const cache = loadVideoCache({ current: player });

  assert.equal(cache.getPlayerVideoElement(), video);
  assert.equal(cache.getPlayerVideoElement(), video);
  assert.equal(cache.getDocumentQueryCount(), 1);
  assert.deepEqual(player.queries, ['video.html5-main-video']);
});

test('re-resolves a disconnected video within the same player', () => {
  const firstVideo = createVideo();
  const secondVideo = createVideo();
  const player = createPlayer(firstVideo);
  firstVideo.player = player;
  secondVideo.player = player;
  const cache = loadVideoCache({ current: player });

  assert.equal(cache.getPlayerVideoElement(), firstVideo);
  firstVideo.isConnected = false;
  player.mainVideo = secondVideo;
  assert.equal(cache.getPlayerVideoElement(), secondVideo);
  assert.equal(cache.getDocumentQueryCount(), 1);
});

test('re-resolves a connected video that moved outside the cached player', () => {
  const firstVideo = createVideo();
  const secondVideo = createVideo();
  const player = createPlayer(firstVideo);
  firstVideo.player = player;
  secondVideo.player = player;
  const cache = loadVideoCache({ current: player });

  assert.equal(cache.getPlayerVideoElement(), firstVideo);
  firstVideo.player = {};
  player.mainVideo = secondVideo;
  assert.equal(cache.getPlayerVideoElement(), secondVideo);
});

test('re-resolves both player and video after SPA replacement', () => {
  const firstVideo = createVideo();
  const firstPlayer = createPlayer(firstVideo);
  firstVideo.player = firstPlayer;
  const activePlayerRef = { current: firstPlayer };
  const cache = loadVideoCache(activePlayerRef);

  assert.equal(cache.getPlayerVideoElement(), firstVideo);

  const secondVideo = createVideo();
  const secondPlayer = createPlayer(secondVideo);
  secondVideo.player = secondPlayer;
  firstPlayer.isConnected = false;
  activePlayerRef.current = secondPlayer;

  assert.equal(cache.getPlayerVideoElement(), secondVideo);
  assert.equal(cache.getDocumentQueryCount(), 2);
});

test('explicit reset forces a fresh player lookup', () => {
  const video = createVideo();
  const player = createPlayer(video);
  video.player = player;
  const cache = loadVideoCache({ current: player });

  assert.equal(cache.getPlayerVideoElement(), video);
  cache.resetPlayerElementCache();
  assert.equal(cache.getPlayerVideoElement(), video);
  assert.equal(cache.getDocumentQueryCount(), 2);
});

test('falls back to the first player video when the main class is absent', () => {
  const video = createVideo();
  const player = createPlayer(null, video);
  video.player = player;
  const cache = loadVideoCache({ current: player });

  assert.equal(cache.getPlayerVideoElement(), video);
  assert.deepEqual(player.queries, ['video.html5-main-video', 'video']);
});
