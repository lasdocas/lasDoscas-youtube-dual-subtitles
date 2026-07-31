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

const youtubeCaptionsDisabledMessageDict = Object.freeze({
  'zh-cn': '请开启 YouTube 字幕，以显示双语字幕',
  'zh-tw': '請開啟 YouTube 字幕，以顯示雙語字幕',
  zh: '请开启 YouTube 字幕，以显示双语字幕',
  en: 'Turn on YouTube captions to display bilingual subtitles',
  es: 'Activa los subtítulos de YouTube para mostrar subtítulos bilingües',
  fr: 'Activez les sous-titres YouTube pour afficher des sous-titres bilingues',
  'fr-ca': 'Activez les sous-titres YouTube pour afficher des sous-titres bilingues',
  de: 'Aktivieren Sie die YouTube-Untertitel, um zweisprachige Untertitel anzuzeigen',
  ja: '二言語字幕を表示するには、YouTube の字幕をオンにしてください',
  ko: '이중 언어 자막을 표시하려면 YouTube 자막을 켜세요',
  pt: 'Ative as legendas do YouTube para exibir legendas bilíngues',
  id: 'Aktifkan subtitel YouTube untuk menampilkan subtitel dwibahasa',
  ms: 'Hidupkan sari kata YouTube untuk memaparkan sari kata dwibahasa',
  ru: 'Включите субтитры YouTube, чтобы отображать двуязычные субтитры',
  ar: 'فعّل الترجمة المصاحبة في YouTube لعرض ترجمة ثنائية اللغة',
  hi: 'द्विभाषी उपशीर्षक दिखाने के लिए YouTube उपशीर्षक चालू करें',
  ta: 'இருமொழி வசனங்களைக் காட்ட YouTube வசனங்களை இயக்கவும்',
  th: 'เปิดคำบรรยาย YouTube เพื่อแสดงคำบรรยายสองภาษา',
  vi: 'Bật phụ đề YouTube để hiển thị phụ đề song ngữ',
  tr: 'İki dilli altyazıları görüntülemek için YouTube altyazılarını açın',
  pl: 'Włącz napisy w YouTube, aby wyświetlać napisy dwujęzyczne',
  nl: 'Schakel YouTube-ondertiteling in om tweetalige ondertiteling weer te geven',
  sv: 'Aktivera YouTube-undertexter för att visa tvåspråkiga undertexter',
  da: 'Slå YouTube-undertekster til for at vise tosprogede undertekster',
  no: 'Slå på YouTube-teksting for å vise tospråklige undertekster',
  fi: 'Ota YouTube-tekstitys käyttöön näyttääksesi kaksikieliset tekstitykset',
  it: 'Attiva i sottotitoli di YouTube per visualizzare i sottotitoli bilingui',
  ro: 'Activați subtitrările YouTube pentru a afișa subtitrări bilingve',
  hu: 'Kapcsolja be a YouTube-feliratokat a kétnyelvű feliratok megjelenítéséhez',
  cs: 'Zapněte titulky YouTube, aby se zobrazovaly dvojjazyčné titulky',
  hr: 'Uključite YouTube titlove za prikaz dvojezičnih titlova',
  el: 'Ενεργοποιήστε τους υπότιτλους στο YouTube για να εμφανίζονται δίγλωσσοι υπότιτλοι',
  iw: 'הפעילו את הכתוביות ב-YouTube כדי להציג כתוביות דו-לשוניות',
  tl: 'I-on ang mga subtitle sa YouTube upang magpakita ng dalawang-wikang subtitle',
  uk: 'Увімкніть субтитри YouTube, щоб відображати двомовні субтитри',
  eu: 'Aktibatu YouTubeko azpitituluak azpititulu elebidunak bistaratzeko',
  ca: 'Activa els subtítols de YouTube per mostrar subtítols bilingües',
  gl: 'Activa os subtítulos de YouTube para mostrar subtítulos bilingües',
  is: 'Kveiktu á YouTube-texta til að birta tvítyngdan texta',
  sw: 'Washa manukuu ya YouTube ili kuonyesha manukuu ya lugha mbili',
  et: 'Lülitage YouTube’i subtiitrid sisse, et kuvada kakskeelseid subtiitreid',
  lv: 'Ieslēdziet YouTube subtitrus, lai rādītu divvalodu subtitrus',
  lt: 'Įjunkite „YouTube“ subtitrus, kad būtų rodomi dvikalbiai subtitrai',
  sk: 'Zapnite titulky YouTube, aby sa zobrazovali dvojjazyčné titulky',
  sl: 'Vklopite podnapise v YouTubu za prikaz dvojezičnih podnapisov',
  bg: 'Включете субтитрите в YouTube, за да се показват двуезични субтитри',
  sr: 'Укључите YouTube титлове за приказ двојезичних титлова',
  ur: 'دو لسانی سب ٹائٹلز دکھانے کے لیے YouTube سب ٹائٹلز آن کریں',
  fa: 'برای نمایش زیرنویس دوزبانه، زیرنویس YouTube را روشن کنید',
  mr: 'द्विभाषिक उपशीर्षके दाखवण्यासाठी YouTube उपशीर्षके सुरू करा',
  bn: 'দ্বিভাষিক সাবটাইটেল দেখাতে YouTube সাবটাইটেল চালু করুন',
  gu: 'દ્વિભાષી સબટાઇટલ બતાવવા માટે YouTube સબટાઇટલ ચાલુ કરો',
  te: 'ద్విభాషా ఉపశీర్షికలను చూపడానికి YouTube ఉపశీర్షికలను ఆన్ చేయండి',
  kn: 'ದ್ವಿಭಾಷಾ ಉಪಶೀರ್ಷಿಕೆಗಳನ್ನು ತೋರಿಸಲು YouTube ಉಪಶೀರ್ಷಿಕೆಗಳನ್ನು ಆನ್ ಮಾಡಿ',
  ml: 'ദ്വിഭാഷാ സബ്‌ടൈറ്റിലുകൾ കാണിക്കാൻ YouTube സബ്‌ടൈറ്റിലുകൾ ഓണാക്കുക',
  am: 'ባለሁለት ቋንቋ ንዑስ ርዕሶችን ለማሳየት የYouTube ንዑስ ርዕሶችን ያብሩ'
});

function getLoadingMessage() {
  const language = (currentSettings.lang || 'en').toLowerCase();
  const prefix = language.split('-')[0];
  return loadingMessageDict[language] || loadingMessageDict[prefix] || loadingMessageDict.en;
}

function getYouTubeCaptionsDisabledMessage() {
  const language = (currentSettings.lang || 'en').toLowerCase();
  const prefix = language.split('-')[0];
  return youtubeCaptionsDisabledMessageDict[language] ||
    youtubeCaptionsDisabledMessageDict[prefix] ||
    youtubeCaptionsDisabledMessageDict.en;
}

function isSpaceDelimitedLang(langCode) {
  if (!langCode) return true;
  const prefix = langCode.toLowerCase().split('-')[0];
  return !['ja', 'zh', 'ko', 'th', 'lo', 'km', 'my'].includes(prefix);
}

