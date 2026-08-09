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

const hasSessionStorage = Boolean(chrome.storage.session);
const aiSessionStorage = chrome.storage.session || chrome.storage.local;
const aiDefaultSettings = {
  aiEnabled: false,
  aiProvider: 'gemini',
  aiRememberKey: false,
  aiFallback: true,
  aiApiKeyConfigured: false
};
let aiSettings = { ...aiDefaultSettings };
let aiKeyValue = '';
let aiStatusKey = 'aiNotConfigured';
let aiStatusType = '';
const AI_KEY_STORAGE_FIELD = 'aiGeminiApiKey';

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
    aiSection: 'AI 增强',
    aiProvider: '服务商',
    aiGemini: 'Google Gemini',
    aiApiKey: 'API Key',
    aiKeyPlaceholder: '粘贴 Gemini API Key',
    aiSavedKeyPlaceholder: 'Key 已保存，输入新 Key 可替换',
    aiStorageHint: '当前浏览器会话内保存，不会发送给 YouTube',
    aiStorageRememberedHint: '已保存在此设备，关闭浏览器后仍会保留',
    aiRememberKey: '关闭浏览器后仍保留 Key',
    aiFallback: 'AI 不可用时使用标准翻译',
    aiTest: '测试连接',
    aiClear: '清除 Key',
    aiApply: '应用 Key',
    aiShow: '显示',
    aiHide: '隐藏',
    aiNotConfigured: '未配置',
    aiConfigured: '已配置',
    aiConfiguredSession: '已配置：正在使用本次浏览器会话保存的 Key',
    aiConfiguredDevice: '已配置：正在使用此设备保存的 Key',
    aiTesting: '测试中…',
    aiTestSuccess: '连接成功，Key 可用',
    aiApplied: 'Key 已应用，AI 增强已开启',
    aiMissingKey: '请先输入 API Key',
    aiInvalidKey: 'Key 无效或没有访问权限',
    aiRateLimited: 'Gemini 返回 429：额度已用完或暂时限流',
    aiNetworkError: '网络连接失败',
    aiTimeout: '连接超时，请检查网络或代理设置',
    aiExtensionError: '扩展后台未响应，请在 chrome://extensions 重新加载扩展',
    aiRequestFailed: '连接失败',
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
    aiSection: 'AI enhancement',
    aiProvider: 'Provider',
    aiGemini: 'Google Gemini',
    aiApiKey: 'API key',
    aiKeyPlaceholder: 'Paste your Gemini API key',
    aiSavedKeyPlaceholder: 'Key saved; enter a new key to replace it',
    aiStorageHint: 'Saved for this browser session, never sent to YouTube',
    aiStorageRememberedHint: 'Saved on this device and retained after closing the browser',
    aiRememberKey: 'Keep the key after closing the browser',
    aiFallback: 'Use standard translation if AI is unavailable',
    aiTest: 'Test connection',
    aiClear: 'Clear key',
    aiApply: 'Apply key',
    aiShow: 'Show',
    aiHide: 'Hide',
    aiNotConfigured: 'Not configured',
    aiConfigured: 'Configured',
    aiConfiguredSession: 'Configured: using the key saved for this browser session',
    aiConfiguredDevice: 'Configured: using the key saved on this device',
    aiTesting: 'Testing…',
    aiTestSuccess: 'Connected, key is valid',
    aiApplied: 'Key applied; AI enhancement is on',
    aiMissingKey: 'Enter an API key first',
    aiInvalidKey: 'Invalid key or access denied',
    aiRateLimited: 'Gemini returned 429: quota exhausted or temporarily rate-limited',
    aiNetworkError: 'Network connection failed',
    aiTimeout: 'Connection timed out; check your network or proxy',
    aiExtensionError: 'Extension background did not respond; reload it at chrome://extensions',
    aiRequestFailed: 'Connection failed',
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
    aiSection: 'Mejora con IA',
    aiProvider: 'Proveedor',
    aiGemini: 'Google Gemini',
    aiApiKey: 'Clave API',
    aiKeyPlaceholder: 'Pega tu clave API de Gemini',
    aiSavedKeyPlaceholder: 'Clave guardada; introduce otra para reemplazarla',
    aiStorageHint: 'Guardada durante esta sesión, nunca se envía a YouTube',
    aiStorageRememberedHint: 'Guardada en este dispositivo incluso al cerrar el navegador',
    aiRememberKey: 'Conservar la clave al cerrar el navegador',
    aiFallback: 'Usar traducción estándar si la IA no está disponible',
    aiTest: 'Probar conexión',
    aiClear: 'Borrar clave',
    aiApply: 'Aplicar clave',
    aiShow: 'Mostrar',
    aiHide: 'Ocultar',
    aiNotConfigured: 'Sin configurar',
    aiConfigured: 'Configurada',
    aiConfiguredSession: 'Configurada: usando la clave guardada para esta sesión',
    aiConfiguredDevice: 'Configurada: usando la clave guardada en este dispositivo',
    aiTesting: 'Probando…',
    aiTestSuccess: 'Conectado, clave válida',
    aiApplied: 'Clave aplicada; la mejora con IA está activa',
    aiMissingKey: 'Introduce primero una clave API',
    aiInvalidKey: 'Clave no válida o acceso denegado',
    aiRateLimited: 'Gemini devolvió 429: cuota agotada o límite temporal',
    aiNetworkError: 'Falló la conexión de red',
    aiTimeout: 'La conexión agotó el tiempo; revisa tu red o proxy',
    aiExtensionError: 'El fondo de la extensión no respondió; recárgala en chrome://extensions',
    aiRequestFailed: 'Falló la conexión',
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
let isCCAvailable = false;
let settingsTabId = null;

