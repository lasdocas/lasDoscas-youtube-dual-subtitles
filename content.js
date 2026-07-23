let isOrphaned = false;
let fullscreenSettingsIframe = null; 

// ==========================================
// 🚀 源语言状态与多语言提示字典
// ==========================================
let currentSourceLang = 'en';
let loadingMessageVisible = false;
const loadingMessageDict = Object.freeze({
  'zh-cn': 'lasDoscas 正在为您加载双语字幕',
  'zh-tw': 'lasDoscas 正在為您載入雙語字幕',
  zh: 'lasDoscas 正在为您加载双语字幕',
  en: 'lasDoscas is loading bilingual subtitles',
  es: 'lasDoscas está cargando subtítulos bilingües',
  fr: 'lasDoscas charge vos sous-titres bilingues',
  'fr-ca': 'lasDoscas charge vos sous-titres bilingues',
  de: 'lasDoscas lädt zweisprachige Untertitel',
  ja: 'lasDoscas が二言語字幕を読み込んでいます',
  ko: 'lasDoscas가 이중 언어 자막을 불러오는 중입니다',
  pt: 'lasDoscas está carregando legendas bilíngues',
  id: 'lasDoscas sedang memuat subtitel dwibahasa',
  ms: 'lasDoscas sedang memuatkan sari kata dwibahasa',
  ru: 'lasDoscas загружает двуязычные субтитры',
  ar: 'lasDoscas يقوم بتحميل الترجمة الثنائية',
  hi: 'lasDoscas द्विभाषी उपशीर्षक लोड कर रहा है',
  ta: 'lasDoscas இருமொழி வசனங்களை ஏற்றுகிறது',
  th: 'lasDoscas กำลังโหลดคำบรรยายสองภาษา',
  vi: 'lasDoscas đang tải phụ đề song ngữ',
  tr: 'lasDoscas iki dilli altyazıları yüklüyor',
  pl: 'lasDoscas ładuje napisy dwujęzyczne',
  nl: 'lasDoscas laadt dubbele ondertitels',
  sv: 'lasDoscas läser in tvåspråkiga undertexter',
  da: 'lasDoscas indlæser tosprogede undertekster',
  no: 'lasDoscas laster inn tospråklige undertekster',
  fi: 'lasDoscas lataa kaksikielisiä tekstityksiä',
  it: 'lasDoscas sta caricando i sottotitoli bilingue',
  ro: 'lasDoscas încarcă subtitrări bilingve',
  hu: 'lasDoscas kétnyelvű feliratokat tölt be',
  cs: 'lasDoscas načítá dvojjazyčné titulky',
  hr: 'lasDoscas učitava dvojezične titlove',
  el: 'lasDoscas φορτώνει δίγλωσσους υπότιτλους',
  iw: 'lasDoscas טוען כתוביות דו-לשוניות',
  tl: 'Nilo-load ng lasDoscas ang dalawang-wikang subtitle',
  uk: 'lasDoscas завантажує двомовні субтитри',
  eu: 'lasDoscas elebitza-azpitituluak kargatzen ari da',
  ca: 'lasDoscas està carregant subtítols bilingües',
  gl: 'lasDoscas está cargando subtítulos bilingües',
  is: 'lasDoscas hleður tvítyngdum textum',
  sw: 'lasDoscas inapakia manukuu ya lugha mbili',
  et: 'lasDoscas laadib kakskeelseid subtiitreid',
  lv: 'lasDoscas ielādē divvalodu subtitrus',
  lt: 'lasDoscas įkelia dvikalbius subtitrus',
  sk: 'lasDoscas načítava dvojjazyčné titulky',
  sl: 'lasDoscas nalaga dvojezične podnapise',
  bg: 'lasDoscas зарежда двуезични субтитри',
  sr: 'lasDoscas učitava dvojezične titlove',
  ur: 'lasDoscas دو لسانی سب ٹائٹلز لوڈ کر رہا ہے',
  fa: 'lasDoscas زیرنویس دوزبانه را بارگذاری می‌کند',
  mr: 'lasDoscas द्विभाषिक उपशीर्षके लोड करत आहे',
  bn: 'lasDoscas দ্বিভাষিক সাবটাইটেল লোড করছে',
  gu: 'lasDoscas દ્વિભાષી સબટાઇટલ લોડ કરી રહ્યું છે',
  te: 'lasDoscas ద్విభాషా ఉపశీర్షికలను లోడ్ చేస్తోంది',
  kn: 'lasDoscas ದ್ವಿಭಾಷಾ ಉಪಶೀರ್ಷಿಕೆಗಳನ್ನು ಲೋಡ್ ಮಾಡುತ್ತಿದೆ',
  ml: 'lasDoscas ദ്വിഭാഷാ സബ്‌ടൈറ്റിലുകൾ ലോഡ് ചെയ്യുന്നു',
  am: 'lasDoscas ባለሁለት ቋንቋ ንዑስ ርዕሶችን በመጫን ላይ ነው'
});

function getLoadingMessage() {
  const language = (currentSettings.lang || 'en').toLowerCase();
  const prefix = language.split('-')[0];
  return loadingMessageDict[language] || loadingMessageDict[prefix] || loadingMessageDict.en;
}

function isSpaceDelimitedLang(langCode) {
  if (!langCode) return true;
  const noSpaceLangs = ['ja', 'zh', 'zh-Hans', 'zh-Hant', 'zh-TW', 'zh-CN', 'ko'];
  return !noSpaceLangs.includes(langCode);
}