function isRtlLanguage(langCode) {
  const prefix = (langCode || '').toLowerCase().split('-')[0];
  return ['ar', 'fa', 'he', 'iw', 'ur'].includes(prefix);
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
    'fr-CA': '[Choisissez une piste de sous-titres ou de sous-titres générés automatiquement dans YouTube afin que lasDoscas puisse afficher des sous-titres bilingues]',
    'de': '[Wählen Sie in YouTube eine Untertitelspur oder eine automatisch erzeugte Untertitelspur aus, damit lasDoscas zweisprachige Untertitel anzeigen kann]',
    'ja': '[lasDoscas の二言語字幕を利用するには、YouTube で字幕または自動生成字幕を選択してください]',
    'ko': '[lasDoscas 이중 언어 자막을 사용하려면 YouTube에서 자막 또는 자동 생성 자막을 선택하세요]',
    'pt': '[Selecione uma faixa de legendas ou de legendas geradas automaticamente no YouTube para usar as legendas bilíngues do lasDoscas]',
    'ru': '[Выберите обычные или автоматически созданные субтитры в YouTube, чтобы lasDoscas мог показывать двуязычные субтитры]',
    'ar': '[اختر مسار ترجمة مصاحبة أو ترجمة مصاحبة تم إنشاؤها تلقائيًا في YouTube ليتمكن lasDoscas من عرض ترجمة ثنائية اللغة]',
    'hi': '[lasDoscas के द्विभाषी उपशीर्षक उपयोग करने के लिए YouTube में उपशीर्षक या अपने-आप बने उपशीर्षक चुनें]',
    'id': '[Pilih trek subtitel atau subtitel yang dibuat otomatis di YouTube agar lasDoscas dapat menampilkan subtitel dwibahasa]',
    'ms': '[Pilih sari kata atau sari kata yang dijana secara automatik dalam YouTube supaya lasDoscas dapat memaparkan sari kata dwibahasa]',
    'ta': '[lasDoscas இருமொழி வசனங்களை வழங்க, YouTube வசன வரிசையில் வசனங்கள் அல்லது தானாக உருவாக்கப்பட்ட வசனங்களைத் தேர்ந்தெடுக்கவும்]',
    'th': '[เลือกแทร็กคำบรรยายหรือคำบรรยายที่สร้างอัตโนมัติใน YouTube เพื่อให้ lasDoscas แสดงคำบรรยายสองภาษาได้]',
    'vi': '[Hãy chọn phụ đề hoặc phụ đề được tạo tự động trong YouTube để lasDoscas có thể hiển thị phụ đề song ngữ]',
    'it': '[Seleziona una traccia di sottotitoli o di sottotitoli generati automaticamente in YouTube per usare i sottotitoli bilingui di lasDoscas]',
    'tr': '[lasDoscas iki dilli altyazıları kullanmak için YouTube’da bir altyazı parçası veya otomatik oluşturulan altyazı parçası seçin]',
    'pl': '[Wybierz w YouTube ścieżkę napisów lub automatycznie wygenerowaną ścieżkę napisów, aby lasDoscas mógł wyświetlać napisy dwujęzyczne]',
    'nl': '[Selecteer in YouTube een ondertitelspoor of een automatisch gegenereerd ondertitelspoor zodat lasDoscas tweetalige ondertitels kan tonen]',
    'sv': '[Välj ett undertextspår eller ett automatiskt genererat undertextspår i YouTube så att lasDoscas kan visa tvåspråkiga undertexter]',
    'da': '[Vælg et undertekstspor eller et automatisk genereret undertekstspor i YouTube, så lasDoscas kan vise tosprogede undertekster]',
    'no': '[Velg et tekstspor eller et automatisk generert tekstspor i YouTube, slik at lasDoscas kan vise tospråklige undertekster]',
    'fi': '[Valitse YouTubessa tekstitysraita tai automaattisesti luotu tekstitysraita, jotta lasDoscas voi näyttää kaksikieliset tekstitykset]',
    'ro': '[Selectați în YouTube o pistă de subtitrări sau una generată automat, pentru ca lasDoscas să poată afișa subtitrări bilingve]',
    'hu': '[Válasszon feliratsávot vagy automatikusan létrehozott feliratsávot a YouTube-on, hogy a lasDoscas kétnyelvű feliratokat jeleníthessen meg]',
    'cs': '[Vyberte na YouTube stopu titulků nebo automaticky generovaných titulků, aby lasDoscas mohl zobrazovat dvojjazyčné titulky]',
    'hr': '[Odaberite zapis titlova ili automatski generiranih titlova na YouTubeu kako bi lasDoscas mogao prikazivati dvojezične titlove]',
    'el': '[Επιλέξτε στο YouTube υπότιτλους ή υπότιτλους που δημιουργήθηκαν αυτόματα, ώστε το lasDoscas να μπορεί να εμφανίσει δίγλωσσους υπότιτλους]',
    'iw': '[בחרו ב-YouTube רצועת כתוביות או כתוביות שנוצרו אוטומטית כדי ש-lasDoscas יוכל להציג כתוביות דו-לשוניות]',
    'tl': '[Pumili ng subtitle track o awtomatikong nabuong subtitle track sa YouTube para makapagpakita ang lasDoscas ng dalawang-wikang subtitle]',
    'uk': '[Виберіть у YouTube доріжку субтитрів або автоматично створених субтитрів, щоб lasDoscas міг показувати двомовні субтитри]',
    'eu': '[Hautatu azpititulu-pista bat edo automatikoki sortutako azpititulu-pista bat YouTuben, lasDoscasek azpititulu elebidunak erakutsi ahal izateko]',
    'ca': '[Seleccioneu una pista de subtítols o de subtítols generats automàticament a YouTube perquè lasDoscas pugui mostrar subtítols bilingües]',
    'gl': '[Selecciona en YouTube unha pista de subtítulos ou de subtítulos xerados automaticamente para que lasDoscas poida mostrar subtítulos bilingües]',
    'is': '[Veldu textabraut eða sjálfvirkt myndaða textabraut á YouTube svo lasDoscas geti birt tvítyngdan texta]',
    'sw': '[Chagua manukuu au manukuu yaliyotengenezwa kiotomatiki katika YouTube ili lasDoscas iweze kuonyesha manukuu ya lugha mbili]',
    'et': '[Valige YouTube’is subtiitrite rada või automaatselt loodud subtiitrite rada, et lasDoscas saaks kuvada kakskeelseid subtiitreid]',
    'lv': '[Izvēlieties YouTube subtitru celiņu vai automātiski ģenerētu subtitru celiņu, lai lasDoscas varētu rādīt divvalodu subtitrus]',
    'lt': '[Pasirinkite „YouTube“ subtitrų takelį arba automatiškai sugeneruotų subtitrų takelį, kad „lasDoscas“ galėtų rodyti dvikalbius subtitrus]',
    'sk': '[Vyberte na YouTube stopu titulkov alebo automaticky generovaných titulkov, aby lasDoscas mohol zobrazovať dvojjazyčné titulky]',
    'sl': '[V YouTubu izberite podnapise ali samodejno ustvarjene podnapise, da bo lasDoscas lahko prikazoval dvojezične podnapise]',
    'bg': '[Изберете в YouTube писта със субтитри или автоматично генерирани субтитри, за да може lasDoscas да показва двуезични субтитри]',
    'sr': '[Изаберите на YouTube-у титлове или аутоматски генерисане титлове како би lasDoscas могао да приказује двојезичне титлове]',
    'ur': '[YouTube میں سب ٹائٹل ٹریک یا خودکار طور پر تیار کردہ سب ٹائٹل ٹریک منتخب کریں تاکہ lasDoscas دو لسانی سب ٹائٹلز دکھا سکے]',
    'fa': '[در YouTube یک مسیر زیرنویس یا زیرنویس تولیدشده به‌صورت خودکار را انتخاب کنید تا lasDoscas بتواند زیرنویس دوزبانه نمایش دهد]',
    'mr': '[lasDoscas द्विभाषिक उपशीर्षके दाखवू शकण्यासाठी YouTube मध्ये उपशीर्षक ट्रॅक किंवा आपोआप तयार केलेला उपशीर्षक ट्रॅक निवडा]',
    'bn': '[lasDoscas যেন দ্বিভাষিক সাবটাইটেল দেখাতে পারে, সে জন্য YouTube-এ একটি সাবটাইটেল ট্র্যাক বা স্বয়ংক্রিয়ভাবে তৈরি সাবটাইটেল ট্র্যাক নির্বাচন করুন]',
    'gu': '[lasDoscas દ્વિભાષી સબટાઇટલ બતાવી શકે તે માટે YouTube માં સબટાઇટલ ટ્રૅક અથવા આપમેળે જનરેટ થયેલ સબટાઇટલ ટ્રૅક પસંદ કરો]',
    'te': '[lasDoscas ద్విభాషా ఉపశీర్షికలను చూపడానికి YouTubeలో ఉపశీర్షిక ట్రాక్ లేదా స్వయంచాలకంగా రూపొందించిన ఉపశీర్షిక ట్రాక్‌ను ఎంచుకోండి]',
    'kn': '[lasDoscas ದ್ವಿಭಾಷಾ ಉಪಶೀರ್ಷಿಕೆಗಳನ್ನು ತೋರಿಸಲು YouTube ನಲ್ಲಿ ಉಪಶೀರ್ಷಿಕೆ ಟ್ರ್ಯಾಕ್ ಅಥವಾ ಸ್ವಯಂಚಾಲಿತವಾಗಿ ರಚಿಸಲಾದ ಉಪಶೀರ್ಷಿಕೆ ಟ್ರ್ಯಾಕ್ ಆಯ್ಕೆಮಾಡಿ]',
    'ml': '[lasDoscas-ന് ദ്വിഭാഷാ സബ്‌ടൈറ്റിലുകൾ കാണിക്കാൻ YouTube-ൽ ഒരു സബ്‌ടൈറ്റിൽ ട്രാക്കോ സ്വയമേവ സൃഷ്‌ടിച്ച സബ്‌ടൈറ്റിൽ ട്രാക്കോ തിരഞ്ഞെടുക്കുക]',
    'am': '[lasDoscas ባለሁለት ቋንቋ ንዑስ ርዕሶችን ማሳየት እንዲችል በYouTube ውስጥ የንዑስ ርዕስ ትራክ ወይም በራስ-ሰር የተፈጠረ የንዑስ ርዕስ ትራክ ይምረጡ]'
  };
  return dict[lang] || dict[prefix] || dict.en;
}