let preResetSettings = null; 
let undoTimeout = null;      
let countdownInterval = null;
const RANGE_STORAGE_DEBOUNCE_MS = 150;
let pendingStorageChanges = {};
let storageDebounceTimer = null;

document.addEventListener('DOMContentLoaded', () => {
  updateCCAvailabilityUI(false);
  requestCCAvailability();

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

  loadAiSettings();
});

function loadAiSettings() {
  const fields = Object.keys(aiDefaultSettings);
  chrome.storage.local.get([...fields, AI_KEY_STORAGE_FIELD], (localData) => {
    fields.forEach((field) => {
      if (localData[field] !== undefined) aiSettings[field] = localData[field];
    });

    aiSessionStorage.get(AI_KEY_STORAGE_FIELD, (sessionData) => {
      const rememberedKey = String(localData[AI_KEY_STORAGE_FIELD] || '').trim();
      const sessionKey = String(sessionData[AI_KEY_STORAGE_FIELD] || '').trim();
      aiKeyValue = aiSettings.aiRememberKey ? rememberedKey : sessionKey;
      aiSettings.aiApiKeyConfigured = Boolean(aiKeyValue);
      aiStatusKey = aiKeyValue
        ? (aiSettings.aiRememberKey ? 'aiConfiguredDevice' : 'aiConfiguredSession')
        : 'aiNotConfigured';
      applyAiSettingsToUI();
      bindAiEvents();
    });
  });
}

function applyAiSettingsToUI() {
  document.getElementById('aiEnabled').checked = Boolean(aiSettings.aiEnabled);
  document.getElementById('aiProvider').value = aiSettings.aiProvider;
  document.getElementById('aiRememberKey').checked = Boolean(aiSettings.aiRememberKey);
  document.getElementById('aiFallback').checked = Boolean(aiSettings.aiFallback);
  const keyInput = document.getElementById('aiApiKey');
  keyInput.value = '';
  updateAiKeyStorageUI();
  setAiStatus(aiStatusKey, aiStatusType);
}

function updateAiKeyStorageUI() {
  const dict = i18nDict[currentUiLang] || i18nDict.en;
  const keyInput = document.getElementById('aiApiKey');
  const storageHint = document.querySelector('.ai-storage-hint');
  if (keyInput) {
    keyInput.placeholder = aiKeyValue
      ? dict.aiSavedKeyPlaceholder
      : dict.aiKeyPlaceholder;
  }
  if (storageHint) {
    storageHint.textContent = aiSettings.aiRememberKey
      ? dict.aiStorageRememberedHint
      : dict.aiStorageHint;
  }
}

function setAiStatus(messageKey, type = '') {
  aiStatusKey = messageKey;
  aiStatusType = type;
  const status = document.getElementById('aiStatus');
  const dict = i18nDict[currentUiLang] || i18nDict.en;
  status.textContent = dict[messageKey] || '';
  status.className = `ai-status${type ? ` ${type}` : ''}`;
}

function saveAiSettings(changes) {
  Object.assign(aiSettings, changes);
  chrome.storage.local.set(changes);
}

function persistAiKey(onComplete) {
  // Chrome versions with storage.session keep non-remembered keys out of disk.
  // The local fallback is only for older browsers that do not expose session storage.
  const useLocalStorage = aiSettings.aiRememberKey || !hasSessionStorage;
  const targetStorage = useLocalStorage ? chrome.storage.local : aiSessionStorage;
  const otherStorage = useLocalStorage ? aiSessionStorage : chrome.storage.local;
  const finish = () => {
    if (onComplete) onComplete();
  };

  if (otherStorage !== targetStorage) otherStorage.remove(AI_KEY_STORAGE_FIELD);
  if (aiKeyValue) targetStorage.set({ [AI_KEY_STORAGE_FIELD]: aiKeyValue }, finish);
  else targetStorage.remove(AI_KEY_STORAGE_FIELD, finish);
}

