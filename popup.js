if (window.self === window.top) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0] && tabs[0].id) {
      
      chrome.tabs.sendMessage(tabs[0].id, { action: "close_settings_panel" }, () => {
        const suppressMsgError = chrome.runtime.lastError; 
      });
      
      const port = chrome.tabs.connect(tabs[0].id, { name: "native_popup_active" });
      port.onDisconnect.addListener(() => {

        const suppressConnError = chrome.runtime.lastError;
      });
      
    }
  });
}

const formFields = [
  'enabled', 'showSrc', 'showTrans', 'lang', 'font', 
  'srcSize', 'fsSrcSize', 'srcColor', 
  'transSize', 'fsTransSize', 'transColor', 
  'fsBgStyle', 'fsBgOpacity'
];

const toggleFields = ['srcNormalBold', 'srcFsBold', 'transNormalBold', 'transFsBold'];

// 面板 UI 自身的显示语言字典：只有中/英/西三种，按需求不要在这里增加更多语言。
// 注意这跟下面的字幕翻译目标语言（55 种，见 getSmartDefaultLang）是两个完全独立的概念，
// 千万不要混着改。
const i18nDict = {
  'zh': {
    masterSwitch: 'lasDoscas',
    fontSystemDefault: '系统默认',
    globalFont: '字体系列',
    firstSub: '第一字幕（原文）',
    secondSub: '第二字幕（译文）',
    cancelBtn: '关闭',
    fsBgStyleLabel: '字幕背景（全屏）',
    fsBgStyleNone: '无背景',
    fsBgStyleFit: '贴合字幕',
    fsBgStyleFixed: '锁定背景框',
    normalSize: '字号（默认视图及影院模式）',
    fsSize: '字号（全屏）',
    fsBgOpacityLabel: '背景透明度',
    resetBtn: '重置'
  },
  'en': {
    masterSwitch: 'lasDoscas',
    fontSystemDefault: 'System default',
    globalFont: 'Font family',
    firstSub: 'Primary subtitle (original)',
    secondSub: 'Secondary subtitle (translation)',
    cancelBtn: 'Close',
    fsBgStyleLabel: 'Subtitle background (fullscreen)',
    fsBgStyleNone: 'None',
    fsBgStyleFit: 'Fit to text',
    fsBgStyleFixed: 'Fixed window',
    normalSize: 'Font size (default view and theater mode)',
    fsSize: 'Font size (fullscreen)',
    fsBgOpacityLabel: 'Background opacity',
    resetBtn: 'Reset'
  },
  'es': {
    masterSwitch: 'lasDoscas',
    fontSystemDefault: 'Predeterminado del sistema',
    globalFont: 'Familia de fuentes',
    firstSub: 'Primer subtítulo (original)',
    secondSub: 'Segundo subtítulo (traducción)',
    cancelBtn: 'Cerrar',
    fsBgStyleLabel: 'Fondo de subtítulos (pantalla completa)',
    fsBgStyleNone: 'Ninguno',
    fsBgStyleFit: 'Ajustado al texto',
    fsBgStyleFixed: 'Ventana fija',
    normalSize: 'Tamaño de fuente (predeterminado y cine)',
    fsSize: 'Tamaño de fuente (pantalla completa)',
    fsBgOpacityLabel: 'Opacidad del fondo',
    resetBtn: 'Restablecer'
  }
};

// ⚠️ 这个函数决定的是"字幕翻译目标语言"（对应 <select id="lang"> 里的 55 个选项）的
// 默认值，跟面板 UI 语言（下面 defaultSettings.uiLang，只有 zh/en/es）是完全不同的两件事。
// 之前这里是一份简化版本（只会返回 'zh-CN' 或 'en'），跟 content.js 里那份更完整的版本
// 判断逻辑不一致，会导致：比如浏览器语言是日语的新用户，content.js 会正确默认给他 'ja'，
// 但设置面板首次打开时下拉框却显示 'en'，两边对不上。现在改成跟 content.js 完全一致的
// 判断逻辑，两处保持同步。
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

const defaultSettings = {
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
  popupTheme: 'light',
  // 面板 UI 语言：这里保持原来"只在 zh/en/es 三者之间选"的逻辑不变，
  // 不要跟上面的 getSmartDefaultLang()（翻译目标语言，55 种）混在一起改。
  uiLang: (() => {
    const prefix = (navigator.language || 'en').toLowerCase().split('-')[0];
    if (prefix === 'zh' || prefix === 'es') return prefix;
    return 'en';
  })()
};

let currentUiLang = defaultSettings.uiLang;
let tempSettings = {}; 