function dieQuietly() {
  if (isOrphaned) return;
  isOrphaned = true; 
  resetPlayerElementCache();
  
  if (observer) observer.disconnect();
  if (flexyObserver) flexyObserver.disconnect();
  if (playerResizeObserver) playerResizeObserver.disconnect();
  if (ccButtonObserver) ccButtonObserver.disconnect();
  if (containerMonitor) clearInterval(containerMonitor);
  if (playerControlMonitor) clearInterval(playerControlMonitor);
  clearTimeout(copyFeedbackTimer);
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

function getDefaultUiLang() {
  const prefix = (navigator.language || 'en').toLowerCase().split('-')[0];
  return prefix === 'zh' || prefix === 'es' ? prefix : 'en';
}

const copyUiText = Object.freeze({
  zh: {
    subtitleLabel: '复制当前字幕',
    fullLabel: '复制完整信息',
    copied: '已复制',
    failed: '复制失败'
  },
  en: {
    subtitleLabel: 'Copy current subtitle',
    fullLabel: 'Copy full details',
    copied: 'Copied',
    failed: 'Copy failed'
  },
  es: {
    subtitleLabel: 'Copiar el subtítulo actual',
    fullLabel: 'Copiar toda la información',
    copied: 'Copiado',
    failed: 'No se pudo copiar'
  }
});

let lastText = "";
let lastMatchedSource = "";
let observer = null;
let flexyObserver = null;
let playerResizeObserver = null; 
let ccButtonObserver = null; 
let playerPluginControl = null;
let playerPluginSwitch = null;
let playerControlMonitor = null;
let isCCAvailable = false;
let isYouTubeCCEnabled = null;
let captionTrackAvailability = null;
let captionTrackAvailabilityVideoId = '';
let isSyncingPluginState = false;

let currentCaptionContainer = null;
let containerMonitor = null;
let cachedMoviePlayerElement = null;
let cachedVideoElement = null;

const TRACK_MODE = Object.freeze({
  UNKNOWN: 'UNKNOWN',
  WAITING_FOR_YOUTUBE_CAPTIONS: 'WAITING_FOR_YOUTUBE_CAPTIONS',
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
const AUTO_FILE_TRANSLATION_RETRY_MS = 2000;
const YOUTUBE_TRANSLATION_WARMUP_MS = 300;
const INITIAL_TRANSLATION_LOOKAHEAD = 6;
const AUTO_TRANSLATION_LOOKAHEAD_SECONDS = 30;
const AUTO_TRANSLATION_WINDOW_MAX_CUES = 24;
const AUTO_TRANSLATION_WINDOW_CONCURRENCY = 4;
const AUTO_TRANSLATION_WINDOW_REFRESH_SECONDS = 5;
const AUTO_FILE_WARMUP_TIMEOUT_MS = 1500;
const PRELOAD_BATCH_DELAY_MS = 80;
const DOM_TRANSLATION_DEBOUNCE_MS = 80;
const LIVE_ASR_PREFETCH_MS = 120;
const LIVE_ASR_COMMIT_STABILITY_MS = 260;
const ASR_STRUCTURAL_GAP_SECONDS = 1.6;
const ASR_EMERGENCY_MAX_DURATION_SECONDS = 30;
const ASR_EMERGENCY_MAX_CHARS = 320;
const ASR_EMERGENCY_MAX_COMPACT_CHARS = 180;
const DISPLAY_MAX_CHARS = 180;
const DISPLAY_MAX_COMPACT_CHARS = 60;
const DISPLAY_MAX_PARTS = 4;
const DISPLAY_MIN_WORDS_PER_PART = 3;
const DISPLAY_MIN_COMPACT_CHARS_PER_PART = 4;
const DISPLAY_MIN_PART_DURATION_SECONDS = 1.5;
const AUTO_FILE_RENDER_INTERVAL_MS = 50;
const FILE_RENDER_INTERVAL_MS = 50;
const COPY_FEEDBACK_DURATION_MS = 500;

let trackMode = TRACK_MODE.UNKNOWN;
let isAutoGenerated = false;
let currentTrackKey = '';
let trackLoadGeneration = 0;
let trackAbortController = null;
let trackRetryTimer = null;
let fileRendererTimer = null;
let fileCueTranslationRetryTimer = null;
let currentCueIndex = -1;
let pendingFileCueIndex = -1;
let renderedFileCueIndex = -1;
let renderedFileCuePartIndex = -1;
let autoTranslationWindowSequence = 0;
let autoTranslationWindowAnchor = -1;
let bridgeRequestSequence = 0;
const bridgeRequests = new Map();
const inflightTranslations = new Map();
let isShiftPressed = false;
let copyFeedbackTimer = null;
let currentVideoMetadata = { videoId: '', title: '', publishDate: '' };

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
  fsBgOpacity: '75',
  uiLang: getDefaultUiLang()
};

const LAYOUT_SETTING_KEYS = new Set([
  'showSrc', 'showTrans', 'font',
  'srcSize', 'fsSrcSize', 'srcColor', 'srcNormalBold', 'srcFsBold',
  'transSize', 'fsTransSize', 'transColor', 'transNormalBold', 'transFsBold',
  'fsBgStyle', 'fsBgOpacity'
]);

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
    const changedKeys = Object.keys(changes);
    for (const key of changedKeys) {
      currentSettings[key] = changes[key].newValue;
    }

    const enabledChanged = changedKeys.includes('enabled');
    const layoutChanged = changedKeys.some((key) => LAYOUT_SETTING_KEYS.has(key));
    if (enabledChanged) {
      syncPluginState();
    } else if (layoutChanged) {
      triggerLayoutUpdate();
    }
    if (changedKeys.includes('uiLang')) updateCopyButtonLanguage();

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
  if (isOrphaned || isSyncingPluginState) return;
  isSyncingPluginState = true;

  try {
    initCCButtonObserver();
    const shouldRun = currentSettings.enabled && isCCAvailable && isYouTubeWatchPage();

    document.body.setAttribute('data-yt-dual-sub-active', shouldRun ? 'true' : 'false');

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
  } finally {
    isSyncingPluginState = false;
  }
}

function showLoadingMessage() {
  loadingMessageVisible = true;
  lastText = getLoadingMessage();
  lastMatchedSource = '';
  const wrapper = ensureSubtitleContainer();
  if (!wrapper) {
    setTimeout(() => {
      if (loadingMessageVisible && currentSettings.enabled && isCCAvailable && isYouTubeWatchPage() && !isOrphaned) {
        showLoadingMessage();
      }
    }, 150);
    return;
  }
  updateSubtitleContent('\u00A0', getSecondSubtitleStatusHtml(lastText), true);
  applyStylesToDOM();
}

function showYouTubeCaptionsDisabledMessage() {
  cancelTrackLoad();
  stopFileRenderer();
  resetLiveAsrBuffer();
  hideLoadingMessage();
  trackMode = TRACK_MODE.WAITING_FOR_YOUTUBE_CAPTIONS;
  const message = getYouTubeCaptionsDisabledMessage();
  lastText = message;
  lastMatchedSource = '';
  updateSubtitleContent('\u00A0', getSecondSubtitleStatusHtml(message), true);
  applyStylesToDOM();
}

function hideLoadingMessage() {
  const wasVisible = loadingMessageVisible;
  loadingMessageVisible = false;
  if (wasVisible) applyStylesToDOM();
}

function getLayoutMode() {
  const watchFlexy = document.querySelector('ytd-watch-flexy');
  const moviePlayer = getMoviePlayerElement();
  const isFs = document.fullscreenElement != null || 
               (watchFlexy && watchFlexy.hasAttribute('fullscreen')) || 
               (moviePlayer && moviePlayer.classList.contains('ytp-fullscreen'));
  if (isFs) return 'fullscreen';
  if (watchFlexy && watchFlexy.hasAttribute('theater')) return 'theater';
  return 'default';
}

function getCopyUiText() {
  return copyUiText[currentSettings.uiLang] || copyUiText.en;
}

function getCurrentVideoId() {
  return new URLSearchParams(window.location.search).get('v') || '';
}

function cachePlayerSnapshotMetadata(snapshot) {
  const currentVideoId = getCurrentVideoId();
  if (!snapshot?.videoId || snapshot.videoId !== currentVideoId) return;

  const isSameVideo = currentVideoMetadata.videoId === snapshot.videoId;
  currentVideoMetadata = {
    videoId: snapshot.videoId,
    title: snapshot.videoTitle || (isSameVideo ? currentVideoMetadata.title : ''),
    publishDate: snapshot.publishDate || (isSameVideo ? currentVideoMetadata.publishDate : '')
  };
}

function resetCurrentVideoMetadata() {
  currentVideoMetadata = { videoId: getCurrentVideoId(), title: '', publishDate: '' };
}

function resetPlayerElementCache() {
  cachedMoviePlayerElement = null;
  cachedVideoElement = null;
}

function getMoviePlayerElement() {
  if (!cachedMoviePlayerElement?.isConnected) {
    cachedMoviePlayerElement = document.querySelector('#movie_player');
    cachedVideoElement = null;
  }
  return cachedMoviePlayerElement;
}

function getPlayerVideoElement() {
  const moviePlayer = getMoviePlayerElement();
  if (!moviePlayer) return null;

  const cachedVideoIsCurrent = cachedVideoElement?.isConnected &&
    cachedVideoElement.closest('#movie_player') === moviePlayer;
  if (!cachedVideoIsCurrent) {
    cachedVideoElement =
      moviePlayer.querySelector('video.html5-main-video') ||
      moviePlayer.querySelector('video');
  }
  return cachedVideoElement;
}

function getVisibleVideoTitle() {
  const selectors = [
    'ytd-watch-metadata h1 yt-formatted-string',
    'ytd-watch-metadata h1',
    '#above-the-fold #title h1 yt-formatted-string'
  ];

  for (const selector of selectors) {
    for (const titleNode of document.querySelectorAll(selector)) {
      const rect = titleNode.getBoundingClientRect();
      if (!rect.width || !rect.height) continue;
      const title = (titleNode.textContent || '').trim();
      if (title) return title;
    }
  }
  return '';
}

function getDateOnly(value) {
  const date = String(value || '').trim();
  const isoDate = date.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
  return isoDate || date;
}

function getCurrentVideoMetadata() {
  const videoId = getCurrentVideoId();
  const cached = currentVideoMetadata.videoId === videoId ? currentVideoMetadata : null;
  const visibleTitle = getVisibleVideoTitle();
  const metaTitle = document.querySelector('meta[name="title"], meta[property="og:title"]')?.content || '';
  const documentTitle = document.title.replace(/\s*-\s*YouTube\s*$/, '').trim();
  const metaDate = document.querySelector(
    'meta[itemprop="datePublished"], meta[itemprop="uploadDate"]'
  )?.content || '';

  return {
    videoId,
    title: visibleTitle || metaTitle || cached?.title || documentTitle,
    publishDate: getDateOnly(cached?.publishDate || metaDate)
  };
}

function getCurrentSourceSubtitle(wrapper = document.querySelector('.custom-subtitle-wrapper')) {
  const text = wrapper?.querySelector('.custom-source-text')?.textContent || '';
  return text.replace(/\u00a0/g, ' ').trim();
}

function formatPlaybackTimestamp(seconds) {
  const totalSeconds = Math.max(0, Math.floor(Number(seconds) || 0));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const remainingSeconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
  }
  return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`;
}

function buildTimestampedSubtitle(sourceSubtitle) {
  const video = getPlayerVideoElement();
  return `[${formatPlaybackTimestamp(video?.currentTime)}]  ${sourceSubtitle}`;
}

function buildFullCopyText(sourceSubtitle) {
  const metadata = getCurrentVideoMetadata();
  const heading = metadata.title
    ? (metadata.publishDate ? `${metadata.title} (${metadata.publishDate})` : metadata.title)
    : '';
  const videoUrl = metadata.videoId
    ? `https://www.youtube.com/watch?v=${encodeURIComponent(metadata.videoId)}`
    : window.location.href;
  const timestampedSubtitle = buildTimestampedSubtitle(sourceSubtitle);

  const lines = [];
  if (heading) lines.push(heading);
  lines.push(videoUrl, '', timestampedSubtitle);
  return lines.join('\n');
}