function getHintMessage(targetLang) {
  const lang = targetLang || 'en';
  const prefix = lang.toLowerCase().split('-')[0];

  const dict = {
    'zh-CN': "[当前为自动生成字幕，已开启实时原声同步]",
    'zh-TW': "[當前為自動生成字幕，已開啟實時原聲同步]",
    'zh': "[当前为自动生成字幕，已开启实时原声同步]",
    'es': "[Autogenerado: Sincronización en tiempo real activada]",
    'fr': "[Sous-titres générés automatiquement: synchronisation en temps réel]",
    'fr-CA': "[Sous-titres générés automatiquement: synchronisation en temps réel activée]",
    'de': "[Automatisch erzeugte Untertitel: Echtzeitsynchronisation]",
    'ja': "[自動生成字幕：リアルタイム同期が有効です]",
    'ko': "[자동 생성 자막: 실시간 동기화 활성화됨]",
    'pt': "[Gerado automaticamente: Sincronização em tempo real ativada]",
    'id': "[Dihasilkan otomatis: Sinkronisasi waktu nyata diaktifkan]",
    'ms': "[Dijana secara automatik: Penyegerakan masa nyata diaktifkan]",
    'ru': "[Автоматические субтитры: синхронизация в реальном времени]",
    'ar': "[تم الإنشاء تلقائيًا: تمت تمكين المزامنة في الوقت الفعلي]",
    'hi': "[स्वतः उत्पन्न: रीयल-टाइम सिंक सक्षम]",
    'ta': "[தானாக உருவாக்கப்பட்டவை: நிகழ்நேர ஒத்திசைவு இயக்கப்பட்டது]",
    'th': "[สร้างอัตโนมัติ: เปิดใช้งานการซิงค์แบบเรียลไทม์]",
    'vi': "[Được tạo tự động: Đã bật đồng bộ hóa theo thời gian thực]",
    'tr': "[Otomatik oluşturuldu: Gerçek zamanlı senkronizasyon etkin]",
    'pl': "[Wygenerowano automatycznie: Włączono synchronizację w czasie rzeczywistym]",
    'nl': "[Automatisch gegenereerd: Realtime synchronisatie ingeschakeld]",
    'sv': "[Autogenererad: Realtidssynkronisering aktiverad]",
    'da': "[Automatisk genereret: Realtidssynkronisering aktiveret]",
    'no': "[Autogenerert: Sanntidssynkronisering aktivert]",
    'fi': "[Automaattisesti luotu: Reaaliaikainen synkronointi käytössä]",
    'it': "[Generato automaticamente: Sincronizzazione in tempo reale attivata]",
    'ro': "[Generat automat: Sincronizare în timp real activată]",
    'hu': "[Automatikusan generált: Valós idejű szinkronizálás bekapcsolva]",
    'cs': "[Automaticky generováno: Synchronizace v reálném čase povolena]",
    'hr': "[Automatski generirano: Omogućena sinkronizacija u stvarnom vremenu]",
    'el': "[Αυτόματη δημιουργία: Ενεργοποιήθηκε ο συγχρονισμός σε πραγματικό χρόνο]",
    'iw': "[נוצר אוטומטית: סנכרון בזמן אמת מופעל]",
    'tl': "[Awtomatikong nabuo: Na-enable ang real-time na pag-sync]",
    'uk': "[Автоматично згенеровано: увімкнено синхронізацію в реальному часі]",
    'eu': "[Automatikoki sortua: Denbora errealeko sinkronizazioa gaituta]",
    'ca': "[Autogenerat: Sincronització en temps real activada]",
    'gl': "[Xerado automaticamente: Sincronización en tempo real activada]",
    'is': "[Sjálfvirkt framleitt: Rauntímasamstilling virk]",
    'sw': "[Imetolewa kiotomatiki: Usawazishaji wa wakati halisi umewezeshwa]",
    'et': "[Automaatselt loodud: Reaalajas sünkroonimine on lubatud]",
    'lv': "[Automātiski ģenerēts: Iespējota reāllaika sinhronizācija]",
    'lt': "[Automatiškai sugeneruota: Įjungtas sinchronizavimas realiuoju laiku]",
    'sk': "[Automaticky generované: Synchronizácia v reálnom čase povolená]",
    'sl': "[Samodejno ustvarjeno: Omogočena sinhronizacija v realnem času]",
    'bg': "[Автоматично генерирано: Синхронизирането в реално време е активирано]",
    'sr': "[Аутоматски генерисано: Синхронизација у реалном времену је омогућена]",
    'ur': "[خود بخود تیار کردہ: ریئل ٹائم مطابقت پذیری فعال ہے]",
    'fa': "[تولید خودکار: همگام‌سازی بی‌درنگ فعال شد]",
    'mr': "[स्वयंचलितपणे व्युत्पन्न: रिअल-टाइम सिंक सक्षम]",
    'bn': "[স্বয়ংক্রিয়ভাবে তৈরি: রিয়েল-টাইম সিঙ্ক সক্ষম করা হয়েছে]",
    'gu': "[આપોઆપ જનરેટ થયેલ: રીઅલ-ટાઇમ સિંક સક્ષમ]",
    'te': "[స్వయంచాలకంగా రూపొందించబడింది: నిజ-సమయ సమకాలీకరణ ప్రారంభించబడింది]",
    'kn': "[ಸ್ವಯಂಚಾಲಿತವಾಗಿ ರಚಿಸಲಾಗಿದೆ: ನೈಜ-ಸಮಯದ ಸಿಂಕ್ ಸಕ್ರಿಯಗೊಳಿಸಲಾಗಿದೆ]",
    'ml': "[സ്വയമേവ സൃഷ്‌ടിച്ചത്: തത്സമയ സമന്വയം പ്രവർത്തനക്ഷമമാക്കി]",
    'am': "[በራስ-ሰር የተፈጠረ፡ የእውነተኛ ጊዜ ማመሳሰል ነቅቷል]",
    'en': "[Auto-generated: Real-time sync enabled]"
  };

  return dict[lang] || dict[prefix] || dict['en'];
}

function getAutoTranslateSelectionMessage(targetLang) {
  const lang = targetLang || 'en';
  const prefix = lang.toLowerCase().split('-')[0];
  const dict = {
    'zh-CN': '[请在 YouTube 字幕菜单中选择字幕或“自动生成”字幕，以便 lasDoscas 正常提供双语字幕]',
    'zh-TW': '[請在 YouTube 字幕選單中選擇字幕或「自動產生」字幕，以便 lasDoscas 正常提供雙語字幕]',
    'zh': '[请在 YouTube 字幕菜单中选择字幕或“自动生成”字幕，以便 lasDoscas 正常提供双语字幕]',
    'en': '[Choose a caption track or an auto-generated caption track in YouTube so lasDoscas can provide bilingual subtitles]',
    'es': '[Selecciona una pista de subtítulos o de subtítulos generados automáticamente en YouTube para usar los subtítulos bilingües de lasDoscas]',
    'fr': '[Choisissez une piste de sous-titres ou de sous-titres générés automatiquement dans YouTube pour utiliser les sous-titres bilingues de lasDoscas]',
    'de': '[Wählen Sie in YouTube eine Untertitelspur oder eine automatisch erzeugte Untertitelspur aus, damit lasDoscas zweisprachige Untertitel anzeigen kann]',
    'ja': '[lasDoscas の二言語字幕を利用するには、YouTube で字幕または自動生成字幕を選択してください]',
    'ko': '[lasDoscas 이중 언어 자막을 사용하려면 YouTube에서 자막 또는 자동 생성 자막을 선택하세요]',
    'pt': '[Selecione uma faixa de legendas ou de legendas geradas automaticamente no YouTube para usar as legendas bilíngues do lasDoscas]',
    'ru': '[Выберите обычные или автоматически созданные субтитры в YouTube, чтобы lasDoscas мог показывать двуязычные субтитры]',
    'ar': '[اختر مسار ترجمة مصاحبة أو ترجمة مصاحبة تم إنشاؤها تلقائيًا في YouTube ليتمكن lasDoscas من عرض ترجمة ثنائية اللغة]',
    'hi': '[lasDoscas के द्विभाषी उपशीर्षक उपयोग करने के लिए YouTube में उपशीर्षक या अपने-आप बने उपशीर्षक चुनें]',
    'id': '[Pilih trek subtitel atau subtitel yang dibuat otomatis di YouTube agar lasDoscas dapat menampilkan subtitel dwibahasa]',
    'vi': '[Hãy chọn phụ đề hoặc phụ đề được tạo tự động trong YouTube để lasDoscas có thể hiển thị phụ đề song ngữ]',
    'it': '[Seleziona una traccia di sottotitoli o di sottotitoli generati automaticamente in YouTube per usare i sottotitoli bilingui di lasDoscas]',
    'tr': '[lasDoscas iki dilli altyazıları kullanmak için YouTube’da bir altyazı parçası veya otomatik oluşturulan altyazı parçası seçin]',
    'pl': '[Wybierz w YouTube ścieżkę napisów lub automatycznie wygenerowaną ścieżkę napisów, aby lasDoscas mógł wyświetlać napisy dwujęzyczne]',
    'nl': '[Selecteer in YouTube een ondertitelspoor of een automatisch gegenereerd ondertitelspoor zodat lasDoscas tweetalige ondertitels kan tonen]'
  };
  return dict[lang] || dict[prefix] || dict.en;
}

