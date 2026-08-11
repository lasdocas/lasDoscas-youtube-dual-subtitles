# lasDoscas - YouTube™ Dual Subtitles

<p align="center">
  <a href="#简体中文">简体中文</a> |
  <a href="#english">English</a> |
  <a href="#español">Español</a>
</p>

## 简体中文

lasDoscas 是一款免费、开源、轻量的 YouTube 双语字幕扩展。它会同时显示原文与译文，并根据视频播放时间独立同步字幕，适用于普通视图、影院模式和全屏模式。标准翻译无需账号或 API Key；需要更自然译文时，可选择使用自己的 AI 服务商 Key 开启 BYOK（Bring Your Own Key）增强。

### 主要功能

- **稳定的双语同步**：优先读取 YouTube JSON3 字幕，并按照播放器当前时间渲染原文和译文，拖动进度条或切换字幕轨后会自动重新同步。
- **支持人工字幕与自动生成字幕**：针对滚动式自动语音识别字幕提供缓冲和合并处理，减少文本重复与闪烁；无法读取字幕文件时会自动回退到实时字幕处理。
- **可选 BYOK AI 增强**：支持 Google Gemini、Groq 和 OpenRouter。AI 直接结合相邻字幕上下文翻译原文，并在成功后替换标准译文；扩展不提供共享 Key，也不会强制开启 AI。
- **低请求量的上下文批处理**：对可下载字幕按播放窗口批量增强，使用稳定 ID 映射结果，并对缺失项有限重试；实时 ASR 仍优先保证当前字幕延迟。
- **可靠回退与缓存**：默认在 AI 不可用时继续使用标准翻译。经过验证的译文会按视频、字幕轨、语言和服务商缓存在本机，减少重复请求。
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

### 可选：配置 AI 增强（BYOK）

1. 打开设置并展开“AI 增强”，选择 `Google Gemini`、`Groq` 或 `OpenRouter`。
2. 粘贴该服务商签发的 API Key，点击“测试连接”。lasDoscas 不出售或提供 API Key，服务商的额度和计费规则由服务商决定。
3. 默认情况下，Key 只保存在当前浏览器会话；勾选“在此设备记住 Key”后才会写入本机持久存储。Key 不会发送给 YouTube。
4. 点击“应用 Key”开启 AI。建议保留“AI 不可用时使用标准翻译”，避免限流、网络错误或额度耗尽时译文消失。
5. 字幕区域左侧的 AI 按钮可随时开启或关闭增强，并显示关闭、待命、处理中、缓存命中或已增强状态。

### 复制与快捷键

- **点击复制按钮**：复制 `[分:秒]  当前原文字幕`。
- **按住 `Shift` 点击复制按钮**：复制视频标题、发布日期（若 YouTube 提供）、标准视频链接以及带时间戳的当前原文字幕。
- **`Shift + Alt + S`**：显示或隐藏播放器内设置面板。macOS 对应 **`Shift + Option + S`**。

### 使用提示