async function writeTextToClipboard(text) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch (error) {
      // Fall through to the selection-based copy path below.
    }
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.setProperty('position', 'fixed', 'important');
  textarea.style.setProperty('left', '-9999px', 'important');
  textarea.style.setProperty('top', '0', 'important');
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  const copied = document.execCommand('copy');
  textarea.remove();
  if (!copied) throw new Error('Clipboard write was rejected');
}

function updateCopyButtonLanguage(wrapper = document.querySelector('.custom-subtitle-wrapper')) {
  const button = wrapper?.querySelector('.lasdoscas-copy-button');
  if (!button) return;

  const text = getCopyUiText();
  const label = button.getAttribute('data-copy-mode') === 'full' ? text.fullLabel : text.subtitleLabel;
  button.setAttribute('aria-label', button.classList.contains('is-copied') ? text.copied : label);
}

function updateCopyButtonIcon(wrapper = document.querySelector('.custom-subtitle-wrapper')) {
  if (isOrphaned) return;
  const button = wrapper?.querySelector('.lasdoscas-copy-button');
  const icon = button?.querySelector('.lasdoscas-copy-main-icon');
  if (!button || !icon || button.classList.contains('is-copied')) return;

  const useFullCopy = isShiftPressed;
  icon.src = chrome.runtime.getURL(useFullCopy ? 'copyfull48.svg' : 'copy48.svg');
  button.setAttribute('data-copy-mode', useFullCopy ? 'full' : 'subtitle');
  updateCopyButtonLanguage(wrapper);
}

function updateCopyAvailability(wrapper = document.querySelector('.custom-subtitle-wrapper')) {
  if (!wrapper) return;
  const isAvailable = !loadingMessageVisible && Boolean(getCurrentSourceSubtitle(wrapper));
  const button = wrapper.querySelector('.lasdoscas-copy-button');
  wrapper.setAttribute('data-copy-available', isAvailable ? 'true' : 'false');
  if (button) button.tabIndex = isAvailable ? 0 : -1;
}

function showCopySuccess(button) {
  clearTimeout(copyFeedbackTimer);
  button.classList.add('is-copied');
  button.setAttribute('aria-label', getCopyUiText().copied);
  copyFeedbackTimer = setTimeout(() => {
    button.classList.remove('is-copied');
    updateCopyButtonLanguage(button.closest('.custom-subtitle-wrapper'));
    updateCopyButtonIcon(button.closest('.custom-subtitle-wrapper'));
  }, COPY_FEEDBACK_DURATION_MS);
}

function showCopyFailure(button) {
  button.setAttribute('aria-label', getCopyUiText().failed);
  button.classList.remove('is-copy-error');
  void button.offsetWidth;
  button.classList.add('is-copy-error');
  setTimeout(() => {
    button.classList.remove('is-copy-error');
    updateCopyButtonLanguage(button.closest('.custom-subtitle-wrapper'));
  }, COPY_FEEDBACK_DURATION_MS);
}

async function copyCurrentSubtitle(event) {
  if (!checkContext() || isOrphaned) return;
  const button = event.currentTarget;
  const wrapper = button.closest('.custom-subtitle-wrapper');
  const sourceSubtitle = getCurrentSourceSubtitle(wrapper);
  if (!sourceSubtitle) return;

  const copyFullDetails = Boolean(event.shiftKey || isShiftPressed);
  const copyText = copyFullDetails
    ? buildFullCopyText(sourceSubtitle)
    : buildTimestampedSubtitle(sourceSubtitle);
  try {
    await writeTextToClipboard(copyText);
    showCopySuccess(button);
  } catch (error) {
    console.warn('lasDoscas: 无法写入剪贴板。', error);
    showCopyFailure(button);
  }
}

function bindCopyButton(wrapper) {
  const button = wrapper.querySelector('.lasdoscas-copy-button');
  if (!button) return;

  button.addEventListener('pointerdown', (event) => event.stopPropagation());
  button.addEventListener('dblclick', (event) => event.stopPropagation());
  button.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    copyCurrentSubtitle(event);
  });
  wrapper.addEventListener('pointerenter', (event) => {
    isShiftPressed = Boolean(event.shiftKey);
    updateCopyButtonIcon(wrapper);
  });
  updateCopyButtonLanguage(wrapper);
  updateCopyButtonIcon(wrapper);
  updateCopyAvailability(wrapper);
}

document.addEventListener('keydown', (event) => {
  if (isOrphaned || event.key !== 'Shift' || isShiftPressed) return;
  isShiftPressed = true;
  updateCopyButtonIcon();
});

document.addEventListener('keyup', (event) => {
  if (isOrphaned || event.key !== 'Shift') return;
  isShiftPressed = false;
  updateCopyButtonIcon();
});