function dieQuietly() {
  if (isOrphaned) return;
  isOrphaned = true; 
  
  if (observer) observer.disconnect();
  if (flexyObserver) flexyObserver.disconnect();
  if (playerResizeObserver) playerResizeObserver.disconnect();
  if (ccButtonObserver) ccButtonObserver.disconnect();
  if (containerMonitor) clearInterval(containerMonitor);
  if (playerControlMonitor) clearInterval(playerControlMonitor);
  cancelTrackLoad();
  stopFileRenderer();
  resetLiveAsrBuffer();
  
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

function isYouTubeWatchPage() {
  return window.location.pathname === '/watch' && new URLSearchParams(window.location.search).has('v');
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
    'sw', 'et', 'lv', 'lt', 'sk', 'sl', 'bg', 'sr', 'ur', 'fa', 
    'mr', 'bn', 'gu', 'te', 'kn', 'ml', 'am'
  ];
  if (supportedPrefixes.includes(prefix)) return prefix;
  return 'en';
}

let lastText = "";
let lastMatchedSource = "";
let observer = null;
let flexyObserver = null;
let playerResizeObserver = null; 
let ccButtonObserver = null; 
let playerPluginControl = null;
let playerPluginSwitch = null;
let playerControlMonitor = null;

let currentCaptionContainer = null;
let containerMonitor = null;

const TRACK_MODE = Object.freeze({
  UNKNOWN: 'UNKNOWN',
  DISCOVERING: 'DISCOVERING',
  YOUTUBE_AUTO_TRANSLATE: 'YOUTUBE_AUTO_TRANSLATE',
  FILE_WARMING: 'FILE_WARMING',
  FILE_READY: 'FILE_READY',
  LIVE_ASR: 'LIVE_ASR',
  NO_CAPTIONS: 'NO_CAPTIONS',
  RETRYABLE_ERROR: 'RETRYABLE_ERROR'
});

const PLAYER_BRIDGE_SOURCE = 'lasdoscas-player-bridge-v1';
const PLAYER_SNAPSHOT_TIMEOUT_MS = 1500;
const TRACK_RETRY_DELAYS_MS = [350, 900, 1800, 3200];
const YOUTUBE_TRANSLATION_WARMUP_MS = 300;
const INITIAL_TRANSLATION_LOOKAHEAD = 6;
const PRELOAD_BATCH_DELAY_MS = 80;
const DOM_TRANSLATION_DEBOUNCE_MS = 80;
const LIVE_ASR_PREFETCH_MS = 120;
const LIVE_ASR_COMMIT_STABILITY_MS = 260;
const FILE_RENDER_INTERVAL_MS = 50;

let trackMode = TRACK_MODE.UNKNOWN;
let isAutoGenerated = false;
let currentTrackKey = '';
let trackLoadGeneration = 0;
let trackAbortController = null;
let trackRetryTimer = null;
let fileRendererTimer = null;
let currentCueIndex = -1;
let pendingFileCueIndex = -1;
let renderedFileCueIndex = -1;
let bridgeRequestSequence = 0;
const bridgeRequests = new Map();
const inflightTranslations = new Map();

let preloadedTranslations = new Map();
let preloadedSentencesList = [];

let currentSettings = {
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
    if (changes.showTrans && trackMode === TRACK_MODE.FILE_READY) {
      pendingFileCueIndex = -1;
      renderedFileCueIndex = -1;
      renderFileCue();
    }
    if (changes.lang || changes.enabled) {
      lastText = ""; 
      lastMatchedSource = "";
      if (currentSettings.enabled) {
        preloadedTranslations.clear();
        beginTrackLoad('settings changed');
      } else {
        cancelTrackLoad();
        stopFileRenderer();
        resetLiveAsrBuffer();
      }
    }
  });
} catch (e) {
  dieQuietly();
}

function syncPluginState() {
  if (isOrphaned) return;
  const shouldRun = currentSettings.enabled && isYouTubeWatchPage();

  document.body.setAttribute('data-yt-dual-sub-active', shouldRun ? 'true' : 'false');
  initCCButtonObserver();
  
  const wrapper = document.querySelector('.custom-subtitle-wrapper');
  if (!shouldRun) {
    loadingMessageVisible = false;
    if (wrapper) wrapper.remove();
    if (flexyObserver) flexyObserver.disconnect();
    if (playerResizeObserver) playerResizeObserver.disconnect();
    
    if (observer) observer.disconnect();
    if (containerMonitor) clearInterval(containerMonitor);
    cancelTrackLoad();
    stopFileRenderer();
    resetLiveAsrBuffer();
    currentCaptionContainer = null;
    
    clearSubtitleContent();
    return;
  }

  triggerLayoutUpdate();
  startContainerMonitor();
  initLayoutObserver(); 
  initPlayerResizeObserver(); 
}

function showLoadingMessage() {
  loadingMessageVisible = true;
  lastText = getLoadingMessage();
  lastMatchedSource = '';
  const wrapper = ensureSubtitleContainer();
  if (!wrapper) {
    setTimeout(() => {
      if (loadingMessageVisible && currentSettings.enabled && isYouTubeWatchPage() && !isOrphaned) {
        showLoadingMessage();
      }
    }, 150);
    return;
  }
  updateSubtitleContent('\u00A0', getSecondSubtitleStatusHtml(lastText), true);
  applyStylesToDOM();
}

