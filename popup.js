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

const i18nDict = {
  'zh': {
    masterSwitch: 'lasDoscas',
    fontSystemDefault: '系统默认',
    globalFont: '字体系列',
    firstSub: '第一字幕（原文）',
    secondSub: '第二字幕（译文）',
    cancelBtn: '关闭',
    applyBtn: '应用',
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
    applyBtn: 'Apply',
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
    applyBtn: 'Aplicar',
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

function getSmartDefaultLang() {
  const browserLang = navigator.language || 'en';
  const prefix = browserLang.toLowerCase().split('-')[0];
  if (prefix === 'zh') return 'zh-CN';
  return 'en';
}

const defaultSettings = {
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
  fsBgOpacity: '75',  
  popupTheme: 'light',
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
  });

  bindHeaderEvents();
  bindFormInputsEvents();
  bindToggleButtonsEvents();
  bindColorPresetsEvents();
  bindFooterEvents();
});

function enableApplyBtn() {
  const btn = document.getElementById('btnApply');
  if (btn) btn.disabled = false;
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
    tempSettings['popupTheme'] = nextTheme;
    chrome.storage.local.set({ popupTheme: nextTheme });
    applyThemeUI(nextTheme);
  });

  document.getElementById('uiLangToggleBtn').addEventListener('click', () => {
    const langSequence = ['zh', 'en', 'es'];
    let currentIndex = langSequence.indexOf(currentUiLang);
    currentUiLang = langSequence[(currentIndex + 1) % langSequence.length];
    
    tempSettings['uiLang'] = currentUiLang;
    chrome.storage.local.set({ uiLang: currentUiLang }); 
    applyI18n(currentUiLang);
  });
}

function bindFormInputsEvents() {
  formFields.forEach(f => {
    const el = document.getElementById(f);
    if (el) {
      const evType = (el.type === 'checkbox' || el.tagName === 'SELECT' || el.type === 'range') ? 'change' : 'input';
      el.addEventListener(evType, () => {
        tempSettings[f] = el.type === 'checkbox' ? el.checked : el.value;
        enableApplyBtn(); 
        
        if (f === 'enabled') updateSubSettingsArea(el.checked);
        if (f === 'fsBgStyle') {
          updateOpacityWrapper(el.value);
          if (el.value === 'none') {
            tempSettings['srcFsBold'] = false;
            tempSettings['transFsBold'] = true;
            updateToggleBtnUI('srcFsBoldBtn', false);
            updateToggleBtnUI('transFsBoldBtn', true);
          } 
          else if (el.value === 'fit' || el.value === 'fixed') {
            tempSettings['srcFsBold'] = false;
            tempSettings['transFsBold'] = false;
            updateToggleBtnUI('srcFsBoldBtn', false);
            updateToggleBtnUI('transFsBoldBtn', false);
          }
        }
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
        tempSettings[settingKey] = !tempSettings[settingKey];
        updateToggleBtnUI(btnId, tempSettings[settingKey]);
        enableApplyBtn(); 
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
        tempSettings[targetId] = colorHex; 
        enableApplyBtn();
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
      
      clearTimeout(undoTimeout);
      clearInterval(countdownInterval);
      btnReset.classList.remove('undo-state');
      btnReset.textContent = i18nDict[currentUiLang].resetBtn || '重置';
      enableApplyBtn();
      return;
    }

    preResetSettings = { ...tempSettings }; 
    
    const pureDefaults = { ...defaultSettings };
    pureDefaults.uiLang = tempSettings.uiLang;
    pureDefaults.popupTheme = tempSettings.popupTheme;
    pureDefaults.enabled = tempSettings.enabled; 
    
    tempSettings = { ...pureDefaults };
    applySettingsToUI(pureDefaults); 
    enableApplyBtn(); 

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

  const btnApply = document.getElementById('btnApply');
  btnApply.addEventListener('click', () => {
    chrome.storage.local.set(tempSettings, () => {
      btnApply.disabled = true; 
    }); 
  });
}

if (window.self !== window.top) {
  document.addEventListener('DOMContentLoaded', () => {

    if (!document.body) return;

    const resizeObserver = new ResizeObserver(() => {
      const currentHeight = document.documentElement.scrollHeight;
      window.parent.postMessage({ 
        action: "lasdoscas_resize", 
        height: currentHeight 
      }, "*");
    });
    
    resizeObserver.observe(document.body);
  });
}