window.addEventListener('blur', () => {
  if (isOrphaned || !isShiftPressed) return;
  isShiftPressed = false;
  updateCopyButtonIcon();
});

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
  const forceStatusLayout = loadingMessageVisible ||
    trackMode === TRACK_MODE.WAITING_FOR_YOUTUBE_CAPTIONS ||
    trackMode === TRACK_MODE.YOUTUBE_AUTO_TRANSLATE;

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
    trackMode === TRACK_MODE.WAITING_FOR_YOUTUBE_CAPTIONS ||
    trackMode === TRACK_MODE.YOUTUBE_AUTO_TRANSLATE;
  const isFullscreen = wrapper.getAttribute('data-layout-mode') === 'fullscreen';
  
  const isEmpty = !lastText && !lastMatchedSource;
  const bothHidden = !loadingMessageVisible &&
    !currentSettings.showSrc &&
    !currentSettings.showTrans &&
    trackMode !== TRACK_MODE.WAITING_FOR_YOUTUBE_CAPTIONS &&
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
  if (isOrphaned || !currentSettings.enabled || !isCCAvailable) return null;
  
  const watchFlexy = document.querySelector('ytd-watch-flexy');
  const moviePlayer = getMoviePlayerElement();
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
      <div class="custom-source-text" dir="auto">&nbsp;</div>
      <div class="custom-translated-text" dir="auto">&nbsp;</div>
      <button type="button" class="lasdoscas-copy-button" data-copy-mode="subtitle" tabindex="-1">
        <span class="lasdoscas-copy-icon" aria-hidden="true">
          <img class="lasdoscas-copy-main-icon" alt="" src="${chrome.runtime.getURL('copy48.svg')}">
          <img class="lasdoscas-copy-check-icon" alt="" src="${chrome.runtime.getURL('check48.svg')}">
        </span>
      </button>
    `;
    wrapper.style.setProperty('color-scheme', 'only light', 'important');
    bindCopyButton(wrapper);
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

  wrapper.setAttribute('dir', isRtlLanguage(currentSourceLang) ? 'rtl' : 'ltr');
  wrapper.setAttribute('data-layout-mode', layoutMode);
  updateCopyButtonLanguage(wrapper);
  updateCopyAvailability(wrapper);
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
  const actualPlayer = getMoviePlayerElement();
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
    }
    wrapper.style.setProperty('margin', '8px auto 12px', 'important');
    wrapper.style.setProperty('border-radius', '8px', 'important');
  } else if (layoutMode === 'fullscreen') {
    if (currentSettings.fsBgStyle === 'fit' || currentSettings.fsBgStyle === 'none') {
      wrapper.style.setProperty('width', 'fit-content', 'important');
      wrapper.style.setProperty('max-width', '85%', 'important');
      wrapper.style.removeProperty('inset-inline-start');
      wrapper.style.setProperty('left', '0', 'important');
      wrapper.style.setProperty('right', '0', 'important');
      wrapper.style.setProperty('margin', '0 auto', 'important');
    } else if (targetWidth > 200) {
      wrapper.style.setProperty('width', `${targetWidth * 0.8}px`, 'important');
      wrapper.style.setProperty('max-width', '100%', 'important');
      wrapper.style.removeProperty('inset-inline-start');
      wrapper.style.setProperty('left', '0', 'important');
      wrapper.style.setProperty('right', '0', 'important');
      wrapper.style.setProperty('margin', '0 auto', 'important');
    }
    wrapper.style.setProperty('border-radius', '8px', 'important');
  } else {
    wrapper.style.setProperty('width', '100%', 'important');
    wrapper.style.setProperty('max-width', '100%', 'important');
    wrapper.style.removeProperty('margin');
    wrapper.style.setProperty('border-radius', '8px', 'important'); 
  }
}

function initPlayerResizeObserver() {
  if (playerResizeObserver) playerResizeObserver.disconnect();

  const playerTarget = getMoviePlayerElement() || document.querySelector('ytd-watch-flexy');
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
  const moviePlayer = getMoviePlayerElement();
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

function getYouTubeCCEnabledFromButton() {
  const ccBtn = findPlayerSubtitleButton();
  if (!ccBtn) return null;
  const ariaPressed = ccBtn.getAttribute('aria-pressed');
  if (ariaPressed === 'true') return true;
  if (ariaPressed === 'false') return false;
  return null;
}

function setYouTubeCCEnabled(nextEnabled, reason = 'state changed') {
  if (typeof nextEnabled !== 'boolean' || nextEnabled === isYouTubeCCEnabled) return false;
  isYouTubeCCEnabled = nextEnabled;

  if (!currentSettings.enabled || !isCCAvailable || !isYouTubeWatchPage() || isOrphaned) {
    return true;
  }

  if (isYouTubeCCEnabled) beginTrackLoad(`YouTube captions enabled: ${reason}`);
  else showYouTubeCaptionsDisabledMessage();
  return true;
}

function cacheYouTubeCCEnabled(snapshot) {
  if (!snapshot?.videoId || snapshot.videoId !== getCurrentVideoId()) return false;
  return setYouTubeCCEnabled(snapshot.captionsEnabled, 'player snapshot');
}

function getCCAvailability() {
  if (!isYouTubeWatchPage()) return false;

  const ccBtn = findPlayerSubtitleButton();
  const isExplicitlyDisabled = Boolean(ccBtn && (
    ccBtn.disabled ||
    ccBtn.hasAttribute('disabled') ||
    ccBtn.getAttribute('aria-disabled') === 'true' ||
    ccBtn.classList.contains('ytp-button-disabled')
  ));
  if (isExplicitlyDisabled) return false;

  const currentVideoId = getCurrentVideoId();
  if (
    captionTrackAvailabilityVideoId === currentVideoId &&
    captionTrackAvailability !== null
  ) {
    return captionTrackAvailability;
  }

  // Until the player response identifies the current video's caption tracks,
  // keep both switches disabled instead of treating a visually present CC
  // button as proof that captions exist.
  return false;
}

function hasKnownCCAvailability() {
  return Boolean(
    getCurrentVideoId() &&
    captionTrackAvailabilityVideoId === getCurrentVideoId() &&
    captionTrackAvailability !== null
  );
}

function cacheCCAvailability(snapshot) {
  const currentVideoId = getCurrentVideoId();
  if (
    !snapshot?.captionTracksKnown ||
    !snapshot.videoId ||
    snapshot.videoId !== currentVideoId
  ) {
    return false;
  }

  captionTrackAvailabilityVideoId = snapshot.videoId;
  captionTrackAvailability = Number(snapshot.trackCount) > 0;
  updateCCAvailability();
  return true;
}

function resetCCAvailability() {
  captionTrackAvailabilityVideoId = getCurrentVideoId();
  captionTrackAvailability = null;
  isYouTubeCCEnabled = null;
  updateCCAvailability();
}

async function refreshCCAvailability() {
  const requestedVideoId = getCurrentVideoId();
  if (!requestedVideoId || !isYouTubeWatchPage()) {
    resetCCAvailability();
    return false;
  }

  const snapshot = await requestPlayerSnapshot();
  if (requestedVideoId !== getCurrentVideoId()) return false;
  cacheCCAvailability(snapshot);
  return getCCAvailability();
}

function updateCCAvailability() {
  const nextAvailability = getCCAvailability();
  const availabilityChanged = nextAvailability !== isCCAvailable;
  isCCAvailable = nextAvailability;

  if (playerPluginSwitch) {
    playerPluginSwitch.disabled = !isCCAvailable;
    const switchLabel = playerPluginSwitch.closest('.lasdoscas-player-switch');
    if (switchLabel) {
      switchLabel.classList.toggle('is-disabled', !isCCAvailable);
      switchLabel.setAttribute('aria-disabled', String(!isCCAvailable));
    }
  }

  if (availabilityChanged) {
    chrome.runtime.sendMessage({
      action: 'cc_availability_changed',
      ccAvailable: isCCAvailable
    }, () => {
      const suppressMessageError = chrome.runtime.lastError;
    });

    syncPluginState();
    if (isCCAvailable && currentSettings.enabled) {
      beginTrackLoad('caption availability changed');
    }
  }

  return isCCAvailable;
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
  updateCCAvailability();
  return true;
}

function initCCButtonObserver() {
  if (ccButtonObserver) ccButtonObserver.disconnect();
  if (playerControlMonitor) clearInterval(playerControlMonitor);
  playerControlMonitor = null;
  if (!isYouTubeWatchPage()) {
    updateCCAvailability();
    return;
  }

  // YouTube can replace the entire chrome control tree without emitting a
  // navigation event. Keep a lightweight reconciliation pass so the plugin
  // switch is reattached after those player state changes as well.
  playerControlMonitor = setInterval(() => {
    if (document.hidden || !checkContext() || isOrphaned || !isYouTubeWatchPage()) return;
    if (!ensurePlayerPluginControl()) updateCCAvailability();
    const ccEnabled = getYouTubeCCEnabledFromButton();
    if (ccEnabled !== null) setYouTubeCCEnabled(ccEnabled, 'player control');
    if (!hasKnownCCAvailability()) refreshCCAvailability();
  }, 1000);

  refreshCCAvailability();

  if (!ensurePlayerPluginControl()) {
    updateCCAvailability();
    return;
  }

  const controls = playerPluginControl?.parentElement;
  if (!controls) return;
  ccButtonObserver = new MutationObserver((mutations) => {
    if (!checkContext() || isOrphaned) return;
    const ccBtn = findPlayerSubtitleButton();
    const shouldReconcile = mutations.some((mutation) =>
      mutation.type === 'childList' || mutation.target === ccBtn
    );
    if (!shouldReconcile) return;
    ensurePlayerPluginControl();
    const ccEnabled = getYouTubeCCEnabledFromButton();
    if (ccEnabled !== null) setYouTubeCCEnabled(ccEnabled, 'caption button');
  });
  ccButtonObserver.observe(controls, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['disabled', 'aria-disabled', 'aria-pressed', 'class']
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

  updateCopyAvailability(wrapper);
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

  updateCopyAvailability(wrapper);
  updateWrapperVisibility();
}

function startContainerMonitor() {
  if (containerMonitor) clearInterval(containerMonitor);
  
  containerMonitor = setInterval(() => {
    if (!checkContext() || isOrphaned) {
      clearInterval(containerMonitor);
      return;
    }
    if (document.hidden) return;
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
let liveAsrPrefetchTimer = null;
let liveAsrCommitTimer = null;
let liveAsrClearTimer = null;
let liveAsrPendingText = '';
let liveAsrCommittedText = '';
let liveAsrRenderSequence = 0;

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

function hasTerminalCaptionPunctuation(text) {
  return /[.!?。！？…؟۔।॥]+["'”’」』）)\]}】]*$/.test((text || '').trim());
}

const CAPTION_PERIOD_ABBREVIATIONS = new Set([
  'mr', 'mrs', 'ms', 'dr', 'prof', 'sr', 'jr', 'st', 'vs', 'etc',
  'e.g', 'i.e', 'a.m', 'p.m', 'cf', 'fig', 'no', 'vol', 'pp', 'inc',
  'ltd', 'co', 'dept', 'est', 'z.b', 'd.h', 'u.a', 'bzw', 'ca', 'nr',
  'abb', 'usw', 'u.s', 'mme', 'mlle', 'p.ex', 'sra', 'srta', 'dra',
  'ud', 'uds', 'p.ej'
]);
const sentenceSegmenters = new Map();

function getSentenceSegmenter(languageCode) {
  const locale = languageCode || 'en';
  const cacheKey = locale.toLowerCase();
  let segmenter = sentenceSegmenters.get(cacheKey);
  if (!segmenter) {
    segmenter = new Intl.Segmenter(locale, { granularity: 'sentence' });
    sentenceSegmenters.set(cacheKey, segmenter);
  }
  return segmenter;
}

function isLikelyFalsePeriodBoundary(sentenceText, fullText, boundaryEndIndex) {
  const sentence = normalizeCaptionText(sentenceText);
  const terminalMatch = sentence.match(/([.!?。！？…؟۔।॥]+)["'”’」』）)\]}】]*$/);
  if (!terminalMatch || terminalMatch[1] !== '.') return false;

  const nextText = fullText.slice(boundaryEndIndex).trimStart();
  if (!nextText) return false;
  const periodIndex = sentence.lastIndexOf('.');
  const beforePeriod = sentence.slice(0, periodIndex);
  const previousChar = beforePeriod.slice(-1);
  const nextChar = nextText[0];
  if (/\d/.test(previousChar) && /\d/.test(nextChar)) return true;

  const token = beforePeriod.split(/\s+/).pop()?.toLowerCase() || '';
  if (CAPTION_PERIOD_ABBREVIATIONS.has(token)) return true;
  if (/^[a-z]$/i.test(token) && /[\p{Lu}\p{Lt}]/u.test(nextChar)) return true;
  return /(?:[a-z]\.){2,}$/i.test(`${token}.`);
}

function splitCompletedCaptionSentences(text, languageCode = currentSourceLang) {
  const normalized = normalizeCaptionText(text);
  if (!normalized) return { completed: [], remainder: '' };

  let segments = [];
  try {
    if (typeof Intl?.Segmenter === 'function') {
      const segmenter = getSentenceSegmenter(languageCode);
      segments = Array.from(segmenter.segment(normalized), (entry) => ({
        text: entry.segment,
        startIndex: entry.index,
        endIndex: entry.index + entry.segment.length
      }));
    }
  } catch (error) {
    segments = [];
  }

  if (!segments.length) {
    const boundaryPattern = /(?:[!?。！？…؟۔।॥]+["'”’」』）)\]}】]*|\.+["'”’」』）)\]}】]*(?=\s|$))/gu;
    let startIndex = 0;
    let match;
    while ((match = boundaryPattern.exec(normalized))) {
      segments.push({
        text: normalized.slice(startIndex, match.index + match[0].length),
        startIndex,
        endIndex: match.index + match[0].length
      });
      startIndex = match.index + match[0].length;
    }
    if (startIndex < normalized.length) {
      segments.push({
        text: normalized.slice(startIndex),
        startIndex,
        endIndex: normalized.length
      });
    }
  }

  const completed = [];
  let consumedEndIndex = 0;
  let pendingSentenceText = '';
  for (const segment of segments) {
    const joinChar = pendingSentenceText && isSpaceDelimitedLang(languageCode) ? ' ' : '';
    pendingSentenceText = normalizeCaptionText(`${pendingSentenceText}${joinChar}${segment.text}`);
    const sentenceText = pendingSentenceText;
    if (!sentenceText || !hasTerminalCaptionPunctuation(sentenceText)) continue;
    if (isLikelyFalsePeriodBoundary(sentenceText, normalized, segment.endIndex)) continue;
    completed.push({ text: sentenceText, endIndex: segment.endIndex });
    consumedEndIndex = segment.endIndex;
    pendingSentenceText = '';
  }

  return {
    completed,
    remainder: normalizeCaptionText(normalized.slice(consumedEndIndex))
  };
}

function getCaptionDisplayPartCount(text, languageCode) {
  const normalized = normalizeCaptionText(text);
  if (!normalized) return 1;
  const maxChars = isSpaceDelimitedLang(languageCode)
    ? DISPLAY_MAX_CHARS
    : DISPLAY_MAX_COMPACT_CHARS;
  const { completed, remainder } = splitCompletedCaptionSentences(normalized, languageCode);
  const strongPartCount = completed.length + (remainder ? 1 : 0);
  return Math.min(
    DISPLAY_MAX_PARTS,
    Math.max(1, strongPartCount, Math.ceil(normalized.length / maxChars))
  );
}

function getCaptionDisplayPartCapacity(text, languageCode) {
  const normalized = normalizeCaptionText(text);
  if (!normalized) return 1;
  const unitCount = isSpaceDelimitedLang(languageCode)
    ? normalized.split(/\s+/).length
    : normalized.length;
  const minimumUnits = isSpaceDelimitedLang(languageCode)
    ? DISPLAY_MIN_WORDS_PER_PART
    : DISPLAY_MIN_COMPACT_CHARS_PER_PART;
  return Math.max(1, Math.floor(unitCount / minimumUnits));
}

function getCaptionDisplayBoundaries(text) {
  const boundaries = [];
  const punctuationPattern = /[.!?…。！？؟۔।॥]+["'”’」』）)\]}】]*|[,;:，；：、]+/gu;
  let match;
  while ((match = punctuationPattern.exec(text))) {
    const endIndex = match.index + match[0].length;
    if (endIndex >= text.length) continue;
    const prefix = text.slice(0, endIndex);
    const strong = hasTerminalCaptionPunctuation(prefix) &&
      !isLikelyFalsePeriodBoundary(prefix, text, endIndex);
    boundaries.push({ index: endIndex, weight: strong ? 2 : 1 });
  }

  for (let index = 1; index < text.length - 1; index += 1) {
    if (/\s/.test(text[index])) boundaries.push({ index: index + 1, weight: 0 });
  }
  return boundaries;
}

function getStrongCaptionBoundaryRatios(text, languageCode) {
  const normalized = normalizeCaptionText(text);
  if (!normalized) return [];
  const { completed, remainder } = splitCompletedCaptionSentences(normalized, languageCode);
  const boundaries = remainder ? completed : completed.slice(0, -1);
  return boundaries
    .map((sentence) => sentence.endIndex / normalized.length)
    .filter((ratio) => ratio > 0 && ratio < 1);
}

function splitCaptionIntoDisplayParts(text, languageCode, requestedPartCount, boundaryRatios = []) {
  const normalized = normalizeCaptionText(text);
  if (!normalized || requestedPartCount <= 1) return [normalized];

  const partCount = Math.min(requestedPartCount, DISPLAY_MAX_PARTS, normalized.length);
  const candidates = getCaptionDisplayBoundaries(normalized);
  const averagePartLength = normalized.length / partCount;
  const minimumPartLength = Math.max(4, Math.floor(averagePartLength * 0.35));
  const selectedBoundaries = [];
  let previousBoundary = 0;

  for (let partIndex = 1; partIndex < partCount; partIndex += 1) {
    const targetRatio = boundaryRatios[partIndex - 1] || partIndex / partCount;
    const targetIndex = Math.round(normalized.length * targetRatio);
    const maximumBoundary = normalized.length - minimumPartLength * (partCount - partIndex);
    const available = candidates.filter((candidate) =>
      candidate.index >= previousBoundary + minimumPartLength &&
      candidate.index <= maximumBoundary &&
      !selectedBoundaries.includes(candidate.index)
    );
    let selected = available.sort((left, right) => {
      const leftScore = Math.abs(left.index - targetIndex) +
        (1 - left.weight) * averagePartLength * 0.35;
      const rightScore = Math.abs(right.index - targetIndex) +
        (1 - right.weight) * averagePartLength * 0.35;
      return leftScore - rightScore;
    })[0];

    if (!selected) {
      const minimumBoundary = previousBoundary + minimumPartLength;
      selected = {
        index: Math.min(maximumBoundary, Math.max(minimumBoundary, targetIndex))
      };
    }
    selectedBoundaries.push(selected.index);
    previousBoundary = selected.index;
  }

  const parts = [];
  let startIndex = 0;
  [...selectedBoundaries, normalized.length].forEach((endIndex) => {
    const part = normalizeCaptionText(normalized.slice(startIndex, endIndex));
    if (part) parts.push(part);
    startIndex = endIndex;
  });
  return parts.length ? parts : [normalized];
}

function buildBilingualDisplayParts(sourceText, translation, cueDuration = Infinity) {
  const sourcePartCount = getCaptionDisplayPartCount(sourceText, currentSourceLang);
  const sourcePartCapacity = getCaptionDisplayPartCapacity(sourceText, currentSourceLang);
  const translationPartCapacity = translation
    ? getCaptionDisplayPartCapacity(translation, currentSettings.lang)
    : sourcePartCapacity;
  const durationPartCapacity = Number.isFinite(cueDuration)
    ? Math.max(1, Math.floor(cueDuration / DISPLAY_MIN_PART_DURATION_SECONDS))
    : DISPLAY_MAX_PARTS;
  const partCount = Math.min(
    DISPLAY_MAX_PARTS,
    sourcePartCount,
    sourcePartCapacity,
    durationPartCapacity
  );
  const sourceStrongRatios = getStrongCaptionBoundaryRatios(sourceText, currentSourceLang);
  const translationStrongRatios = translation
    ? getStrongCaptionBoundaryRatios(translation, currentSettings.lang)
    : [];
  // Character offsets are language-local: applying one language's sentence
  // ratio to the other can expose translated content before its source words.
  const sourceBoundaryRatios = sourceStrongRatios.length === partCount - 1
    ? sourceStrongRatios
    : [];
  const translationRequestedPartCount = Math.min(partCount, translationPartCapacity);
  const translationBoundaryRatios = translationStrongRatios.length === translationRequestedPartCount - 1
    ? translationStrongRatios
    : [];
  const sourceParts = splitCaptionIntoDisplayParts(
    sourceText,
    currentSourceLang,
    partCount,
    sourceBoundaryRatios
  );
  const rawTranslationParts = translation
    ? splitCaptionIntoDisplayParts(
        translation,
        currentSettings.lang,
        translationRequestedPartCount,
        translationBoundaryRatios
      )
    : [];
  const translationParts = rawTranslationParts.length
    ? Array.from({ length: partCount }, (_, index) => {
        const mappedIndex = Math.min(
          rawTranslationParts.length - 1,
          Math.floor(index * rawTranslationParts.length / partCount)
        );
        return rawTranslationParts[mappedIndex] || '';
      })
    : Array(partCount).fill('');

  return Array.from({ length: partCount }, (_, index) => ({
    source: sourceParts[index] || '',
    translation: translationParts[index] || ''
  }));
}

function getDisplayPartIndex(cue, displayParts, playbackTime) {
  if (displayParts.length <= 1 || cue.end <= cue.start) return 0;
  const progress = Math.max(0, Math.min(1, (playbackTime - cue.start) / (cue.end - cue.start)));
  const cueDuration = cue.end - cue.start;
  const elapsed = progress * cueDuration;
  const totalSourceLength = displayParts.reduce((total, part) => total + part.source.length, 0);
  if (!totalSourceLength) return Math.min(displayParts.length - 1, Math.floor(progress * displayParts.length));

  let consumedLength = 0;
  let previousBoundaryTime = 0;
  for (let index = 0; index < displayParts.length - 1; index += 1) {
    consumedLength += displayParts[index].source.length;
    const proportionalTime = cueDuration * consumedLength / totalSourceLength;
    const remainingParts = displayParts.length - index - 1;
    const earliestBoundary = previousBoundaryTime + DISPLAY_MIN_PART_DURATION_SECONDS;
    const latestBoundary = cueDuration - remainingParts * DISPLAY_MIN_PART_DURATION_SECONDS;
    const boundaryTime = Math.min(latestBoundary, Math.max(earliestBoundary, proportionalTime));
    if (elapsed < boundaryTime) return index;
    previousBoundaryTime = boundaryTime;
  }
  return displayParts.length - 1;
}

function getStableDisplayPart(displayParts, partIndex) {
  const currentPart = displayParts[partIndex] || { source: '', translation: '' };
  return currentPart;
}

function getRollingAsrDelta(previousText, nextText, useSpace) {
  const previous = normalizeCaptionText(previousText);
  const next = normalizeCaptionText(nextText);
  if (!previous) return next;
  if (!next || next === previous || previous.startsWith(next)) return '';
  if (next.startsWith(previous)) return normalizeCaptionText(next.slice(previous.length));

  if (useSpace) {
    const previousWords = previous.split(' ');
    const nextWords = next.split(' ');
    const maxOverlap = Math.min(previousWords.length, nextWords.length);
    for (let size = maxOverlap; size >= 1; size -= 1) {
      if (previousWords.slice(-size).join(' ') === nextWords.slice(0, size).join(' ')) {
        return normalizeCaptionText(nextWords.slice(size).join(' '));
      }
    }
  } else {
    const maxOverlap = Math.min(previous.length, next.length);
    for (let size = maxOverlap; size >= 2; size -= 1) {
      if (previous.slice(-size) === next.slice(0, size)) {
        return normalizeCaptionText(next.slice(size));
      }
    }
  }

  return next;
}

function renderLiveAsrContent(sourceText, translation, useHint, renderSequence, generation) {
  if (renderSequence !== liveAsrRenderSequence || generation !== trackLoadGeneration) return;
  hideLoadingMessage();
  lastText = sourceText;
  lastMatchedSource = '';
  updateSubtitleContent(
    sourceText,
    useHint ? getAutoGeneratedHintHtml() : translation,
    useHint
  );
}

function resetLiveAsrBuffer() {
  clearTimeout(liveAsrPrefetchTimer);
  clearTimeout(liveAsrCommitTimer);
  clearTimeout(liveAsrClearTimer);
  liveAsrPrefetchTimer = null;
  liveAsrCommitTimer = null;
  liveAsrClearTimer = null;
  liveAsrPendingText = '';
  liveAsrCommittedText = '';
  liveAsrRenderSequence += 1;
}

function translateLiveAsrSentence(sourceText, renderSequence, generation) {
  if (!currentSettings.showTrans) {
    renderLiveAsrContent(sourceText, '', false, renderSequence, generation);
    return;
  }

  const cachedTranslation = preloadedTranslations.get(sourceText);
  if (cachedTranslation) {
    renderLiveAsrContent(sourceText, cachedTranslation, false, renderSequence, generation);
    return;
  }

  ensureCueTranslation(sourceText, generation).then((translation) => {
    if (!translation || renderSequence !== liveAsrRenderSequence || generation !== trackLoadGeneration) return;
    renderLiveAsrContent(sourceText, translation, false, renderSequence, generation);
  });
}

function commitLiveAsrSentence(text = liveAsrPendingText) {
  const finalText = normalizeCaptionText(text);
  if (!finalText || finalText === liveAsrCommittedText) return;

  clearTimeout(liveAsrPrefetchTimer);
  liveAsrPrefetchTimer = null;
  liveAsrPendingText = '';
  const generation = trackLoadGeneration;
  liveAsrCommittedText = finalText;
  const renderSequence = ++liveAsrRenderSequence;
  translateLiveAsrSentence(finalText, renderSequence, generation);
}

function feedLiveAsrSnapshot(snapshot) {
  let nextText = normalizeCaptionText(snapshot);
  if (!nextText || nextText === liveAsrPendingText || nextText === liveAsrCommittedText) return;

  if (hasTerminalCaptionPunctuation(liveAsrCommittedText) &&
      nextText.startsWith(liveAsrCommittedText)) {
    nextText = normalizeCaptionText(nextText.slice(liveAsrCommittedText.length));
    if (!nextText) return;
  }

  clearTimeout(liveAsrCommitTimer);
  clearTimeout(liveAsrClearTimer);

  if (liveAsrPendingText && !nextText.startsWith(liveAsrPendingText)) {
    commitLiveAsrSentence(liveAsrPendingText);
  }

  liveAsrPendingText = nextText;
  if (hasTerminalCaptionPunctuation(nextText)) {
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

    if (trackMode === TRACK_MODE.DISCOVERING ||
        trackMode === TRACK_MODE.FILE_WARMING ||
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
    cachePlayerSnapshotMetadata(message.snapshot);
    cacheYouTubeCCEnabled(message.snapshot);
    cacheCCAvailability(message.snapshot);
    pendingRequest.resolve(message.snapshot || null);
    return;
  }

  if (message.type === 'TRACK_CHANGED') {
    cachePlayerSnapshotMetadata(message.snapshot);
    cacheCCAvailability(message.snapshot);
    const ccStateChanged = cacheYouTubeCCEnabled(message.snapshot);
    if (!currentSettings.enabled || isOrphaned) return;
    if (message.snapshot?.captionsEnabled === false || ccStateChanged) return;
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
  autoTranslationWindowSequence += 1;
  autoTranslationWindowAnchor = -1;
  clearTimeout(trackRetryTimer);
  clearTimeout(translateDebounceTimer);
  trackRetryTimer = null;
  translateDebounceTimer = null;
  if (trackAbortController) trackAbortController.abort();
  trackAbortController = null;
  inflightTranslations.clear();
}

function beginTrackLoad(reason = 'refresh') {
  if (isOrphaned || !currentSettings.enabled || !isCCAvailable || !isYouTubeWatchPage()) return;

  const buttonState = getYouTubeCCEnabledFromButton();
  if (buttonState !== null) isYouTubeCCEnabled = buttonState;
  if (isYouTubeCCEnabled !== true) {
    showYouTubeCaptionsDisabledMessage();
    return;
  }

  cancelTrackLoad();
  stopFileRenderer();
  resetLiveAsrBuffer();

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

  let buffer = '';
  let bufferStart = -1;
  let bufferEnd = -1;
  let bufferEventStartIndex = -1;
  let bufferEventEndIndex = -1;
  let previousEventText = '';
  let previousEventEnd = -1;

  const appendCue = (text, start, end, eventStartIndex, eventEndIndex) => {
    const finalText = normalizeCaptionText(text);
    if (finalText && start >= 0) {
      cues.push({
        text: finalText,
        start,
        end: Math.max(end, start + 0.6),
        eventStartIndex,
        eventEndIndex
      });
    }
  };

  const flushBuffer = () => {
    appendCue(
      buffer,
      bufferStart,
      Math.max(bufferEnd, bufferStart + 1.2),
      bufferEventStartIndex,
      bufferEventEndIndex
    );
    buffer = '';
    bufferStart = -1;
    bufferEnd = -1;
    bufferEventStartIndex = -1;
    bufferEventEndIndex = -1;
  };

  const flushCompletedSentences = () => {
    const originalBuffer = normalizeCaptionText(buffer);
    const { completed, remainder } = splitCompletedCaptionSentences(
      originalBuffer,
      currentSourceLang
    );
    if (!completed.length || bufferStart < 0) return;

    const originalStart = bufferStart;
    const originalEnd = Math.max(bufferEnd, originalStart + 0.6);
    const duration = originalEnd - originalStart;
    let sentenceStart = originalStart;

    completed.forEach((sentence) => {
      const boundaryRatio = Math.min(1, sentence.endIndex / Math.max(originalBuffer.length, 1));
      const sentenceEnd = Math.max(sentenceStart + 0.25, originalStart + duration * boundaryRatio);
      appendCue(
        sentence.text,
        sentenceStart,
        sentenceEnd,
        bufferEventStartIndex,
        bufferEventEndIndex
      );
      sentenceStart = sentenceEnd;
    });

    buffer = remainder;
    if (buffer) {
      bufferStart = Math.min(sentenceStart, originalEnd);
      bufferEventStartIndex = bufferEventEndIndex;
    } else {
      bufferStart = -1;
      bufferEnd = -1;
      bufferEventStartIndex = -1;
      bufferEventEndIndex = -1;
    }
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
    const startsNewSpeaker = event.segs.some((segment) =>
      segment.isSpeakerChange === 1 || /^>>/.test(segment.utf8 || '')
    );

    if (buffer && (gap > ASR_STRUCTURAL_GAP_SECONDS || startsNewSpeaker)) {
      flushBuffer();
      previousEventText = '';
      previousEventEnd = -1;
    }

    const overlapsPreviousEvent = previousEventEnd >= 0 && start <= previousEventEnd + 0.1;
    const textToAppend = overlapsPreviousEvent
      ? getRollingAsrDelta(previousEventText, segmentText, useSpace)
      : segmentText;
    previousEventText = segmentText;
    previousEventEnd = end;
    if (!textToAppend) {
      if (buffer) bufferEnd = Math.max(bufferEnd, end);
      return;
    }

    if (!buffer) {
      bufferStart = start;
      bufferEventStartIndex = eventIndex;
    }
    bufferEventEndIndex = eventIndex;
    buffer += `${buffer && useSpace ? ' ' : ''}${textToAppend}`;
    buffer = normalizeCaptionText(buffer);
    bufferEnd = Math.max(bufferEnd, end);
    flushCompletedSentences();

    const emergencyCharLimit = useSpace
      ? ASR_EMERGENCY_MAX_CHARS
      : ASR_EMERGENCY_MAX_COMPACT_CHARS;
    const bufferDuration = bufferStart >= 0 ? bufferEnd - bufferStart : 0;
    if (buffer && (buffer.length >= emergencyCharLimit ||
        bufferDuration >= ASR_EMERGENCY_MAX_DURATION_SECONDS)) {
      flushBuffer();
    }
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
  const sourceEventRangeCounts = new Map();
  if (rolling) {
    sourceCues.forEach((cue) => {
      const rangeKey = `${cue.eventStartIndex}:${cue.eventEndIndex}`;
      sourceEventRangeCounts.set(rangeKey, (sourceEventRangeCounts.get(rangeKey) || 0) + 1);
    });
  }
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
      const rangeKey = `${cue.eventStartIndex}:${cue.eventEndIndex}`;
      if (sourceEventRangeCounts.get(rangeKey) !== 1) return;
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
      candidates = translatedEvents.filter(({ start, end, text }) =>
        text && start < cue.end + 0.12 && end > cue.start - 0.12
      );
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
    if (rolling && translatedText) {
      const { completed, remainder } = splitCompletedCaptionSentences(translatedText, targetLang);
      if (completed.length !== 1 || remainder) return;
      translatedText = completed[0].text;
    }
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

function getCueVisibleEnd(cueIndex) {
  const cue = preloadedSentencesList[cueIndex];
  if (!cue) return -1;
  const nextCue = preloadedSentencesList[cueIndex + 1];
  const extendedEnd = cue.end + 0.45;
  return nextCue
    ? Math.min(extendedEnd, nextCue.start - 0.01)
    : extendedEnd;
}

function findCueIndexAtTime(time) {
  if (!preloadedSentencesList.length || time < 0) return -1;

  const currentCue = preloadedSentencesList[currentCueIndex];
  if (currentCue && time >= currentCue.start && time <= getCueVisibleEnd(currentCueIndex)) {
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
  return time <= getCueVisibleEnd(candidate) ? candidate : -1;
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
  if (!sourceText) return '';
  if (preloadedTranslations.has(sourceText)) return preloadedTranslations.get(sourceText);
  const requestKey = getTranslationRequestKey(sourceText, generation);
  if (inflightTranslations.has(requestKey)) return inflightTranslations.get(requestKey);

  const request = requestTranslation(sourceText).then((translation) => {
    inflightTranslations.delete(requestKey);
    if (!translation || generation !== trackLoadGeneration) return translation || '';
    preloadedTranslations.set(sourceText, translation);
    if (sourceText === lastMatchedSource && trackMode === TRACK_MODE.FILE_READY) renderFileCue();
    return translation;
  });
  inflightTranslations.set(requestKey, request);
  return request;
}

function displayFileCue(cueIndex, translation = '', playbackTime = null, options = {}) {
  const cue = preloadedSentencesList[cueIndex];
  if (!cue || cueIndex !== currentCueIndex || trackMode !== TRACK_MODE.FILE_READY) return;

  const cacheKey = `${currentSourceLang}|${currentSettings.lang}|${translation}`;
  const displayPartsChanged = cue.displayPartsCacheKey !== cacheKey;
  if (displayPartsChanged) {
    cue.displayPartsCacheKey = cacheKey;
    cue.displayParts = buildBilingualDisplayParts(cue.text, translation, cue.end - cue.start);
  }
  const effectivePlaybackTime = Number.isFinite(playbackTime)
    ? playbackTime
    : getPlayerVideoElement()?.currentTime ?? cue.start;
  const partIndex = getDisplayPartIndex(cue, cue.displayParts, effectivePlaybackTime);
  if (!displayPartsChanged && cueIndex === renderedFileCueIndex && partIndex === renderedFileCuePartIndex) {
    if (!options.keepPending) pendingFileCueIndex = -1;
    return;
  }
  const displayPart = getStableDisplayPart(cue.displayParts, partIndex);
  renderedFileCueIndex = cueIndex;
  renderedFileCuePartIndex = partIndex;
  if (!options.keepPending) pendingFileCueIndex = -1;
  hideLoadingMessage();
  lastMatchedSource = cue.text;
  lastText = displayPart.source;
  updateSubtitleContent(displayPart.source, displayPart.translation);
}

function renderFileCue() {
  if (trackMode !== TRACK_MODE.FILE_READY || isOrphaned || !currentSettings.enabled) return;
  const video = getPlayerVideoElement();
  if (!video) return;

  const playbackTime = video.currentTime;
  if (isAutoGenerated) refreshAutoTranslationWindow(playbackTime);
  if (isAutoGenerated && pendingFileCueIndex >= 0 && renderedFileCueIndex >= 0 &&
      pendingFileCueIndex !== renderedFileCueIndex) {
    const displayedCue = preloadedSentencesList[renderedFileCueIndex];
    if (displayedCue && playbackTime > getCueVisibleEnd(renderedFileCueIndex)) {
      renderedFileCueIndex = -1;
      renderedFileCuePartIndex = -1;
      clearSubtitleContent();
    }
  }

  const nextCueIndex = findCueIndexAtTime(playbackTime);
  if (nextCueIndex < 0) {
    clearTimeout(fileCueTranslationRetryTimer);
    fileCueTranslationRetryTimer = null;
    pendingFileCueIndex = -1;
    renderedFileCueIndex = -1;
    renderedFileCuePartIndex = -1;
    if (lastMatchedSource || lastText) clearSubtitleContent();
    currentCueIndex = -1;
    return;
  }

  currentCueIndex = nextCueIndex;
  const cue = preloadedSentencesList[nextCueIndex];
  const translation = preloadedTranslations.get(cue.text);
  if (nextCueIndex === renderedFileCueIndex) {
    if (pendingFileCueIndex === nextCueIndex && !translation) return;
    displayFileCue(nextCueIndex, translation || '', playbackTime);
    return;
  }
  if (nextCueIndex === pendingFileCueIndex) return;

  clearTimeout(fileCueTranslationRetryTimer);
  fileCueTranslationRetryTimer = null;
  pendingFileCueIndex = nextCueIndex;
  if (!currentSettings.showTrans) {
    displayFileCue(nextCueIndex, '', playbackTime);
    return;
  }

  if (translation) {
    displayFileCue(nextCueIndex, translation, playbackTime);
    return;
  }

  displayFileCue(nextCueIndex, '', playbackTime, { keepPending: true });

  ensureCueTranslation(cue.text).then(() => {
    if (nextCueIndex !== currentCueIndex || pendingFileCueIndex !== nextCueIndex) return;
    const readyTranslation = preloadedTranslations.get(cue.text);
    if (readyTranslation) {
      clearTimeout(fileCueTranslationRetryTimer);
      fileCueTranslationRetryTimer = null;
      displayFileCue(nextCueIndex, readyTranslation, getPlayerVideoElement()?.currentTime);
      return;
    }

    fileCueTranslationRetryTimer = setTimeout(() => {
      if (nextCueIndex !== currentCueIndex || pendingFileCueIndex !== nextCueIndex) return;
      fileCueTranslationRetryTimer = null;
      pendingFileCueIndex = -1;
      renderFileCue();
    }, AUTO_FILE_TRANSLATION_RETRY_MS);
  });
}

function startFileRenderer() {
  stopFileRenderer();
  renderFileCue();
  const renderInterval = isAutoGenerated ? AUTO_FILE_RENDER_INTERVAL_MS : FILE_RENDER_INTERVAL_MS;
  fileRendererTimer = setInterval(renderFileCue, renderInterval);
}

function stopFileRenderer() {
  if (fileRendererTimer) clearInterval(fileRendererTimer);
  clearTimeout(fileCueTranslationRetryTimer);
  fileCueTranslationRetryTimer = null;
  fileRendererTimer = null;
  currentCueIndex = -1;
  pendingFileCueIndex = -1;
  renderedFileCueIndex = -1;
  renderedFileCuePartIndex = -1;
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
    renderFileCue();
  }
}

function getAutoTranslationWindowTexts(playhead) {
  const nearestIndex = Math.max(0, findNextCueIndexAtTime(playhead));
  const windowEnd = playhead + AUTO_TRANSLATION_LOOKAHEAD_SECONDS;
  const windowTexts = [];

  for (let index = nearestIndex;
       index < preloadedSentencesList.length && windowTexts.length < AUTO_TRANSLATION_WINDOW_MAX_CUES;
       index += 1) {
    const cue = preloadedSentencesList[index];
    if (windowTexts.length && cue.start > windowEnd) break;
    if (!windowTexts.includes(cue.text)) windowTexts.push(cue.text);
  }

  return windowTexts;
}

async function fillAutoTranslationWindow(generation, playhead, windowSequence) {
  const windowTexts = getAutoTranslationWindowTexts(playhead).filter((text) =>
    !preloadedTranslations.has(text) &&
    !inflightTranslations.has(getTranslationRequestKey(text, generation))
  );

  for (let index = 0; index < windowTexts.length; index += AUTO_TRANSLATION_WINDOW_CONCURRENCY) {
    if (generation !== trackLoadGeneration || windowSequence !== autoTranslationWindowSequence ||
        isOrphaned || !currentSettings.enabled) return;
    const group = windowTexts.slice(index, index + AUTO_TRANSLATION_WINDOW_CONCURRENCY);
    await Promise.all(group.map((text) => ensureCueTranslation(text, generation)));
  }
}

function refreshAutoTranslationWindow(playhead, force = false) {
  if (!isAutoGenerated || !currentSettings.showTrans) return null;
  if (!force && autoTranslationWindowAnchor >= 0 &&
      Math.abs(playhead - autoTranslationWindowAnchor) < AUTO_TRANSLATION_WINDOW_REFRESH_SECONDS) {
    return null;
  }

  autoTranslationWindowAnchor = playhead;
  const generation = trackLoadGeneration;
  const windowSequence = ++autoTranslationWindowSequence;
  const refillPromise = fillAutoTranslationWindow(generation, playhead, windowSequence);
  refillPromise.catch((error) => {
    if (generation === trackLoadGeneration) {
      console.info(`lasDoscas: 自动字幕滚动预翻译未完成：${error.message}`);
    }
  });
  return refillPromise;
}

async function warmAutoFileTranslations(generation) {
  if (!isAutoGenerated || !currentSettings.showTrans || generation !== trackLoadGeneration) return;
  const video = getPlayerVideoElement();
  const playhead = video?.currentTime || 0;
  const refillPromise = refreshAutoTranslationWindow(playhead, true);

  if (!refillPromise) return;
  await Promise.race([
    refillPromise,
    new Promise((resolve) => setTimeout(resolve, AUTO_FILE_WARMUP_TIMEOUT_MS))
  ]);
}

async function preloadTranslations(generation) {
  const video = getPlayerVideoElement();
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

  if (snapshot?.captionsEnabled === false) {
    showYouTubeCaptionsDisabledMessage();
    return;
  }

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
    if (isAutoGenerated) await warmAutoFileTranslations(generation);
    if (generation !== trackLoadGeneration) return;
    trackMode = TRACK_MODE.FILE_READY;

    console.log(`lasDoscas: 已加载 ${cues.length} 条字幕，启用独立时间轴双语渲染。`);
    const video = getPlayerVideoElement();
    const initialCueIndex = findNextCueIndexAtTime(video?.currentTime || 0);
    if (initialCueIndex >= 0 && !preloadedTranslations.has(cues[initialCueIndex].text)) {
      ensureCueTranslation(cues[initialCueIndex].text, generation);
    }
    startFileRenderer();
    if (!isAutoGenerated) preloadTranslations(generation);

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
  resetPlayerElementCache();
  currentCaptionContainer = null;
  resetCurrentVideoMetadata();
  resetCCAvailability();

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

  const moviePlayer = getMoviePlayerElement();
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
      const moviePlayer = getMoviePlayerElement();
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
  
  if (message.action === "get_cc_availability") {
    refreshCCAvailability().then((ccAvailable) => {
      sendResponse({ ccAvailable });
    });
    return true;
  } else if (message.action === "toggle_settings_panel") {
    if (isNativePopupActive) return;
    toggleFullscreenSettings();
  } else if (message.action === "close_settings_panel") {
    removeFullscreenSettings();
  }
});
