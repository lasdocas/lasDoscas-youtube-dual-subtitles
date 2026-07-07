let isOrphaned = false;
let fullscreenSettingsIframe = null; 

function dieQuietly() {
  if (isOrphaned) return;
  isOrphaned = true; 
  
  if (observer) observer.disconnect();
  if (flexyObserver) flexyObserver.disconnect();
  if (playerResizeObserver) playerResizeObserver.disconnect();
  if (ccButtonObserver) ccButtonObserver.disconnect();
  if (containerMonitor) clearInterval(containerMonitor);
  
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
    // 下面是新增的 17 种语言
    'sw', 'et', 'lv', 'lt', 'sk', 'sl', 'bg', 'sr', 'ur', 'fa', 
    'mr', 'bn', 'gu', 'te', 'kn', 'ml', 'am'
  ];
  if (supportedPrefixes.includes(prefix)) return prefix;
  return 'en';
}

let lastText = "";
let observer = null;
let flexyObserver = null;
let playerResizeObserver = null; 
let ccButtonObserver = null; 

let currentCaptionContainer = null;
let containerMonitor = null;

// ==========================================
// 🚀 新增：预加载核心状态字典 (O(1) 零延迟架构)
// ==========================================
let preloadedTranslations = new Map();
let isTrackPreloaded = false;

let currentSettings = {
  enabled: true,
  showSrc: true,
  showTrans: true,
  lang: getSmartDefaultLang(), 
  font: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",  
  srcSize: '0.75',
  fsSrcSize: '1.15', 
  srcColor: '#d8dee9',
  srcNormalBold: false,
  srcFsBold: false,
  transSize: '0.75',
  fsTransSize: '1.15',
  transColor: '#7fdaf4',
  transNormalBold: false,
  transFsBold: true,
  fsBgStyle: 'none',
  fsBgOpacity: '75'
};

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
    for (let key in changes) {
      currentSettings[key] = changes[key].newValue;
    }
    syncPluginState();
    if (changes.lang || changes.enabled) {
      lastText = ""; 
      // 如果语言改变，重新执行预加载
      if (changes.lang && currentSettings.enabled) {
        preloadedTranslations.clear();
        isTrackPreloaded = false;
        preloadFullTrack();
      }
    }
  });
} catch (e) {
  dieQuietly();
}

function syncPluginState() {
  if (isOrphaned) return;
  
  document.body.setAttribute('data-yt-dual-sub-active', currentSettings.enabled ? 'true' : 'false');
  
  const wrapper = document.querySelector('.custom-subtitle-wrapper');
  if (!currentSettings.enabled) {
    if (wrapper) wrapper.remove();
    if (flexyObserver) flexyObserver.disconnect();
    if (playerResizeObserver) playerResizeObserver.disconnect();
    if (ccButtonObserver) ccButtonObserver.disconnect();
    
    if (observer) observer.disconnect();
    if (containerMonitor) clearInterval(containerMonitor);
    currentCaptionContainer = null;
    
    clearSubtitleContent();
    return;
  }

  triggerLayoutUpdate();
  startContainerMonitor();
  initLayoutObserver(); 
  initPlayerResizeObserver(); 
  initCCButtonObserver(); 
}