function hideLoadingMessage() {
  const wasVisible = loadingMessageVisible;
  loadingMessageVisible = false;
  if (wasVisible) applyStylesToDOM();
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
  const forceStatusLayout = loadingMessageVisible || trackMode === TRACK_MODE.YOUTUBE_AUTO_TRANSLATE;

  if (sourceText) {
    sourceText.style.setProperty('font-family', currentSettings.font, 'important');
    sourceText.style.setProperty('color', currentSettings.srcColor, 'important');
    sourceText.style.setProperty('font-weight', isSrcBold ? '800' : '400', 'important'); 
    sourceText.style.setProperty('--user-scale', srcScale, 'important');
    sourceText.style.setProperty(
      'display',
      currentSettings.showSrc || forceStatusLayout ? 'block' : 'none',
      'important'
    );
    
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
    transText.style.setProperty(
      'display',
      currentSettings.showTrans || forceStatusLayout ? 'block' : 'none',
      'important'
    );
    
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
  const canRenderWithoutCc = trackMode === TRACK_MODE.FILE_READY ||
    trackMode === TRACK_MODE.LIVE_ASR ||
    trackMode === TRACK_MODE.RETRYABLE_ERROR ||
    trackMode === TRACK_MODE.YOUTUBE_AUTO_TRANSLATE;
  const isFullscreen = wrapper.getAttribute('data-layout-mode') === 'fullscreen';
  
  const isEmpty = !lastText && !lastMatchedSource;
  const bothHidden = !loadingMessageVisible &&
    !currentSettings.showSrc &&
    !currentSettings.showTrans &&
    trackMode !== TRACK_MODE.YOUTUBE_AUTO_TRANSLATE;

  if (bothHidden || (!canRenderWithoutCc && !lastText && !lastMatchedSource && !loadingMessageVisible)) {
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

function findPlayerSubtitleButton() {
  return document.querySelector(
    '.ytp-subtitles-button, ' +
    '#movie_player button[data-tooltip-target-id="ytp-subtitles-button"], ' +
    '#movie_player button[aria-label*="Subtitles"], ' +
    '#movie_player button[aria-label*="字幕"]'
  );
}

function getPlayerControlsContext() {
  const ccBtn = findPlayerSubtitleButton();
  const controls =
    ccBtn?.closest('.ytp-right-controls') ||
    document.querySelector('#movie_player .ytp-right-controls') ||
    ccBtn?.closest('.ytp-chrome-controls') ||
    ccBtn?.parentElement;
  return { ccBtn, controls };
}

function ensurePlayerPluginControl() {
  const { ccBtn, controls } = getPlayerControlsContext();
  if (!controls) return false;

  let control = controls.querySelector('.lasdoscas-player-control');
  if (!control) {
    control = document.createElement('div');
    control.className = 'lasdoscas-player-control';
    control.setAttribute('role', 'group');
    control.setAttribute('aria-label', 'lasDoscas controls');
    control.innerHTML = `
      <button type="button" class="lasdoscas-player-icon ytp-button" aria-label="lasDoscas settings" title="lasDoscas settings">
        <img alt="" src="${chrome.runtime.getURL('icon48.png')}">
      </button>
      <label class="lasdoscas-player-switch" title="Toggle lasDoscas subtitles">
        <input type="checkbox" aria-label="Toggle lasDoscas subtitles">
        <span></span>
      </label>
    `;
    ['pointerdown', 'mousedown', 'click', 'dblclick'].forEach((eventName) => {
      control.addEventListener(eventName, (event) => event.stopPropagation());
    });
    const iconButton = control.querySelector('.lasdoscas-player-icon');
    iconButton.addEventListener('click', () => {
      if (typeof toggleFullscreenSettings === 'function') toggleFullscreenSettings();
    });
    const input = control.querySelector('input');
    input.addEventListener('change', () => {
      if (isOrphaned) return;
      chrome.storage.local.set({ enabled: input.checked });
    });
    if (ccBtn && ccBtn.parentNode === controls) {
      controls.insertBefore(control, ccBtn.nextSibling);
    } else {
      controls.appendChild(control);
    }
  }

  playerPluginControl = control;
  playerPluginSwitch = control.querySelector('input');
  if (playerPluginSwitch) playerPluginSwitch.checked = Boolean(currentSettings.enabled);
  return true;
}

function initCCButtonObserver() {
  if (ccButtonObserver) ccButtonObserver.disconnect();
  if (playerControlMonitor) clearInterval(playerControlMonitor);
  playerControlMonitor = null;
  if (!isYouTubeWatchPage()) return;

  // YouTube can replace the entire chrome control tree without emitting a
  // navigation event. Keep a lightweight reconciliation pass so the plugin
  // switch is reattached after those player state changes as well.
  playerControlMonitor = setInterval(() => {
    if (!checkContext() || isOrphaned || !isYouTubeWatchPage()) return;
    ensurePlayerPluginControl();
  }, 1000);

  if (!ensurePlayerPluginControl()) {
    return;
  }

  const controls = playerPluginControl?.parentElement;
  if (!controls) return;
  ccButtonObserver = new MutationObserver(() => {
    if (!checkContext() || isOrphaned) return;
    ensurePlayerPluginControl();
  });
  ccButtonObserver.observe(controls.parentElement || controls, {
    childList: true,
    subtree: true
  });
}

function updateSubtitleContent(source, translated, isHtmlFlag = false) {
  if (isOrphaned) return;
  const wrapper = ensureSubtitleContainer();
  if (!wrapper) return;

  const sourceText = wrapper.querySelector('.custom-source-text');
  const transText = wrapper.querySelector('.custom-translated-text');

  if (sourceText) sourceText.textContent = source;
  if (transText) {
    if (isHtmlFlag && translated) {
        transText.innerHTML = translated;
    } else {
        transText.textContent = translated || "";
        if (!translated) transText.innerHTML = "&nbsp;";
    }
  }

  updateWrapperVisibility(); 
}

function clearSubtitleContent() {
  const wrapper = document.querySelector('.custom-subtitle-wrapper');
  if (!wrapper) return;
  
  lastText = loadingMessageVisible ? getLoadingMessage() : "";
  lastMatchedSource = "";

  const srcNode = wrapper.querySelector('.custom-source-text');
  const transNode = wrapper.querySelector('.custom-translated-text');
  
  if (srcNode) srcNode.innerHTML = "&nbsp;";
  if (transNode) {
    if (loadingMessageVisible) transNode.innerHTML = getSecondSubtitleStatusHtml(lastText);
    else transNode.innerHTML = "&nbsp;";
  }

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
    } else if (!actualContainer && currentCaptionContainer) {
      currentCaptionContainer = null;
      if (observer) observer.disconnect();
    }
  }, 1000);
}

let translateDebounceTimer = null;
let liveAsrCommitTimer = null;
let liveAsrPrefetchTimer = null;
let liveAsrClearTimer = null;
let liveAsrPendingText = '';
let liveAsrCommittedText = '';
let liveAsrRenderSequence = 0;
let liveAsrTranslationPending = false;