function bindAiEvents() {
  const details = document.getElementById('aiSettingsArea');
  const summary = details.querySelector('.ai-summary');
  const enabled = document.getElementById('aiEnabled');
  const enabledSwitch = enabled.closest('.switch');
  const keyInput = document.getElementById('aiApiKey');
  const toggleKey = document.getElementById('aiToggleKey');
  const rememberKey = document.getElementById('aiRememberKey');
  const fallback = document.getElementById('aiFallback');
  const testButton = document.getElementById('aiTestConnection');
  const applyButton = document.getElementById('aiApplyKey');
  const scrollArea = document.getElementById('settingsScrollArea');

  const updateAiExpansionLayout = () => {
    document.body.classList.toggle('ai-expanded', details.open);
    if (!details.open) {
      scrollArea.scrollTo({ top: 0, behavior: 'auto' });
      return;
    }
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const scrollRect = scrollArea.getBoundingClientRect();
        const detailsRect = details.getBoundingClientRect();
        scrollArea.scrollTo({
          top: Math.max(0, scrollArea.scrollTop + detailsRect.top - scrollRect.top - 8),
          behavior: 'smooth'
        });
      });
    });
  };
  details.open = enabled.checked;
  summary.addEventListener('click', (event) => {
    if (!event.target.closest('.switch')) event.preventDefault();
  });
  details.addEventListener('toggle', updateAiExpansionLayout);
  updateAiExpansionLayout();

  enabledSwitch.addEventListener('click', (event) => event.stopPropagation());
  enabled.addEventListener('change', () => {
    saveAiSettings({ aiEnabled: enabled.checked });
    details.open = enabled.checked;
  });

  keyInput.addEventListener('input', () => {
    aiKeyValue = keyInput.value.trim();
    updateAiKeyStorageUI();
    setAiStatus(aiKeyValue ? 'aiConfigured' : 'aiNotConfigured');
  });
  keyInput.addEventListener('change', () => persistAiKey());

  toggleKey.addEventListener('click', () => {
    const show = keyInput.type === 'password';
    if (show && !keyInput.value && aiKeyValue) keyInput.value = aiKeyValue;
    keyInput.type = show ? 'text' : 'password';
    toggleKey.textContent = (i18nDict[currentUiLang] || i18nDict.en)[show ? 'aiHide' : 'aiShow'];
  });

  rememberKey.addEventListener('change', () => {
    saveAiSettings({ aiRememberKey: rememberKey.checked });
    persistAiKey();
    updateAiKeyStorageUI();
    if (aiKeyValue) {
      setAiStatus(rememberKey.checked ? 'aiConfiguredDevice' : 'aiConfiguredSession');
    }
  });

  fallback.addEventListener('change', () => {
    saveAiSettings({ aiFallback: fallback.checked });
  });

  document.getElementById('aiClearKey').addEventListener('click', () => {
    aiKeyValue = '';
    keyInput.value = '';
    keyInput.type = 'password';
    chrome.storage.local.remove(AI_KEY_STORAGE_FIELD);
    aiSessionStorage.remove(AI_KEY_STORAGE_FIELD);
    updateAiKeyStorageUI();
    setAiStatus('aiNotConfigured');
  });

  applyButton.addEventListener('click', () => {
    if (!aiKeyValue) {
      setAiStatus('aiMissingKey', 'error');
      keyInput.focus();
      return;
    }

    applyButton.disabled = true;
    persistAiKey(() => {
      applyButton.disabled = false;
      enabled.checked = true;
      details.open = true;
      saveAiSettings({ aiEnabled: true });
      setAiStatus('aiApplied', 'success');
    });
  });

  testButton.addEventListener('click', () => {
    if (!aiKeyValue) {
      setAiStatus('aiMissingKey', 'error');
      keyInput.focus();
      return;
    }

    persistAiKey();
    testButton.disabled = true;
    setAiStatus('aiTesting');
    chrome.runtime.sendMessage({ action: 'test_gemini_key', apiKey: aiKeyValue }, (response) => {
      testButton.disabled = false;
      if (chrome.runtime.lastError) {
        setAiStatus('aiExtensionError', 'error');
        return;
      }
      if (response?.ok) {
        setAiStatus('aiTestSuccess', 'success');
        return;
      }
      const errorKeys = {
        missing_key: 'aiMissingKey',
        invalid_key: 'aiInvalidKey',
        rate_limited: 'aiRateLimited',
        network_error: 'aiNetworkError',
        timeout: 'aiTimeout'
      };
      const statusSuffix = response?.status ? ` (${response.status})` : '';
      setAiStatus(errorKeys[response?.code] || 'aiRequestFailed', 'error');
      if (statusSuffix) {
        const status = document.getElementById('aiStatus');
        status.textContent += statusSuffix;
      }
    });
  });
}

