(() => {
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
  
  const aiLoadingMessageDict = Object.freeze({
    'zh-cn': 'lasDoscas 正在加载字幕，AI 正在准备增强翻译…',
    'zh-tw': 'lasDoscas 正在載入字幕，AI 正在準備增強翻譯…',
    zh: 'lasDoscas 正在加载字幕，AI 正在准备增强翻译…',
    en: 'lasDoscas is loading captions; AI translation enhancement is starting…',
    es: 'lasDoscas está cargando subtítulos; la IA está preparando la traducción…'
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
  
  const hintMessageDict = Object.freeze({
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
  });

  const autoTranslateSelectionMessageDict = Object.freeze({
    zh: '检测到 YouTube 自动翻译。请改选字幕文件或“自动生成”字幕以获得更准确、及时的翻译。',
    en: 'YouTube auto-translation detected. Choose an original or auto-generated Subtitle/CC for more accurate, timely translation.',
    es: 'Se detectó la traducción automática de YouTube. Elige subtítulos originales o generados automáticamente para una traducción más precisa y oportuna.'
  });

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

  const liveAsrUiText = Object.freeze({
    zh: Object.freeze({
      label: '实时识别',
      notice: '当前字幕来自实时语音识别。原文和译文可能随新增语境调整，仅供参考。'
    }),
    en: Object.freeze({
      label: 'Live transcription',
      notice: 'Source text and translation may be revised as more context becomes available.'
    }),
    es: Object.freeze({
      label: 'Transcripción en vivo',
      notice: 'El texto original y la traducción pueden cambiar a medida que haya más contexto.'
    })
  });

  function resolveLocalizedMessage(dictionary, language = 'en') {
    const exactLanguage = String(language || 'en');
    const normalizedLanguage = exactLanguage.toLowerCase();
    const prefix = normalizedLanguage.split('-')[0];
    return dictionary[exactLanguage] ||
      dictionary[normalizedLanguage] ||
      dictionary[prefix] ||
      dictionary.en;
  }

  globalThis.lasDoscasMessages = Object.freeze({
    loadingMessageDict,
    aiLoadingMessageDict,
    youtubeCaptionsDisabledMessageDict,
    hintMessageDict,
    autoTranslateSelectionMessageDict,
    copyUiText,
    liveAsrUiText,
    resolveLocalizedMessage
  });
})();