function normalizeCaptionText(text) {
  return (text || '')
    .replace(/>{2,}/g, ' ')
    .replace(/[\u200B-\u200F\u202A-\u202E\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function getNativeCaptionText(containerTarget) {
  const captionWindows = Array.from(containerTarget.querySelectorAll('.caption-window'));
  return normalizeCaptionText(captionWindows.map((captionWindow) => {
    const segments = Array.from(captionWindow.querySelectorAll('.ytp-caption-segment'));
    const joinChar = isSpaceDelimitedLang(currentSourceLang) ? ' ' : '';
    return segments.map((segment) => segment.textContent.trim()).join(joinChar);
  }).join(' '));
}

function getSecondSubtitleStatusHtml(message) {
  return `<span class="lasdoscas-status-message">${message}</span>`;
}

function getAutoGeneratedHintHtml() {
  if (!currentSettings.showTrans) return '';
  const promptMsg = getHintMessage(currentSettings.lang);
  return getSecondSubtitleStatusHtml(promptMsg);
}

function resetLiveAsrBuffer() {
  clearTimeout(liveAsrCommitTimer);
  clearTimeout(liveAsrPrefetchTimer);
  clearTimeout(liveAsrClearTimer);
  liveAsrCommitTimer = null;
  liveAsrPrefetchTimer = null;
  liveAsrClearTimer = null;
  liveAsrPendingText = '';
  liveAsrCommittedText = '';
  liveAsrTranslationPending = false;
  liveAsrRenderSequence += 1;
}

function commitLiveAsrSentence(text = liveAsrPendingText) {
  const finalText = normalizeCaptionText(text);
  if (!finalText || finalText === liveAsrCommittedText) return;

  liveAsrCommittedText = finalText;
  liveAsrPendingText = '';
  const renderSequence = ++liveAsrRenderSequence;
  const generation = trackLoadGeneration;
  const cachedTranslation = preloadedTranslations.get(finalText);

  const renderSentence = (translation, useHint = false) => {
    if (renderSequence !== liveAsrRenderSequence || generation !== trackLoadGeneration) return;
    hideLoadingMessage();
    lastText = finalText;
    lastMatchedSource = '';
    updateSubtitleContent(
      finalText,
      useHint ? getAutoGeneratedHintHtml() : translation,
      useHint
    );
  };

  if (!currentSettings.showTrans) {
    renderSentence('');
    return;
  }

  if (cachedTranslation) {
    renderSentence(cachedTranslation);
    return;
  }

  liveAsrTranslationPending = true;
  clearTimeout(liveAsrPrefetchTimer);
  ensureCueTranslation(finalText, generation).then((translationResult) => {
    if (renderSequence !== liveAsrRenderSequence || generation !== trackLoadGeneration) return;
    liveAsrTranslationPending = false;
    const translation = preloadedTranslations.get(finalText) || translationResult;
    if (translation) {
      preloadedTranslations.set(finalText, translation);
      renderSentence(translation);
    } else {
      // Network failures still paint both rows together, but use the existing
      // explanatory hint instead of letting the source line appear alone.
      renderSentence('', true);
    }
  });
}

function feedLiveAsrSnapshot(snapshot) {
  let nextText = normalizeCaptionText(snapshot);
  if (!nextText || nextText === liveAsrPendingText || nextText === liveAsrCommittedText) return;

  if (/[.!?。！？…]$/.test(liveAsrCommittedText) && nextText.startsWith(liveAsrCommittedText)) {
    nextText = normalizeCaptionText(nextText.slice(liveAsrCommittedText.length));
    if (!nextText) return;
  }

  clearTimeout(liveAsrCommitTimer);
  clearTimeout(liveAsrClearTimer);

  if (liveAsrPendingText && !nextText.startsWith(liveAsrPendingText)) {
    commitLiveAsrSentence(liveAsrPendingText);
  }

  liveAsrPendingText = nextText;
  if (/[.!?。！？…]$/.test(nextText)) {
    commitLiveAsrSentence(nextText);
    return;
  }

  clearTimeout(liveAsrPrefetchTimer);
  liveAsrPrefetchTimer = setTimeout(() => {
    const candidate = normalizeCaptionText(liveAsrPendingText);
    if (!candidate || candidate !== liveAsrPendingText || !currentSettings.showTrans) return;
    ensureCueTranslation(candidate, trackLoadGeneration);
  }, LIVE_ASR_PREFETCH_MS);

  // YouTube ASR usually appends words every 50-250 ms. Waiting for a short
  // stable window turns the rolling word stream into one phrase update.
  liveAsrCommitTimer = setTimeout(() => {
    commitLiveAsrSentence(liveAsrPendingText);
  }, LIVE_ASR_COMMIT_STABILITY_MS);
}

function scheduleLiveAsrClear(containerTarget) {
  clearTimeout(liveAsrClearTimer);
  liveAsrClearTimer = setTimeout(() => {
    if (trackMode === TRACK_MODE.FILE_READY) return;
    if (liveAsrTranslationPending) {
      scheduleLiveAsrClear(containerTarget);
      return;
    }
    if (!containerTarget.querySelector('.caption-window')) {
      resetLiveAsrBuffer();
      clearSubtitleContent();
    }
  }, 1400);
}

function requestTranslation(text, lang = currentSettings.lang) {
  return new Promise((resolve) => {
    if (!text || isOrphaned || !currentSettings.enabled) {
      resolve('');
      return;
    }

    try {
      chrome.runtime.sendMessage({ action: 'translate', text, lang }, (response) => {
        if (chrome.runtime.lastError) {
          if (chrome.runtime.lastError.message?.includes('Extension context invalidated')) {
            dieQuietly();
          }
          resolve('');
          return;
        }
        resolve(response?.translation?.trim() || '');
      });
    } catch (error) {
      if (error.message?.includes('Extension context invalidated')) dieQuietly();
      resolve('');
    }
  });
}

function renderDomTranslationFallback(currentText) {
  if (currentText === lastText) return;

  clearTimeout(translateDebounceTimer);
  const cachedTranslation = preloadedTranslations.get(currentText);
  if (cachedTranslation) {
    hideLoadingMessage();
    lastText = currentText;
    lastMatchedSource = '';
    updateSubtitleContent(currentText, cachedTranslation);
    return;
  }

  clearSubtitleContent();
  lastText = currentText;
  lastMatchedSource = '';

  translateDebounceTimer = setTimeout(async () => {
    const generation = trackLoadGeneration;
    const targetLang = currentSettings.lang;
    const translation = await requestTranslation(currentText, targetLang);
    if (!translation || generation !== trackLoadGeneration || currentText !== lastText) return;

    preloadedTranslations.set(currentText, translation);
    hideLoadingMessage();
    updateSubtitleContent(currentText, translation);
  }, DOM_TRANSLATION_DEBOUNCE_MS);
}

function bindMutationObserver(containerTarget) {
  if (observer) observer.disconnect();
  if (!containerTarget) return;

  observer = new MutationObserver(() => {
    if (!checkContext() || isOrphaned) {
      observer.disconnect();
      return;
    }
    if (!currentSettings.enabled) return;

    if (trackMode === TRACK_MODE.FILE_WARMING ||
        trackMode === TRACK_MODE.YOUTUBE_AUTO_TRANSLATE) return;

    if (trackMode === TRACK_MODE.FILE_READY) {
      renderFileCue();
      return;
    }

    const captionWindow = containerTarget.querySelector('.caption-window');
    if (!captionWindow) {
      if (liveAsrPendingText) commitLiveAsrSentence();
      scheduleLiveAsrClear(containerTarget);
      return;
    }

    const currentText = getNativeCaptionText(containerTarget);

    if (!currentText) {
      scheduleLiveAsrClear(containerTarget);
      return;
    }

    if (isAutoGenerated || trackMode === TRACK_MODE.LIVE_ASR) {
      feedLiveAsrSnapshot(currentText);
      return;
    }

    renderDomTranslationFallback(currentText);
  });

  observer.observe(containerTarget, { childList: true, subtree: true });
}

function handlePlayerBridgeMessage(event) {
  if (event.source !== window || event.origin !== window.location.origin) return;
  const message = event.data;
  if (!message || message.source !== PLAYER_BRIDGE_SOURCE) return;

  if (message.type === 'SNAPSHOT_RESPONSE') {
    const pendingRequest = bridgeRequests.get(message.requestId);
    if (!pendingRequest) return;
    clearTimeout(pendingRequest.timeoutId);
    bridgeRequests.delete(message.requestId);
    pendingRequest.resolve(message.snapshot || null);
    return;
  }

  if (message.type === 'TRACK_CHANGED' && currentSettings.enabled && !isOrphaned) {
    const nextTrackKey = message.snapshot?.trackKey || '';
    if (currentTrackKey && nextTrackKey && nextTrackKey !== currentTrackKey) {
      beginTrackLoad('YouTube caption track changed');
    }
  }
}

window.addEventListener('message', handlePlayerBridgeMessage);

function requestPlayerSnapshot() {
  return new Promise((resolve) => {
    const requestId = `${Date.now()}-${++bridgeRequestSequence}`;
    const timeoutId = setTimeout(() => {
      bridgeRequests.delete(requestId);
      resolve(null);
    }, PLAYER_SNAPSHOT_TIMEOUT_MS);

    bridgeRequests.set(requestId, { resolve, timeoutId });
    window.postMessage({
      source: PLAYER_BRIDGE_SOURCE,
      type: 'REQUEST_SNAPSHOT',
      requestId
    }, window.location.origin);
  });
}

function cancelTrackLoad() {
  trackLoadGeneration += 1;
  clearTimeout(trackRetryTimer);
  clearTimeout(translateDebounceTimer);
  trackRetryTimer = null;
  translateDebounceTimer = null;
  if (trackAbortController) trackAbortController.abort();
  trackAbortController = null;
  inflightTranslations.clear();
}

function beginTrackLoad(reason = 'refresh') {
  if (isOrphaned || !currentSettings.enabled || !isYouTubeWatchPage()) return;

  cancelTrackLoad();
  stopFileRenderer();
  resetLiveAsrBuffer();
  hideLoadingMessage();
  clearSubtitleContent();

  const generation = trackLoadGeneration;
  trackMode = TRACK_MODE.DISCOVERING;
  isAutoGenerated = false;
  currentTrackKey = '';
  currentCueIndex = -1;
  preloadedTranslations.clear();
  preloadedSentencesList = [];
  showLoadingMessage();

  console.log(`lasDoscas: 开始识别字幕轨道 (${reason})...`);
  preloadFullTrack(generation, 0);
}

function showYouTubeAutoTranslateWarning() {
  stopFileRenderer();
  resetLiveAsrBuffer();
  hideLoadingMessage();
  const message = getAutoTranslateSelectionMessage(currentSettings.lang);
  lastText = message;
  lastMatchedSource = '';
  updateSubtitleContent('\u00A0', getSecondSubtitleStatusHtml(message), true);
  applyStylesToDOM();
}

function scheduleTrackRetry(generation, attempt, terminalMode, reason) {
  if (generation !== trackLoadGeneration || isOrphaned || !currentSettings.enabled) return;

  if (attempt >= TRACK_RETRY_DELAYS_MS.length) {
    trackMode = terminalMode;
    console.info(`lasDoscas: 字幕轨道预加载未完成，进入 ${terminalMode} 模式：${reason}`);
    updateWrapperVisibility();
    return;
  }

  const delay = TRACK_RETRY_DELAYS_MS[attempt];
  trackRetryTimer = setTimeout(() => preloadFullTrack(generation, attempt + 1), delay);
}

async function downloadCaptionJson3(trackUrl, signal, targetLang = '') {
  const url = new URL(trackUrl);
  url.searchParams.set('fmt', 'json3');
  if (targetLang) url.searchParams.set('tlang', targetLang);

  const response = await fetch(url.toString(), { signal, credentials: 'include' });
  if (!response.ok) throw new Error(`字幕服务器返回 ${response.status}`);

  const text = await response.text();
  if (!text.trim()) throw new Error('字幕文件为空');

  let data;
  try {
    data = JSON.parse(text);
  } catch (error) {
    throw new Error('字幕文件不是有效的 JSON3');
  }

  if (!Array.isArray(data.events)) throw new Error('字幕文件不包含 events');
  return data;
}

async function downloadAndParseSubtitles(trackUrl, signal, options = {}) {
  const data = await downloadCaptionJson3(trackUrl, signal);

  const cues = [];
  const useSpace = isSpaceDelimitedLang(currentSourceLang);
  const mergeRolling = options.mergeRolling === true;

  // Manually authored tracks already carry deliberate cue boundaries. Keeping
  // those events intact prevents a translated track with different sentence
  // segmentation from shifting the visible source line onto the next cue.
  if (!mergeRolling) {
    data.events.forEach((event, eventIndex) => {
      if (!Array.isArray(event.segs)) return;
      const text = normalizeCaptionText(
        event.segs.map((segment) => segment.utf8 || '').join('').replace(/\n/g, ' ')
      );
      if (!text) return;
      const start = Number(event.tStartMs || 0) / 1000;
      const duration = Number(event.dDurationMs || 0) / 1000;
      cues.push({
        text,
        start,
        end: Math.max(start + Math.max(duration, 0.6), start + 0.6),
        eventStartIndex: eventIndex,
        eventEndIndex: eventIndex
      });
    });

    cues.sort((a, b) => a.start - b.start);
    cues.forEach((cue, index) => {
      const nextCue = cues[index + 1];
      if (nextCue && cue.end >= nextCue.start) {
        cue.end = Math.max(cue.start + 0.5, nextCue.start - 0.04);
      }
    });

    if (!cues.length) throw new Error('字幕文件没有可显示文本');
    return cues;
  }

  const maxLength = useSpace ? 90 : 45;
  let buffer = '';
  let bufferStart = -1;
  let bufferEnd = -1;
  let bufferEventStartIndex = -1;
  let bufferEventEndIndex = -1;

  const flushBuffer = () => {
    const finalText = normalizeCaptionText(buffer);
    if (finalText && bufferStart >= 0) {
      cues.push({
        text: finalText,
        start: bufferStart,
        end: Math.max(bufferEnd, bufferStart + 1.2),
        eventStartIndex: bufferEventStartIndex,
        eventEndIndex: bufferEventEndIndex
      });
    }
    buffer = '';
    bufferStart = -1;
    bufferEnd = -1;
    bufferEventStartIndex = -1;
    bufferEventEndIndex = -1;
  };

  data.events.forEach((event, eventIndex) => {
    if (!Array.isArray(event.segs)) return;
    const segmentText = normalizeCaptionText(
      event.segs.map((segment) => segment.utf8 || '').join('').replace(/\n/g, ' ')
    );
    if (!segmentText) return;

    const start = Number(event.tStartMs || 0) / 1000;
    const duration = Number(event.dDurationMs || 0) / 1000;
    const end = start + Math.max(duration, 0.6);
    const gap = bufferEnd >= 0 ? start - bufferEnd : 0;

    if (buffer && gap > 0.85) flushBuffer();
    if (!buffer) {
      bufferStart = start;
      bufferEventStartIndex = eventIndex;
    }
    bufferEventEndIndex = eventIndex;

    // Some ASR JSON3 tracks repeatedly send an expanded version of the same
    // line. Replace that rolling snapshot instead of duplicating its words.
    if (buffer && segmentText.startsWith(buffer) && start <= bufferEnd + 0.1) {
      buffer = segmentText;
    } else if (!buffer.endsWith(segmentText)) {
      buffer += `${buffer && useSpace ? ' ' : ''}${segmentText}`;
    }
    bufferEnd = Math.max(bufferEnd, end);

    if (/[.!?。！？…]$/.test(segmentText) || buffer.length >= maxLength) flushBuffer();
  });
  flushBuffer();

  cues.sort((a, b) => a.start - b.start);
  cues.forEach((cue, index) => {
    const nextCue = cues[index + 1];
    if (nextCue && cue.end >= nextCue.start) cue.end = Math.max(cue.start + 0.5, nextCue.start - 0.04);
  });

  if (!cues.length) throw new Error('字幕文件没有可显示文本');
  return cues;
}

function seedTranslationsFromYouTubeTrack(sourceCues, translatedData, targetLang, rolling = isAutoGenerated) {
  if (!Array.isArray(translatedData?.events)) return 0;

  const useSpace = isSpaceDelimitedLang(targetLang);
  const mappedPairs = [];
  const translatedEvents = translatedData.events.map((event, index) => {
    const start = Number(event?.tStartMs || 0) / 1000;
    const duration = Number(event?.dDurationMs || 0) / 1000;
    const text = Array.isArray(event?.segs)
      ? normalizeCaptionText(event.segs.map((segment) => segment.utf8 || '').join('').replace(/\n/g, ' '))
      : '';
    return { event, index, start, end: start + Math.max(duration, 0.6), text };
  });

  sourceCues.forEach((cue) => {
    if (cue.eventStartIndex < 0 || cue.eventEndIndex < cue.eventStartIndex) return;
    let candidates;
    if (rolling) {
      const translatedAnchor = translatedData.events[cue.eventStartIndex];
      const translatedAnchorStart = Number(translatedAnchor?.tStartMs || 0) / 1000;
      if (!translatedAnchor || Math.abs(translatedAnchorStart - cue.start) > 2.5) return;
      candidates = translatedEvents.filter(({ index }) =>
        index >= cue.eventStartIndex && index <= cue.eventEndIndex
      );
    } else {
      // Manual tracks may have a different event count/order after YouTube
      // generates the translated track. Match by cue time overlap first, then
      // fall back to the nearest translated event within a short tolerance.
      const indexed = translatedEvents[cue.eventStartIndex];
      if (indexed?.text && Math.abs(indexed.start - cue.start) <= 1.5) {
        candidates = [indexed];
      } else {
        candidates = translatedEvents.filter(({ start, end, text }) =>
          text && start < cue.end + 0.12 && end > cue.start - 0.12
        );
      }
      if (!candidates.length) {
        const nearest = translatedEvents
          .filter(({ text }) => text)
          .sort((a, b) => Math.abs(a.start - cue.start) - Math.abs(b.start - cue.start))[0];
        if (!nearest || Math.abs(nearest.start - cue.start) > 1.5) return;
        candidates = [nearest];
      }
    }

    let translatedText = '';
    for (const candidate of candidates) {
      const eventText = candidate.text;
      if (!eventText) continue;

      // Translated ASR tracks can also contain rolling snapshots. Keep the
      // expanded snapshot rather than appending the same words twice.
      if (translatedText && eventText.startsWith(translatedText)) {
        translatedText = eventText;
      } else if (!translatedText.endsWith(eventText)) {
        translatedText += `${translatedText && useSpace ? ' ' : ''}${eventText}`;
      }
    }

    translatedText = normalizeCaptionText(translatedText);
    if (translatedText) {
      mappedPairs.push([cue.text, translatedText]);
    }
  });

  const sourcePrefix = (currentSourceLang || '').toLowerCase().split('-')[0];
  const targetPrefix = (targetLang || '').toLowerCase().split('-')[0];
  if (sourcePrefix !== targetPrefix && mappedPairs.length >= 3) {
    const identicalCount = mappedPairs.filter(([source, translation]) => source === translation).length;
    if (identicalCount / mappedPairs.length > 0.8) return 0;
  }

  mappedPairs.forEach(([source, translation]) => {
    preloadedTranslations.set(source, translation);
  });
  return mappedPairs.length;
}

function waitForTranslationWarmup(translationPromise) {
  return Promise.race([
    translationPromise,
    new Promise((resolve) => setTimeout(() => resolve(null), YOUTUBE_TRANSLATION_WARMUP_MS))
  ]);
}

function findCueIndexAtTime(time) {
  if (!preloadedSentencesList.length || time < 0) return -1;

  const currentCue = preloadedSentencesList[currentCueIndex];
  if (currentCue && time >= currentCue.start && time <= currentCue.end + 0.45) {
    return currentCueIndex;
  }

  let low = 0;
  let high = preloadedSentencesList.length - 1;
  let candidate = -1;
  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    if (preloadedSentencesList[middle].start <= time) {
      candidate = middle;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }

  if (candidate < 0) return -1;
  const cue = preloadedSentencesList[candidate];
  return time <= cue.end + 0.45 ? candidate : -1;
}

function findNextCueIndexAtTime(time) {
  const activeIndex = findCueIndexAtTime(time);
  if (activeIndex >= 0) return activeIndex;

  let low = 0;
  let high = preloadedSentencesList.length - 1;
  let candidate = -1;
  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    if (preloadedSentencesList[middle].start >= time) {
      candidate = middle;
      high = middle - 1;
    } else {
      low = middle + 1;
    }
  }
  return candidate;
}

function getTranslationRequestKey(sourceText, generation, lang = currentSettings.lang) {
  return `${generation}|${lang}|${sourceText}`;
}

async function ensureCueTranslation(sourceText, generation = trackLoadGeneration) {
  if (!sourceText || preloadedTranslations.has(sourceText)) return;
  const requestKey = getTranslationRequestKey(sourceText, generation);
  if (inflightTranslations.has(requestKey)) return inflightTranslations.get(requestKey);

  const request = requestTranslation(sourceText).then((translation) => {
    inflightTranslations.delete(requestKey);
    if (!translation || generation !== trackLoadGeneration) return translation || '';
    preloadedTranslations.set(sourceText, translation);
    if (sourceText === lastMatchedSource) updateSubtitleContent(sourceText, translation);
    return translation;
  });
  inflightTranslations.set(requestKey, request);
  return request;
}

function displayFileCue(cueIndex, translation = '', useHint = false) {
  const cue = preloadedSentencesList[cueIndex];
  if (!cue || cueIndex !== currentCueIndex || trackMode !== TRACK_MODE.FILE_READY) return;

  renderedFileCueIndex = cueIndex;
  pendingFileCueIndex = -1;
  hideLoadingMessage();
  lastMatchedSource = cue.text;
  lastText = cue.text;
  updateSubtitleContent(
    cue.text,
    useHint ? getAutoGeneratedHintHtml() : translation,
    useHint
  );
}

function renderFileCue() {
  if (trackMode !== TRACK_MODE.FILE_READY || isOrphaned || !currentSettings.enabled) return;
  const video = document.querySelector('video');
  if (!video) return;

  const nextCueIndex = findCueIndexAtTime(video.currentTime);
  if (nextCueIndex < 0) {
    pendingFileCueIndex = -1;
    renderedFileCueIndex = -1;
    if (lastMatchedSource || lastText) clearSubtitleContent();
    currentCueIndex = -1;
    return;
  }

  currentCueIndex = nextCueIndex;
  const cue = preloadedSentencesList[nextCueIndex];
  if (nextCueIndex === renderedFileCueIndex || nextCueIndex === pendingFileCueIndex) return;

  pendingFileCueIndex = nextCueIndex;
  const translation = preloadedTranslations.get(cue.text);
  if (!currentSettings.showTrans) {
    displayFileCue(nextCueIndex, '');
    return;
  }

  if (translation) {
    displayFileCue(nextCueIndex, translation);
    return;
  }

  // Do not paint a new source line on its own. Wait for the matching
  // translation and commit both rows in the same DOM update.
  clearSubtitleContent();
  ensureCueTranslation(cue.text).then((translationResult) => {
    if (nextCueIndex !== currentCueIndex || pendingFileCueIndex !== nextCueIndex) return;
    const readyTranslation = preloadedTranslations.get(cue.text);
    if (readyTranslation) {
      displayFileCue(nextCueIndex, readyTranslation);
    } else if (isAutoGenerated && !translationResult) {
      displayFileCue(nextCueIndex, '', true);
    }
  });
}

function startFileRenderer() {
  stopFileRenderer();
  renderFileCue();
  fileRendererTimer = setInterval(renderFileCue, FILE_RENDER_INTERVAL_MS);
}

function stopFileRenderer() {
  if (fileRendererTimer) clearInterval(fileRendererTimer);
  fileRendererTimer = null;
  currentCueIndex = -1;
  pendingFileCueIndex = -1;
  renderedFileCueIndex = -1;
}

async function translateBatch(batch, generation) {
  if (!batch.length || generation !== trackLoadGeneration) return;
  const delimiter = '\n\n[[[LASDOSCAS_BREAK_9F2D]]]\n\n';
  const translated = await requestTranslation(batch.join(delimiter));
  if (generation !== trackLoadGeneration) return;

  const parts = translated
    ? translated.split(/\s*\[\[\[\s*LASDOSCAS_BREAK_9F2D\s*\]\]\]\s*/i)
    : [];

  if (parts.length === batch.length) {
    batch.forEach((sourceText, index) => {
      const translation = parts[index]?.trim();
      if (translation) preloadedTranslations.set(sourceText, translation);
    });
  } else {
    // Google occasionally translates or removes the delimiter. Retry this
    // batch in small groups so cue-to-translation mapping cannot shift.
    for (let i = 0; i < batch.length; i += 3) {
      const group = batch.slice(i, i + 3);
      await Promise.all(group.map((sourceText) => ensureCueTranslation(sourceText, generation)));
      if (generation !== trackLoadGeneration) return;
    }
  }

  const visibleTranslation = preloadedTranslations.get(lastMatchedSource);
  if (visibleTranslation && generation === trackLoadGeneration) {
    updateSubtitleContent(lastMatchedSource, visibleTranslation);
  }
}

async function preloadTranslations(generation) {
  const video = document.querySelector('video');
  const playhead = video?.currentTime || 0;
  const nearestIndex = Math.max(0, findNextCueIndexAtTime(playhead));
  const priorityCues = [
    ...preloadedSentencesList.slice(nearestIndex, nearestIndex + 24),
    ...preloadedSentencesList.slice(0, nearestIndex),
    ...preloadedSentencesList.slice(nearestIndex + 24)
  ];
  const sourceSentences = Array.from(new Set(priorityCues.map((cue) => cue.text)));
  const batchSize = 16;

  // Warm the visible window with parallel single-cue requests first. A large
  // delimiter batch is efficient for the rest of the track, but its response
  // must not hold the first few on-screen cues hostage.
  const initialCues = sourceSentences
    .slice(0, INITIAL_TRANSLATION_LOOKAHEAD)
    .filter((text) =>
      !preloadedTranslations.has(text) &&
      !inflightTranslations.has(getTranslationRequestKey(text, generation))
    );
  await Promise.all(initialCues.map((text) => ensureCueTranslation(text, generation)));

  for (let index = 0; index < sourceSentences.length; index += batchSize) {
    if (generation !== trackLoadGeneration || isOrphaned || !currentSettings.enabled) return;
    const batch = sourceSentences
      .slice(index, index + batchSize)
      .filter((text) =>
        !preloadedTranslations.has(text) &&
        !inflightTranslations.has(getTranslationRequestKey(text, generation))
    );
    await translateBatch(batch, generation);
    if (index + batchSize < sourceSentences.length) {
      await new Promise((resolve) => setTimeout(resolve, PRELOAD_BATCH_DELAY_MS));
    }
  }

  if (generation === trackLoadGeneration) {
    console.log('lasDoscas: 全片字幕翻译预加载完成。');
  }
}

async function preloadFullTrack(generation, attempt) {
  if (generation !== trackLoadGeneration || isOrphaned || !currentSettings.enabled) return;

  const snapshot = await requestPlayerSnapshot();
  if (generation !== trackLoadGeneration) return;

  const selectedTrack = snapshot?.selectedTrack;
  currentTrackKey = snapshot?.trackKey || '';

  if (snapshot?.isAutoTranslated) {
    trackMode = TRACK_MODE.YOUTUBE_AUTO_TRANSLATE;
    isAutoGenerated = false;
    preloadedTranslations.clear();
    preloadedSentencesList = [];
    showYouTubeAutoTranslateWarning();
    console.info(
      `lasDoscas: 检测到 YouTube 自动翻译 (${snapshot.autoTranslationLanguageCode || 'unknown'})，等待用户选择原始字幕轨。`
    );
    return;
  }

  if (!selectedTrack) {
    const hasNativeCaptionDom = Boolean(document.querySelector('.ytp-caption-segment'));
    const terminalMode = hasNativeCaptionDom ? TRACK_MODE.RETRYABLE_ERROR : TRACK_MODE.NO_CAPTIONS;
    scheduleTrackRetry(generation, attempt, terminalMode, '播放器尚未提供字幕轨道');
    return;
  }

  currentSourceLang = selectedTrack.languageCode || 'en';
  isAutoGenerated = selectedTrack.kind === 'asr' || selectedTrack.vssId?.startsWith('a.');

  if (!selectedTrack.baseUrl) {
    scheduleTrackRetry(
      generation,
      attempt,
      isAutoGenerated ? TRACK_MODE.LIVE_ASR : TRACK_MODE.RETRYABLE_ERROR,
      '当前字幕轨道没有可下载 URL'
    );
    return;
  }

  // Suppress the DOM fallback while the source and translated files are being
  // fetched, otherwise the original line can paint before the warmup finishes.
  trackMode = TRACK_MODE.FILE_WARMING;

  try {
    trackAbortController = new AbortController();
    const youtubeTranslationPromise = currentSettings.showTrans
      ? downloadCaptionJson3(
          selectedTrack.baseUrl,
          trackAbortController.signal,
          currentSettings.lang
        ).catch((error) => {
          if (error.name !== 'AbortError') {
            console.info(`lasDoscas: YouTube 翻译轨不可用，已回退到逐句翻译：${error.message}`);
          }
          return null;
        })
      : Promise.resolve(null);

    const cues = await downloadAndParseSubtitles(
      selectedTrack.baseUrl,
      trackAbortController.signal,
      { mergeRolling: isAutoGenerated }
    );
    if (generation !== trackLoadGeneration) return;

    resetLiveAsrBuffer();
    preloadedSentencesList = cues;

    let youtubeTranslationApplied = false;
    const applyYouTubeTranslation = (translatedData) => {
      if (!translatedData || youtubeTranslationApplied || generation !== trackLoadGeneration) return 0;
      const mappedCount = seedTranslationsFromYouTubeTrack(
        cues,
        translatedData,
        currentSettings.lang,
        isAutoGenerated
      );
      youtubeTranslationApplied = mappedCount > 0;
      if (mappedCount > 0) {
        console.log(`lasDoscas: 已从 YouTube 翻译轨映射 ${mappedCount}/${cues.length} 条译文。`);
      }
      return mappedCount;
    };

    const warmTranslationData = await waitForTranslationWarmup(youtubeTranslationPromise);
    if (generation !== trackLoadGeneration) return;
    applyYouTubeTranslation(warmTranslationData);
    trackMode = TRACK_MODE.FILE_READY;

    console.log(`lasDoscas: 已加载 ${cues.length} 条字幕，启用独立时间轴双语渲染。`);
    const video = document.querySelector('video');
    const initialCueIndex = findNextCueIndexAtTime(video?.currentTime || 0);
    if (initialCueIndex >= 0 && !preloadedTranslations.has(cues[initialCueIndex].text)) {
      ensureCueTranslation(cues[initialCueIndex].text, generation);
    }
    startFileRenderer();
    preloadTranslations(generation);

    youtubeTranslationPromise.then((translatedData) => {
      if (!applyYouTubeTranslation(translatedData)) return;
      pendingFileCueIndex = -1;
      renderedFileCueIndex = -1;
      renderFileCue();
    });
  } catch (error) {
    if (error.name === 'AbortError' || generation !== trackLoadGeneration) return;
    trackMode = isAutoGenerated ? TRACK_MODE.LIVE_ASR : TRACK_MODE.DISCOVERING;
    scheduleTrackRetry(
      generation,
      attempt,
      isAutoGenerated ? TRACK_MODE.LIVE_ASR : TRACK_MODE.RETRYABLE_ERROR,
      error.message
    );
  }
}

setTimeout(() => {
  if (checkContext() && !isOrphaned && currentSettings.enabled && isYouTubeWatchPage()) {
    beginTrackLoad('initial load');
  }
}, 800);

window.addEventListener('yt-navigate-finish', () => {
  if (!checkContext() || isOrphaned) return;
  currentCaptionContainer = null;

  const oldWrapper = document.querySelector('.custom-subtitle-wrapper');
  if (oldWrapper) oldWrapper.remove();
  syncPluginState();

  if (currentSettings.enabled && isYouTubeWatchPage()) {
    setTimeout(() => beginTrackLoad('YouTube navigation'), 200);
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

  const expectedOrigin = chrome.runtime.getURL('').replace(/\/$/, '');
  if (event.origin !== expectedOrigin) {
    return;
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