function getLayoutMode() {
  const watchFlexy = document.querySelector('ytd-watch-flexy');
  const moviePlayer = document.querySelector('#movie_player');
  const isFs = document.fullscreenElement != null || 
               (watchFlexy && watchFlexy.hasAttribute('fullscreen')) || 
               (moviePlayer && moviePlayer.classList.contains('ytp-fullscreen'));
  if (isFs) return 'fullscreen';
  if (watchFlexy && watchFlexy.hasAttribute('theater')) return 'theater';
  return 'default';
}

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

  if (sourceText) {
    sourceText.style.setProperty('font-family', currentSettings.font, 'important');
    sourceText.style.setProperty('color', currentSettings.srcColor, 'important');
    sourceText.style.setProperty('font-weight', isSrcBold ? '800' : '400', 'important'); 
    sourceText.style.setProperty('--user-scale', srcScale, 'important');
    sourceText.style.setProperty('display', currentSettings.showSrc ? 'block' : 'none', 'important');
    
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
    transText.style.setProperty('display', currentSettings.showTrans ? 'block' : 'none', 'important');
    
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
  const ccBtn = document.querySelector('.ytp-subtitles-button');
  const isCcOn = ccBtn && ccBtn.getAttribute('aria-pressed') === 'true';
  const isFullscreen = wrapper.getAttribute('data-layout-mode') === 'fullscreen';
  
  const isEmpty = !lastText; 
  const bothHidden = !currentSettings.showSrc && !currentSettings.showTrans;

  if (!isCcOn || bothHidden) {
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
  if (isOrphaned || !currentSettings.enabled) return null;
  
  const watchFlexy = document.querySelector('ytd-watch-flexy');
  const moviePlayer = document.querySelector('#movie_player');
  if (!watchFlexy || !moviePlayer) return null;

  const layoutMode = getLayoutMode();
  let wrapper = document.querySelector('.custom-subtitle-wrapper');
  
  if (!wrapper) {
    wrapper = document.createElement('div');
    wrapper.className = 'custom-subtitle-wrapper';

    // 🚀 新增：无障碍屏幕阅读器支持
    wrapper.setAttribute('role', 'status');
    wrapper.setAttribute('aria-live', 'polite');
    wrapper.setAttribute('aria-atomic', 'true');

    wrapper.innerHTML = `
      <div class="custom-source-text">&nbsp;</div>
      <div class="custom-translated-text">&nbsp;</div>
    `;
    wrapper.style.setProperty('color-scheme', 'only light', 'important');
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

  wrapper.setAttribute('data-layout-mode', layoutMode);
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

function updateWrapperDimensions() {
  const wrapper = document.querySelector('.custom-subtitle-wrapper');
  const actualPlayer = document.querySelector('#movie_player');
  if (!wrapper || !actualPlayer || isOrphaned) return;

  const layoutMode = getLayoutMode(); 
  wrapper.setAttribute('data-layout-mode', layoutMode);

  const targetWidth = actualPlayer.getBoundingClientRect().width;
  
  let baseRatio = targetWidth / 850;
  let playerScale = Math.pow(baseRatio, 0.5); 
  playerScale = Math.max(0.75, Math.min(playerScale, 1.4)); 
  
  wrapper.style.setProperty('--player-scale', playerScale, 'important');

  if (layoutMode === 'theater') {
    if (targetWidth > 200) {
      wrapper.style.setProperty('width', `${targetWidth}px`, 'important');
      wrapper.style.setProperty('max-width', `${targetWidth}px`, 'important');
      wrapper.style.setProperty('margin', '0 auto', 'important');
      wrapper.style.setProperty('border-radius', '0 0 8px 8px', 'important'); 
    }
  } else if (layoutMode === 'fullscreen') {
    if (currentSettings.fsBgStyle === 'fit' || currentSettings.fsBgStyle === 'none') {
      wrapper.style.setProperty('width', 'fit-content', 'important');
      wrapper.style.setProperty('max-width', '85%', 'important');
    } else if (targetWidth > 200) {
      wrapper.style.setProperty('width', `${targetWidth * 0.8}px`, 'important');
      wrapper.style.setProperty('max-width', '100%', 'important');
    }
    wrapper.style.setProperty('border-radius', '8px', 'important');
  } else {
    wrapper.style.setProperty('width', '100%', 'important');
    wrapper.style.setProperty('max-width', '100%', 'important');
    wrapper.style.removeProperty('margin-left');
    wrapper.style.removeProperty('margin-right');
    wrapper.style.setProperty('border-radius', '8px', 'important'); 
  }
}

function initPlayerResizeObserver() {
  if (playerResizeObserver) playerResizeObserver.disconnect();

  const playerTarget = document.querySelector('#movie_player') || document.querySelector('ytd-watch-flexy');
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
  const moviePlayer = document.querySelector('#movie_player');
  if (moviePlayer && moviePlayer !== playerTarget) {
    playerResizeObserver.observe(moviePlayer);
  }
}

function initCCButtonObserver() {
  if (ccButtonObserver) ccButtonObserver.disconnect();
  
  const ccBtn = document.querySelector('.ytp-subtitles-button');
  if (!ccBtn) {
    if (!isOrphaned) setTimeout(initCCButtonObserver, 1000);
    return;
  }

  ccButtonObserver = new MutationObserver(() => {
    if (!checkContext() || isOrphaned) return;
    if (!currentSettings.enabled) return;
    updateWrapperVisibility();
  });

  ccButtonObserver.observe(ccBtn, { attributes: true, attributeFilter: ['aria-pressed'] });
}

// 优化后的 updateSubtitleContent
function updateSubtitleContent(source, translated) {
  if (isOrphaned) return;
  const wrapper = ensureSubtitleContainer();
  if (!wrapper) return;

  const sourceText = wrapper.querySelector('.custom-source-text');
  const transText = wrapper.querySelector('.custom-translated-text');

  // 1. 仅执行纯粹的 DOM 文本替换 (高频操作)
  if (sourceText) sourceText.textContent = source;
  if (transText) {
    transText.textContent = translated || "";
    if (!translated) transText.innerHTML = "&nbsp;"; 
  }

  // 2. 仅保留轻量级的可见性更新
  // 因为当字幕从“有文字”变为“无文字”时，外层容器的背景框可能需要隐藏
  updateWrapperVisibility(); 

  // 🚀 核心优化：删除 applyStylesToDOM();
  // 样式（字号、颜色、粗细、排版）现已完全交由 ResizeObserver, MutationObserver 和 storage 变化事件负责，
  // 不再被高频的字幕文本切换强制触发。
}

function clearSubtitleContent() {
  const wrapper = document.querySelector('.custom-subtitle-wrapper');
  if (!wrapper) return;
  
  lastText = ""; 

  const srcNode = wrapper.querySelector('.custom-source-text');
  const transNode = wrapper.querySelector('.custom-translated-text');
  
  if (srcNode) srcNode.innerHTML = "&nbsp;";
  if (transNode) transNode.innerHTML = "&nbsp;";

  updateWrapperVisibility();
}

function startContainerMonitor() {
  if (containerMonitor) clearInterval(containerMonitor);
  
  containerMonitor = setInterval(() => {
    if (!checkContext() || isOrphaned) {
      clearInterval(containerMonitor);
      return;
    }
    if (!currentSettings.enabled) return;
    
    const actualContainer = document.querySelector('.ytp-caption-window-container');
    
    if (actualContainer && actualContainer !== currentCaptionContainer) {
      currentCaptionContainer = actualContainer;
      bindMutationObserver(actualContainer);
    }
  }, 1000);
}

// ==========================================
// 🚀 核心更新：混合架构（预加载 O(1) + 强制同框渲染兜底）
// ==========================================
function bindMutationObserver(containerTarget) {
  if (observer) observer.disconnect();
  if (!containerTarget) return;

  observer = new MutationObserver(() => {
    if (!checkContext() || isOrphaned) {
      observer.disconnect();
      return;
    }
    if (!currentSettings.enabled) return;

    const captionWindow = containerTarget.querySelector('.caption-window');
    if (!captionWindow) {
      clearSubtitleContent();
      return;
    }

    const segments = Array.from(captionWindow.querySelectorAll('.ytp-caption-segment'));
    const currentText = segments.map(s => s.textContent.trim()).join(' ');

    if (!currentText) {
      clearSubtitleContent();
      return;
    }

    if (currentText !== lastText) {
      lastText = currentText;

      // 1. 尝试从本地预加载字典中极速获取 (O(1))
      if (isTrackPreloaded && preloadedTranslations.has(currentText)) {
        const translatedText = preloadedTranslations.get(currentText);
        // 缓存命中：瞬间同框上屏！
        updateSubtitleContent(currentText, translatedText);
      } else {
        // 2. 兜底方案 (Fallback) - 视觉完整性优先模式
        // 注意：这里【绝对不】提前调用 updateSubtitleContent。
        // 宁愿屏幕上暂时保留上一句，或者保持空白，也要死等翻译结果，确保一出现就是完整的双语。

        try {
          chrome.runtime.sendMessage({ 
            action: "translate", 
            text: currentText, 
            lang: currentSettings.lang 
          }, (response) => {
            if (chrome.runtime.lastError) {
              const errMsg = chrome.runtime.lastError.message || "";
              if (errMsg.includes("Extension context invalidated")) {
                dieQuietly();
              }
              return;
            }
            
            if (isOrphaned) return;

            // 核心防错机制：如果网络请求耗时过长，当前视频已经切到下一句话了，
            // 这条迟到的翻译必须直接丢弃，否则会导致“旧字幕覆盖新画面”的灾难体验。
            if (currentText === lastText) {
              if (response && response.translation) {
                // 拿到结果了，第一和第二字幕正式“同框上屏”
                updateSubtitleContent(currentText, response.translation);
                // 顺手存入缓存，下次如果你倒退视频重看这句，就是零延迟了！
                preloadedTranslations.set(currentText, response.translation);
              } else {
                // 极端情况：API 彻底失败没返回译文。
                // 为了不影响基本观影，只能退让一步，单显原文。
                updateSubtitleContent(currentText, "");
              }
            }
          });
        } catch (error) {
          if (error.message && error.message.includes("Extension context invalidated")) {
            dieQuietly();
          }
        }
      }
    }
  });

  observer.observe(containerTarget, { childList: true, subtree: true });
}

// ==========================================
// 🚀 新增：预加载工作流引擎
// ==========================================
async function fetchCaptionsData() {
  try {
    const scripts = document.querySelectorAll('script');
    let playerDataStr = null;
    
    for (const script of scripts) {
      if (script.textContent && script.textContent.includes('ytInitialPlayerResponse')) {
        const match = script.textContent.match(/ytInitialPlayerResponse\s*=\s*(\{.*?\});/);
        if (match && match[1]) {
          playerDataStr = match[1];
          break;
        }
      }
    }

    if (!playerDataStr) return null;

    const playerData = JSON.parse(playerDataStr);
    const captions = playerData?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
    
    if (!captions || captions.length === 0) return null;

    let selectedTrack = captions.find(track => track.vssId.startsWith('a.') || track.languageCode === 'en') || captions[0];
    
    return selectedTrack.baseUrl;

  } catch (error) {
    console.warn("lasDoscas: 无法解析 YouTube 播放器数据", error);
    return null;
  }
}

async function downloadAndParseSubtitles(trackUrl) {
  try {
    const url = new URL(trackUrl);
    url.searchParams.set('fmt', 'json3');
    
    const response = await fetch(url.toString());
    
    // 1. 检查 HTTP 状态码是否正常
    if (!response.ok) {
      console.warn(`lasDoscas: 预加载中止，服务器返回状态码 ${response.status}`);
      return [];
    }
    
    // 2. 先作为纯文本读取，避免直接执行 .json() 崩溃
    const text = await response.text();
    if (!text || text.trim() === '') {
      // console.warn("lasDoscas: 预加载中止，收到空字幕数据");
      return [];
    }

    // 3. 安全地尝试解析 JSON
    let data;
    try {
      data = JSON.parse(text);
    } catch (parseError) {
      console.warn("lasDoscas: 预加载中止，JSON 格式解析失败");
      return []; // 解析失败就温和地返回空数组，不要让整个扩展崩溃
    }
    
    let allSentences = new Set();
    
    if (data && data.events) {
      data.events.forEach(event => {
        if (event.segs) {
          const segText = event.segs.map(seg => seg.utf8).join('').replace(/\n/g, ' ').trim();
          if (segText) {
            allSentences.add(segText);
          }
        }
      });
    }
    
    return Array.from(allSentences);
  } catch (error) {
    // 捕获网络断开等其他严重错误
    console.warn("lasDoscas: 下载字幕文件遇到网络错误", error.message);
    return [];
  }
}

async function preloadFullTrack() {
  if (isOrphaned || !currentSettings.enabled) return;
  
  console.log("lasDoscas: 开始预加载全片字幕...");

  const trackUrl = await fetchCaptionsData();
  if (!trackUrl) {
    console.log("lasDoscas: 未找到可用的字幕轨。");
    return;
  }

  const sourceSentences = await downloadAndParseSubtitles(trackUrl);
  console.log(`lasDoscas: 成功提取 ${sourceSentences.length} 条字幕记录，开始后台静默翻译...`);

  // 更加保守的限流配置：每批处理 3 句，间隔 800ms
  const batchSize = 3;
  for (let i = 0; i < sourceSentences.length; i += batchSize) {
    if (isOrphaned || !currentSettings.enabled) break;

    const batch = sourceSentences.slice(i, i + batchSize);
    
    const promises = batch.map(text => {
        if (preloadedTranslations.has(text)) return Promise.resolve();

        return new Promise((resolve) => {
            chrome.runtime.sendMessage({ 
                action: "translate", 
                text: text, 
                lang: currentSettings.lang 
            }, (response) => {
                if (chrome.runtime.lastError) return resolve();
                if (response && response.translation) {
                    preloadedTranslations.set(text, response.translation);
                }
                resolve();
            });
        });
    });

    await Promise.all(promises);
    
    // 强制休眠 800ms 以保护 API，防止触发 429 报错
    await new Promise(r => setTimeout(r, 800)); 
  }

  isTrackPreloaded = true;
  console.log("lasDoscas: 全片字幕预加载完成！现已开启零延迟渲染模式。");
}

// 确保在页面初次加载时也能自动启动预加载
setTimeout(() => {
  if (checkContext() && !isOrphaned && currentSettings.enabled && !isTrackPreloaded) {
    preloadFullTrack();
  }
}, 2000);

window.addEventListener('yt-navigate-finish', () => {
  if (!checkContext() || isOrphaned) return;
  lastText = "";
  currentCaptionContainer = null;
  
  // 清理之前的预加载数据
  preloadedTranslations.clear();
  isTrackPreloaded = false;

  const oldWrapper = document.querySelector('.custom-subtitle-wrapper');
  if (oldWrapper) oldWrapper.remove();
  syncPluginState();

  if (currentSettings.enabled) {
    preloadFullTrack();
  }
});

loadAndApplySettings();

function toggleFullscreenSettings() {
  if (isOrphaned) return;
  
  const moviePlayer = document.querySelector('#movie_player');
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
  fullscreenSettingsIframe.style.setProperty('width', '348px', 'important');
  fullscreenSettingsIframe.style.setProperty('height', '500px', 'important'); 
  
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

  // 🚀 新增：安全防线，严格校验消息发送者的来源
  // 预期来源应该是我们自己的 Chrome 扩展
  const expectedOrigin = chrome.runtime.getURL('').replace(/\/$/, '');
  if (event.origin !== expectedOrigin) {
    return; // 如果来源不是我们的设置面板 iframe，直接无视，静默丢弃
  }
  
  if (event.data && event.data.action === "lasdoscas_resize") {
    if (fullscreenSettingsIframe) {
      const moviePlayer = document.querySelector('#movie_player');
      let maxAllowedHeight = window.innerHeight * 0.9; 
      
      if (moviePlayer) {
        maxAllowedHeight = moviePlayer.clientHeight * 0.95;
      }
      
      const finalHeight = Math.min(event.data.height, maxAllowedHeight);
      
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
  
  if (message.action === "toggle_settings_panel") {
    if (isNativePopupActive) return;
    toggleFullscreenSettings();
  } else if (message.action === "close_settings_panel") {
    removeFullscreenSettings();
  }
});