- 扩展只在 YouTube `/watch` 视频页面运行，并且视频必须提供可用字幕。
- 标准翻译可能使用 YouTube 翻译字幕轨或 Google Translate 接口；开启 AI 后，需要翻译的字幕文本和最多 3 条相邻上下文会发送给你选择的 AI 服务商。API Key 仅发送给该服务商用于鉴权。
- 扩展不会收集账号、浏览历史或使用分析数据。设置、Key 和字幕译文缓存保存在浏览器存储中；可通过“清除 Key”移除当前服务商的 Key。
- 如果字幕轨刚切换、字幕未立即出现或扩展刚重新加载，请刷新视频页面后重试。
- YouTube 的网页结构和字幕接口可能发生变化。如遇问题，请在 [GitHub Issues](https://github.com/lasdocas/lasDoscas-youtube-dual-subtitles/issues) 中附上浏览器版本、视频链接、字幕类型和复现步骤。

---

## English

lasDoscas is a free, open-source, lightweight YouTube dual-subtitle extension. It displays the original caption and its translation together, synchronized against the video's playback time in default view, theater mode, and fullscreen. Standard translation requires no account or API key; optional BYOK (Bring Your Own Key) AI enhancement is available when you want a more context-aware translation.

### Highlights

- **Time-synchronized dual subtitles**: Reads YouTube JSON3 caption tracks and renders both rows against `video.currentTime`, including after seeking or changing caption tracks.
- **Manual and auto-generated captions**: Buffers rolling ASR captions to reduce duplicated words and flicker, with a live-caption fallback when a caption file is unavailable.
- **Optional BYOK AI enhancement**: Supports Google Gemini, Groq, and OpenRouter. AI translates the source with nearby caption context and replaces the standard result only after a valid response. No shared key is provided, and AI is never enabled automatically.
- **Context-aware batching with fewer requests**: Downloadable tracks are enhanced in playback-sized batches with stable result IDs and bounded retries; live ASR continues to prioritize current-caption latency.
- **Fallback and local caching**: Standard translation remains available by default when AI is unavailable. Validated translations are cached locally by video, track, language, and provider to avoid duplicate requests.
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

### Optional: Configure AI Enhancement (BYOK)

1. Open settings, expand **AI enhancement**, and select `Google Gemini`, `Groq`, or `OpenRouter`.
2. Paste an API key issued by that provider and select **Test connection**. lasDoscas does not sell or supply keys; provider quotas and charges are controlled by the provider.
3. By default, the key stays in browser session storage. It is written to persistent local storage only when **Remember key on this device** is enabled. The key is never sent to YouTube.
4. Select **Apply key** to enable AI. Keeping **Use standard translation if AI is unavailable** enabled prevents missing translations during rate limits, network errors, or exhausted quotas.
5. The AI button on the left side of the subtitle panel toggles enhancement and reports off, standby, processing, cached, or enhanced states.

### Copy And Shortcut

- **Click the copy button**: Copies `[minutes:seconds]  current source caption`.
- **`Shift` + click the copy button**: Copies the video title, publication date when available, canonical video URL, and timestamped source caption.
- **`Shift + Alt + S`**: Shows or hides the in-player settings panel. On macOS, use **`Shift + Option + S`**.

### Notes

- The extension runs only on YouTube `/watch` pages and requires a video with an available caption track.
- Standard translation may use a YouTube translated caption track or the Google Translate endpoint. When AI is enabled, caption text plus up to three nearby context captions is sent to the selected AI provider; the API key is sent only to that provider for authentication.
- The extension does not collect accounts, browsing history, or analytics. Settings, keys, and subtitle translation caches remain in browser storage; **Clear key** removes the selected provider's key.
- If captions do not appear after changing tracks or reloading the extension, refresh the video page and try again.
- YouTube can change its page structure and caption endpoints. When reporting an issue in [GitHub Issues](https://github.com/lasdocas/lasDoscas-youtube-dual-subtitles/issues), include the browser version, video URL, caption type, and reproduction steps.

---

## Español

lasDoscas es una extensión gratuita, de código abierto y ligera de subtítulos duales para YouTube. Muestra el subtítulo original y su traducción a la vez, sincronizados con el tiempo de reproducción en la vista predeterminada, el modo cine y la pantalla completa. La traducción estándar no requiere cuenta ni clave API; la mejora opcional con IA usa el modelo BYOK (Bring Your Own Key).

### Funciones principales

- **Subtítulos duales sincronizados**: Lee las pistas JSON3 de YouTube y renderiza ambas líneas según `video.currentTime`, incluso después de adelantar el video o cambiar de pista.
- **Subtítulos manuales y generados automáticamente**: Procesa los subtítulos ASR progresivos para reducir repeticiones y parpadeos, con un modo alternativo en tiempo real cuando el archivo de subtítulos no está disponible.
- **Mejora con IA BYOK opcional**: Compatible con Google Gemini, Groq y OpenRouter. La IA traduce el original con el contexto de subtítulos cercanos y solo sustituye la traducción estándar después de recibir una respuesta válida. La extensión no proporciona una clave compartida ni activa la IA automáticamente.
- **Procesamiento contextual por lotes**: Las pistas descargables se mejoran en lotes ajustados a la reproducción, con identificadores estables y reintentos limitados; el ASR en vivo sigue priorizando la latencia del subtítulo actual.
- **Respaldo y caché local**: De forma predeterminada se conserva la traducción estándar si la IA no está disponible. Las traducciones validadas se guardan localmente por video, pista, idioma y proveedor para evitar solicitudes repetidas.
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

### Opcional: Configurar la mejora con IA (BYOK)

1. Abre la configuración, despliega **Mejora con IA** y selecciona `Google Gemini`, `Groq` u `OpenRouter`.
2. Pega una clave API emitida por el proveedor y pulsa **Probar conexión**. lasDoscas no vende ni proporciona claves; las cuotas y los cargos dependen del proveedor.
3. De forma predeterminada, la clave permanece en el almacenamiento de sesión del navegador. Solo se guarda de forma persistente al activar **Recordar la clave en este dispositivo**. La clave nunca se envía a YouTube.
4. Pulsa **Aplicar clave** para activar la IA. Se recomienda mantener **Usar la traducción estándar si la IA no está disponible** para cubrir límites de uso, errores de red o cuotas agotadas.
5. El botón de IA a la izquierda del panel de subtítulos permite activar o desactivar la mejora y muestra los estados desactivado, en espera, procesando, caché o mejorado.

### Copia Y Atajo

- **Pulsa el botón de copia**: Copia `[minutos:segundos]  subtítulo original actual`.
- **`Shift` + botón de copia**: Copia el título, la fecha de publicación si está disponible, la URL del video y el subtítulo original con su marca de tiempo.
- **`Shift + Alt + S`**: Muestra u oculta el panel de configuración dentro del reproductor. En macOS, usa **`Shift + Option + S`**.

### Notas

- La extensión solo se ejecuta en las páginas `/watch` de YouTube y necesita una pista de subtítulos disponible.
- La traducción estándar puede usar una pista traducida de YouTube o el servicio de Google Translate. Al activar la IA, el texto del subtítulo y hasta tres subtítulos cercanos de contexto se envían al proveedor elegido; la clave API solo se envía a ese proveedor para autenticar la solicitud.
- La extensión no recopila cuentas, historial de navegación ni analíticas. La configuración, las claves y la caché de traducciones permanecen en el almacenamiento del navegador; **Borrar clave** elimina la clave del proveedor seleccionado.
- Si los subtítulos no aparecen después de cambiar de pista o recargar la extensión, actualiza la página del video.
- YouTube puede cambiar su estructura y sus servicios de subtítulos. Al informar de un problema en [GitHub Issues](https://github.com/lasdocas/lasDoscas-youtube-dual-subtitles/issues), incluye la versión del navegador, la URL del video, el tipo de subtítulo y los pasos para reproducirlo.

---


## License

[MIT License](LICENSE.txt) © 2026 [lasdocas](https://github.com/lasdocas)