function updateCCAvailabilityUI(ccAvailable) {
  isCCAvailable = Boolean(ccAvailable);
  const enabledSwitch = document.getElementById('enabled');
  if (!enabledSwitch) return;

  enabledSwitch.disabled = !isCCAvailable;
  const switchLabel = enabledSwitch.closest('.switch');
  if (switchLabel) {
    switchLabel.classList.toggle('disabled', !isCCAvailable);
    switchLabel.setAttribute('aria-disabled', String(!isCCAvailable));
  }

  updateSubSettingsArea(Boolean(tempSettings.enabled) && isCCAvailable);
}

function requestCCAvailability() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const activeTab = tabs[0];
    if (!activeTab?.id) {
      settingsTabId = null;
      updateCCAvailabilityUI(false);
      return;
    }

    settingsTabId = activeTab.id;
    chrome.tabs.sendMessage(activeTab.id, { action: 'get_cc_availability' }, (response) => {
      if (chrome.runtime.lastError) {
        updateCCAvailabilityUI(false);
        return;
      }
      updateCCAvailabilityUI(response?.ccAvailable);
    });
  });
}

chrome.runtime.onMessage.addListener((message, sender) => {
  if (
    message?.action === 'cc_availability_changed' &&
    sender.tab?.id === settingsTabId
  ) {
    updateCCAvailabilityUI(message.ccAvailable);
  }
});

function saveSettings(changes) {
  Object.assign(tempSettings, changes);
  Object.keys(changes).forEach((key) => delete pendingStorageChanges[key]);
  if (!Object.keys(pendingStorageChanges).length) {
    clearTimeout(storageDebounceTimer);
    storageDebounceTimer = null;
  }
  chrome.storage.local.set(changes);
}

function flushPendingSettings() {
  clearTimeout(storageDebounceTimer);
  storageDebounceTimer = null;
  if (!Object.keys(pendingStorageChanges).length) return;

  const changes = pendingStorageChanges;
  pendingStorageChanges = {};
  chrome.storage.local.set(changes);
}

function saveSettingsDebounced(changes) {
  Object.assign(tempSettings, changes);
  Object.assign(pendingStorageChanges, changes);
  clearTimeout(storageDebounceTimer);
  storageDebounceTimer = setTimeout(flushPendingSettings, RANGE_STORAGE_DEBOUNCE_MS);
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

  updateSubSettingsArea(settingsObj.enabled && isCCAvailable);
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

  document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (dict[key]) el.setAttribute('placeholder', dict[key]);
  });

  if (document.getElementById('aiStatus')) setAiStatus(aiStatusKey, aiStatusType);
  if (document.getElementById('aiApiKey')) updateAiKeyStorageUI();
  const keyToggle = document.getElementById('aiToggleKey');
  if (keyToggle) {
    keyToggle.textContent = (document.getElementById('aiApiKey')?.type === 'text')
      ? (dict.aiHide || 'Hide')
      : (dict.aiShow || 'Show');
  }

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
        
        if (f === 'enabled') updateSubSettingsArea(el.checked && isCCAvailable);
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

        if (el.type === 'range') saveSettingsDebounced(changes);
        else saveSettings(changes);
      });

      if (el.type === 'range') {
        el.addEventListener('change', flushPendingSettings);
      }
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
      saveSettings(tempSettings);
      
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
    saveSettings(tempSettings);

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

window.addEventListener('pagehide', () => {
  flushPendingSettings();
  persistAiKey();
});

if (window.self !== window.top) {
  document.addEventListener('DOMContentLoaded', () => {
    if (!document.body) return;

    const parentOrigin = (window.location.ancestorOrigins && window.location.ancestorOrigins[0]) || '*';
    let resizeFrame = null;
    const notifyParentResize = () => {
      if (resizeFrame !== null) cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(() => {
        resizeFrame = null;
        // scrollHeight is never smaller than the iframe viewport. Measure the
        // final content edge so a collapsed details element can shrink an iframe
        // that was previously expanded.
        window.parent.postMessage({
          action: 'lasdoscas_resize',
          height: 580
        }, parentOrigin);
      });
    };

    const resizeObserver = new ResizeObserver(notifyParentResize);
    
    resizeObserver.observe(document.getElementById('popupContent'));
    document.getElementById('aiSettingsArea')?.addEventListener('toggle', notifyParentResize);
    window.addEventListener('load', notifyParentResize, { once: true });
    notifyParentResize();
  });
}