let preResetSettings = null; 
let undoTimeout = null;      
let countdownInterval = null;

document.addEventListener('DOMContentLoaded', () => {
  const fieldsToGet = [...formFields, ...toggleFields, 'popupTheme', 'uiLang'];

  chrome.storage.local.get(fieldsToGet, (stored) => {
    fieldsToGet.forEach(k => {
      tempSettings[k] = stored[k] !== undefined ? stored[k] : defaultSettings[k];
    });

    applySettingsToUI(tempSettings);
    applyThemeUI(tempSettings['popupTheme']);
    currentUiLang = tempSettings['uiLang'];
    applyI18n(currentUiLang);

    bindHeaderEvents();
    bindFormInputsEvents();
    bindToggleButtonsEvents();
    bindColorPresetsEvents();
    bindFooterEvents();
  });
});

function saveSettings(changes) {
  Object.assign(tempSettings, changes);
  chrome.storage.local.set(changes);
}

function applySettingsToUI(settingsObj) {
  formFields.forEach(f => {
    const el = document.getElementById(f);
    if (el) {
      if (el.type === 'checkbox') el.checked = settingsObj[f];
      else el.value = settingsObj[f];
    }
  });

  updateToggleBtnUI('srcNormalBoldBtn', settingsObj.srcNormalBold);
  updateToggleBtnUI('srcFsBoldBtn', settingsObj.srcFsBold);
  updateToggleBtnUI('transNormalBoldBtn', settingsObj.transNormalBold);
  updateToggleBtnUI('transFsBoldBtn', settingsObj.transFsBold);

  updateSubSettingsArea(settingsObj.enabled);
  updateOpacityWrapper(settingsObj.fsBgStyle);
}

function updateToggleBtnUI(btnId, isActive) {
  const btn = document.getElementById(btnId);
  if (btn) {
    if (isActive) btn.classList.add('active');
    else btn.classList.remove('active');
  }
}

function updateSubSettingsArea(isEnabled) {
  const area = document.getElementById('subSettingsArea');
  if (area) {
    if (isEnabled) area.classList.remove('disabled');
    else area.classList.add('disabled');
  }
}

function updateOpacityWrapper(bgStyle) {
  const wrapper = document.getElementById('opacityWrapper');
  if (wrapper) {
    if (bgStyle === 'none') wrapper.classList.add('disabled');
    else wrapper.classList.remove('disabled');
  }
}

function applyThemeUI(theme) {
  const body = document.body;
  if (theme === 'dark') {
    body.classList.add('dark-theme');
  } else {
    body.classList.remove('dark-theme');
  }
}

function applyI18n(lang) {
  const dict = i18nDict[lang];
  if (!dict) return;
  
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n'); 
    if (dict[key]) el.textContent = dict[key]; 
  });

  const toggleBtn = document.getElementById('uiLangToggleBtn');
  if (toggleBtn) {
    if (lang === 'zh') toggleBtn.textContent = 'ZH';
    else if (lang === 'en') toggleBtn.textContent = 'EN';
    else if (lang === 'es') toggleBtn.textContent = 'ES';
  }
}

function bindHeaderEvents() {
  document.getElementById('themeToggleBtn').addEventListener('click', () => {
    const nextTheme = tempSettings['popupTheme'] === 'light' ? 'dark' : 'light';
    saveSettings({ popupTheme: nextTheme });
    applyThemeUI(nextTheme);
  });

  document.getElementById('uiLangToggleBtn').addEventListener('click', () => {
    // 面板 UI 语言循环切换：固定只在 zh/en/es 三者之间轮换，不要加入更多语言。
    const langSequence = ['zh', 'en', 'es'];
    let currentIndex = langSequence.indexOf(currentUiLang);
    currentUiLang = langSequence[(currentIndex + 1) % langSequence.length];
    
    saveSettings({ uiLang: currentUiLang });
    applyI18n(currentUiLang);
  });
}

