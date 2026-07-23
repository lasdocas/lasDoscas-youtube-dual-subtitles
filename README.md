# lasDoscas - YouTube™ Dual Subtitles

<p align="center">
  <a href="#简体中文">简体中文</a> |
  <a href="#english">English</a> |
  <a href="#español">Español</a>
</p>

lasDoscas is a free, lightweight browser extension that displays synchronized original and translated subtitles on YouTube watch pages. It supports manually created and auto-generated captions, 55 translation languages, three player layouts, and detailed subtitle styling.

Chrome Web Store: [Install lasDoscas](https://chromewebstore.google.com/detail/lasdoscas-youtube-dual-su/loefcmgapbdgdldkcekokidchffegceg)

---

## 简体中文

lasDoscas 是一款免费、轻量的 YouTube 双语字幕扩展。它会同时显示原文与译文，并根据视频播放时间独立同步字幕，适用于普通视图、影院模式和全屏模式。

### 主要功能

- **稳定的双语同步**：优先读取 YouTube JSON3 字幕，并按照播放器当前时间渲染原文和译文，拖动进度条或切换字幕轨后会自动重新同步。
- **支持人工字幕与自动生成字幕**：针对滚动式自动语音识别字幕提供缓冲和合并处理，减少文本重复与闪烁；无法读取字幕文件时会自动回退到实时字幕处理。
- **55 种翻译目标语言**：根据浏览器语言智能选择默认译文语言，也可在设置面板中随时更改。
- **融入 YouTube 播放器**：播放器控制栏内提供 lasDoscas 开关与设置入口，无需离开视频页面。
- **覆盖三种播放布局**：普通视图和影院模式在播放器下方显示字幕，全屏模式则在播放器底部显示。
- **复制当前字幕**：悬停字幕区域后点击复制按钮，可复制带时间戳的当前原文；按住 `Shift` 点击可同时复制视频标题、发布日期（若可用）、视频链接和字幕。
- **完整样式设置**：可分别控制原文和译文的显示、字号、粗体及颜色，并独立设置全屏字号、背景样式和背景透明度。
- **即时保存**：开关、语言和样式设置会立即保存到本机，不再需要点击“应用”。重置操作提供短暂的撤销机会。
- **三语设置界面**：设置面板支持简体中文、English 和 Español，并提供浅色、深色主题。

### 安装

#### Chrome 应用商店（推荐）

1. 打开 [Chrome Web Store](https://chromewebstore.google.com/detail/lasdoscas-youtube-dual-su/loefcmgapbdgdldkcekokidchffegceg)。
2. 点击“添加至 Chrome”。Edge 用户首次从 Chrome 应用商店安装扩展时，需要先允许来自其他商店的扩展。

#### 开发者模式

1. 下载本仓库源码并解压。
2. 打开 `chrome://extensions/`；Edge 请打开 `edge://extensions/`。
3. 开启“开发者模式”。
4. 点击“加载已解压的扩展程序”，选择包含 `manifest.json` 的项目根目录。
5. 更新源码后，在扩展管理页点击“重新加载”，并刷新已经打开的 YouTube 页面。

### 使用方法

1. 打开一个带字幕的 YouTube 视频。
2. 在 YouTube 字幕菜单中选择原始字幕轨或“自动生成”字幕轨。请勿选择 YouTube 自带的“自动翻译”轨道，lasDoscas 需要原始字幕来生成双语内容。
3. 使用播放器控制栏中的 lasDoscas 开关启用扩展，也可以点击浏览器工具栏中的扩展图标启用。
4. 点击播放器内的 lasDoscas 图标或浏览器工具栏图标，选择目标语言并调整字幕样式。所有改动会即时生效并保存在本机。

### 复制与快捷键

- **点击复制按钮**：复制 `[分:秒]  当前原文字幕`。
- **按住 `Shift` 点击复制按钮**：复制视频标题、发布日期（若 YouTube 提供）、标准视频链接以及带时间戳的当前原文字幕。
- **`Shift + Alt + S`**：显示或隐藏播放器内设置面板。macOS 对应 **`Shift + Option + S`**。

### 使用提示

- 扩展只在 YouTube `/watch` 视频页面运行，并且视频必须提供可用字幕。
- 如果字幕轨刚切换、字幕未立即出现或扩展刚重新加载，请刷新视频页面后重试。
- YouTube 的网页结构和字幕接口可能发生变化。如遇问题，请在 [GitHub Issues](https://github.com/lasdocas/lasDoscas-youtube-dual-subtitles/issues) 中附上浏览器版本、视频链接、字幕类型和复现步骤。

---

## English

lasDoscas is a free, lightweight YouTube dual-subtitle extension. It displays the original caption and its translation together, synchronized against the video's playback time in default view, theater mode, and fullscreen.

### Highlights

- **Time-synchronized dual subtitles**: Reads YouTube JSON3 caption tracks and renders both rows against `video.currentTime`, including after seeking or changing caption tracks.
- **Manual and auto-generated captions**: Buffers rolling ASR captions to reduce duplicated words and flicker, with a live-caption fallback when a caption file is unavailable.
- **55 translation languages**: Select any supported target language; new installations use a smart default based on the browser language.
- **YouTube player controls**: Enable or disable lasDoscas and open its settings directly from the player controls.
- **All player layouts**: Supports default view, theater mode, and fullscreen.
- **Subtitle copy tools**: Hover over the subtitle area and click the copy button for the current timestamped source caption. Hold `Shift` while clicking to include the video title, publication date when available, canonical URL, and caption.
- **Detailed styling**: Choose a global font; configure each row's visibility, size, weight, color, and fullscreen size; and select a fullscreen background mode and opacity.
- **Instant saving**: Every setting is saved locally as soon as it changes. Reset includes a short undo window.
- **Trilingual settings UI**: English, Simplified Chinese, and Spanish, with light and dark themes.

### Installation

#### Chrome Web Store (recommended)

1. Open the [Chrome Web Store listing](https://chromewebstore.google.com/detail/lasdoscas-youtube-dual-su/loefcmgapbdgdldkcekokidchffegceg).
2. Click **Add to Chrome**. In Microsoft Edge, first allow extensions from other stores if prompted.

#### Developer mode

1. Download and extract this repository.
2. Open `chrome://extensions/`, or `edge://extensions/` in Microsoft Edge.
3. Enable **Developer mode**.
4. Select **Load unpacked** and choose the project root containing `manifest.json`.
5. After changing the source, reload the extension from the extensions page and refresh any open YouTube tabs.

### Usage

1. Open a YouTube video that provides captions.
2. In YouTube's caption menu, select an original caption track or an auto-generated track. Do not select YouTube's own **Auto-translate** track; lasDoscas needs the source track to build its bilingual output.
3. Turn on lasDoscas from the switch in the player controls or from the extension popup.
4. Open the settings from the lasDoscas player icon or browser toolbar icon, then choose a target language and subtitle styles. Changes apply and save immediately.

### Copy And Shortcut

- **Click the copy button**: Copies `[minutes:seconds]  current source caption`.
- **`Shift` + click the copy button**: Copies the video title, publication date when available, canonical video URL, and timestamped source caption.
- **`Shift + Alt + S`**: Shows or hides the in-player settings panel. On macOS, use **`Shift + Option + S`**.

### Notes

- The extension runs only on YouTube `/watch` pages and requires a video with an available caption track.
- If captions do not appear after changing tracks or reloading the extension, refresh the video page and try again.
- YouTube can change its page structure and caption endpoints. When reporting an issue in [GitHub Issues](https://github.com/lasdocas/lasDoscas-youtube-dual-subtitles/issues), include the browser version, video URL, caption type, and reproduction steps.

---

## Español

lasDoscas es una extensión gratuita y ligera de subtítulos duales para YouTube. Muestra el subtítulo original y su traducción a la vez, sincronizados con el tiempo de reproducción en la vista predeterminada, el modo cine y la pantalla completa.

### Funciones principales

- **Subtítulos duales sincronizados**: Lee las pistas JSON3 de YouTube y renderiza ambas líneas según `video.currentTime`, incluso después de adelantar el video o cambiar de pista.
- **Subtítulos manuales y generados automáticamente**: Procesa los subtítulos ASR progresivos para reducir repeticiones y parpadeos, con un modo alternativo en tiempo real cuando el archivo de subtítulos no está disponible.
- **55 idiomas de traducción**: Permite elegir el idioma de destino y selecciona un valor inicial inteligente según el idioma del navegador.
- **Controles dentro del reproductor**: Activa o desactiva lasDoscas y abre la configuración desde los controles de YouTube.
- **Todos los modos de visualización**: Compatible con la vista predeterminada, el modo cine y la pantalla completa.
- **Copia de subtítulos**: Pasa el cursor sobre el área de subtítulos y pulsa el botón de copia para copiar el texto original con su marca de tiempo. Mantén `Shift` al pulsar para añadir el título, la fecha de publicación si está disponible, el enlace del video y el subtítulo.
- **Estilos detallados**: Configura por separado la visibilidad, el tamaño, la negrita y el color del original y la traducción, además del tamaño y el fondo en pantalla completa.
- **Guardado inmediato**: Cada cambio se guarda localmente en el momento. La acción de restablecer incluye un breve periodo para deshacerla.
- **Interfaz trilingüe**: Español, English y chino simplificado, con temas claro y oscuro.

### Instalación

#### Chrome Web Store (recomendado)

1. Abre la [ficha de Chrome Web Store](https://chromewebstore.google.com/detail/lasdoscas-youtube-dual-su/loefcmgapbdgdldkcekokidchffegceg).
2. Pulsa **Añadir a Chrome**. En Microsoft Edge, permite primero las extensiones de otras tiendas si el navegador lo solicita.

#### Modo de desarrollador

1. Descarga y descomprime este repositorio.
2. Abre `chrome://extensions/`, o `edge://extensions/` en Microsoft Edge.
3. Activa el **Modo de desarrollador**.
4. Selecciona **Cargar descomprimida** y elige la carpeta raíz que contiene `manifest.json`.
5. Después de modificar el código, vuelve a cargar la extensión y actualiza las pestañas de YouTube abiertas.

### Uso

1. Abre un video de YouTube que tenga subtítulos.
2. En el menú de subtítulos de YouTube, selecciona una pista original o una pista generada automáticamente. No selecciones la pista **Traducir automáticamente** de YouTube; lasDoscas necesita la pista original para crear el resultado bilingüe.
3. Activa lasDoscas desde el interruptor del reproductor o desde el panel de la extensión.
4. Abre la configuración desde el icono de lasDoscas en el reproductor o en la barra del navegador. Selecciona el idioma y los estilos; los cambios se aplican y guardan inmediatamente.

### Copia Y Atajo

- **Pulsa el botón de copia**: Copia `[minutos:segundos]  subtítulo original actual`.
- **`Shift` + botón de copia**: Copia el título, la fecha de publicación si está disponible, la URL del video y el subtítulo original con su marca de tiempo.
- **`Shift + Alt + S`**: Muestra u oculta el panel de configuración dentro del reproductor. En macOS, usa **`Shift + Option + S`**.

### Notas

- La extensión solo se ejecuta en las páginas `/watch` de YouTube y necesita una pista de subtítulos disponible.
- Si los subtítulos no aparecen después de cambiar de pista o recargar la extensión, actualiza la página del video.
- YouTube puede cambiar su estructura y sus servicios de subtítulos. Al informar de un problema en [GitHub Issues](https://github.com/lasdocas/lasDoscas-youtube-dual-subtitles/issues), incluye la versión del navegador, la URL del video, el tipo de subtítulo y los pasos para reproducirlo.

---

## Supported Translation Languages

The target-language selector currently contains 55 options:

English, 中文（简体）, 中文（繁體）, Español, Français, Français canadien, Deutsch, 日本語, 한국어, Português, Bahasa Indonesia, Bahasa Melayu, Русский, العربية, हिन्दी, தமிழ், ภาษาไทย, Tiếng Việt, Türkçe, Polski, Nederlands, Svenska, Dansk, Norsk, Suomi, Italiano, Română, Magyar, Čeština, Hrvatski, Ελληνικά, עברית, Filipino, Українська, Euskara, Català, Galego, Íslenska, Kiswahili, eesti, latviešu, lietuvių, slovenčina, slovenščina, български, српски, اردو, فارسی, मराठी, বাংলা, ગુજરાતી, తెలుగు, ಕನ್ನಡ, മലയാളം, አማርኛ.

## Browser Compatibility

lasDoscas targets Manifest V3 browsers based on Chromium, including Google Chrome, Microsoft Edge, Brave, Opera, and Vivaldi. YouTube and browser updates can affect extension behavior, so the latest stable browser version is recommended.

## Privacy And Permissions

lasDoscas does not collect, store, or transmit personal data or browsing history. Preferences are stored on the device through `chrome.storage.local`. Subtitle text is sent to the configured Google translation endpoint only when translation is needed. See [PRIVACY_POLICY.md](PRIVACY_POLICY.md) for the full policy.

The extension requests only the access needed for its features:

- `storage`: saves the enable state, target language, theme, and subtitle styles locally.
- `*://*.youtube.com/*`: reads the current video's caption/player state and inserts the bilingual subtitle UI on YouTube.
- `https://translate.googleapis.com/*`: requests subtitle translations.

No account, ads, analytics, or payment is required.

## Development Notes

This is a Manifest V3 extension with no build step or package installation.

- `manifest.json`: extension metadata, permissions, commands, and script registration.
- `page-bridge.js`: reads YouTube player/caption metadata in the page's main world and sends normalized snapshots through `window.postMessage`.
- `content.js`: manages caption-track state, JSON3/ASR parsing, translation preloading, time-synchronized rendering, copying, player controls, and the in-player settings panel.
- `background.js`: performs translation requests and forwards the keyboard command to the active tab.
- `popup.html` / `popup.js`: settings UI, localization, instant local persistence, reset, and undo behavior.
- `style.css`: subtitle layouts, player controls, copy feedback, and fullscreen presentation.
- `_locales/`: localized extension name, description, and command text.

For a manual smoke test, load the unpacked extension and verify a manually captioned video plus an auto-generated-caption video in default view, theater mode, and fullscreen. Also check seeking, caption-track changes, target-language changes, both copy modes, the player switch, the settings shortcut, and light/dark settings themes.

## License

[MIT License](LICENSE.txt) © 2026 [lasdocas](https://github.com/lasdocas)