function bindFormInputsEvents() {
  formFields.forEach(f => {
    const el = document.getElementById(f);
    if (el) {
      const evType = (el.type === 'checkbox' || el.tagName === 'SELECT') ? 'change' : 'input';
      el.addEventListener(evType, () => {
        const value = el.type === 'checkbox' ? el.checked : el.value;
        if (el.type === 'text' && !/^#[0-9a-f]{6}$/i.test(value)) return;

        const changes = { [f]: value };
        
        if (f === 'enabled') updateSubSettingsArea(el.checked);
        if (f === 'fsBgStyle') {
          updateOpacityWrapper(el.value);
          if (el.value === 'none') {
            changes.srcFsBold = false;
            changes.transFsBold = true;
            updateToggleBtnUI('srcFsBoldBtn', false);
            updateToggleBtnUI('transFsBoldBtn', true);
          } 
          else if (el.value === 'fit' || el.value === 'fixed') {
            changes.srcFsBold = false;
            changes.transFsBold = false;
            updateToggleBtnUI('srcFsBoldBtn', false);
            updateToggleBtnUI('transFsBoldBtn', false);
          }
        }

        saveSettings(changes);
      });
    }
  });
}

function bindToggleButtonsEvents() {
  const toggleMap = {
    'srcNormalBoldBtn': 'srcNormalBold',
    'srcFsBoldBtn': 'srcFsBold',
    'transNormalBoldBtn': 'transNormalBold',
    'transFsBoldBtn': 'transFsBold'
  };

  Object.keys(toggleMap).forEach(btnId => {
    const btn = document.getElementById(btnId);
    if (btn) {
      btn.addEventListener('click', () => {
        const settingKey = toggleMap[btnId];
        const nextValue = !tempSettings[settingKey];
        updateToggleBtnUI(btnId, nextValue);
        saveSettings({ [settingKey]: nextValue });
      });
    }
  });
}

function bindColorPresetsEvents() {
  document.querySelectorAll('.preset-color').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const targetId = e.target.getAttribute('data-target'); 
      const colorHex = e.target.getAttribute('data-color');  
      
      const inputEl = document.getElementById(targetId);
      if (inputEl) {
        inputEl.value = colorHex;
        saveSettings({ [targetId]: colorHex });
      }
    });
  });
}

function bindFooterEvents() {
  const btnReset = document.getElementById('btnReset');
  
  btnReset.addEventListener('click', () => {
    if (btnReset.classList.contains('undo-state')) {
      applySettingsToUI(preResetSettings);
      tempSettings = { ...preResetSettings }; 
      chrome.storage.local.set(tempSettings);
      
      clearTimeout(undoTimeout);
      clearInterval(countdownInterval);
      btnReset.classList.remove('undo-state');
      btnReset.textContent = i18nDict[currentUiLang].resetBtn || '重置';
      return;
    }

    preResetSettings = { ...tempSettings }; 
    
    const pureDefaults = { ...defaultSettings };
    pureDefaults.uiLang = tempSettings.uiLang;
    pureDefaults.popupTheme = tempSettings.popupTheme;
    pureDefaults.enabled = tempSettings.enabled; 
    
    tempSettings = { ...pureDefaults };
    applySettingsToUI(pureDefaults); 
    chrome.storage.local.set(tempSettings);

    btnReset.classList.add('undo-state');
    let timeLeft = 3; 
    const undoPrefix = currentUiLang === 'zh' ? '撤销' : (currentUiLang === 'es' ? 'Deshacer' : 'Undo');
    btnReset.textContent = `${undoPrefix} (${timeLeft}s)`;

    countdownInterval = setInterval(() => {
      timeLeft--;
      if (timeLeft > 0) btnReset.textContent = `${undoPrefix} (${timeLeft}s)`;
    }, 1000);

    undoTimeout = setTimeout(() => {
      clearInterval(countdownInterval);
      btnReset.classList.remove('undo-state');
      btnReset.textContent = i18nDict[currentUiLang].resetBtn || '重置';
    }, 3000); 
  });

  document.getElementById('btnCancel').addEventListener('click', () => {
    // 静默处理 lastError
    chrome.runtime.sendMessage({ action: "close_popup_iframe" }, () => {
      const suppressError = chrome.runtime.lastError;
    });
    window.close();
  });

}

if (window.self !== window.top) {
  document.addEventListener('DOMContentLoaded', () => {

    if (!document.body) return;

    const resizeObserver = new ResizeObserver(() => {
      const currentHeight = document.documentElement.scrollHeight;

      // 安全性：明确指定目标 origin，而不是用通配符 "*"。
      // location.ancestorOrigins[0] 是父窗口（即 youtube.com 页面）的 origin，
      // 由浏览器提供、无法被内容脚本伪造，比手写死一个固定域名更稳妥
      // （因为 manifest 匹配的是 *://*.youtube.com/*，父窗口也可能是
      // m.youtube.com 等其它子域名）。极少数不支持 ancestorOrigins 的环境下
      // 才退回到 "*"。
      const parentOrigin = (window.location.ancestorOrigins && window.location.ancestorOrigins[0]) || '*';

      window.parent.postMessage({ 
        action: "lasdoscas_resize", 
        height: currentHeight 
      }, parentOrigin);
    });
    
    resizeObserver.observe(document.body);
  });
}
