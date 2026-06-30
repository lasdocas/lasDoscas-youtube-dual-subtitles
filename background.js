chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // 1. 接收来自 popup.js 的关闭 iframe 指令 (需放在最上方)
  if (request.action === "close_popup_iframe") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].id) {
        chrome.tabs.sendMessage(tabs[0].id, { action: "close_settings_panel" });
      }
    });
    return false; // 不需要异步响应
  }

  // 2. 翻译请求逻辑
  if (request.action === "translate") {
    const targetLang = request.lang || "zh-CN"; 
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(request.text)}`;

    // 封装一个带重试机制的异步请求函数
    const fetchWithRetry = async (targetUrl, retries = 2) => {
      for (let i = 0; i <= retries; i++) {
        try {
          const response = await fetch(targetUrl);
          
          // 如果是 50x 服务器错误，且还有重试次数，就稍微等一下再试
          if (response.status >= 500 && i < retries) {
            console.warn(`[谷歌翻译 API 波动] 状态码 ${response.status}，准备进行第 ${i + 1} 次重试...`);
            await new Promise(resolve => setTimeout(resolve, 800)); // 暂停 800 毫秒
            continue;
          }
          return response; // 成功（或遇到 403/429 等非服务器错误），直接返回
        } catch (err) {
          // 捕获纯网络断开的情况
          if (i === retries) throw err;
          await new Promise(resolve => setTimeout(resolve, 800));
        }
      }
    };

    // 使用封装好的函数发起请求
    fetchWithRetry(url)
      .then(async response => {
        if (!response.ok) {
          const errorHtml = await response.text();
          console.error(`HTTP 错误 [${response.status}]:`, errorHtml.substring(0, 200) + "...");
          if (response.status === 429 || response.status === 403) {
            throw new Error("请求太频繁，被 Google 暂时封禁 IP 了");
          }
          throw new Error(`网络请求失败 (状态码: ${response.status})`);
        }

        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          const wrongText = await response.text();
          console.error("服务器返回了非 JSON 格式:", wrongText.substring(0, 200) + "...");
          throw new Error("接口返回了网页而不是数据，可能是网络被劫持或需人机验证");
        }

        return response.json();
      })
      .then(data => {
        if (data && data[0]) {
          const translatedText = data[0].map(item => item[0]).join('');
          sendResponse({ translation: translatedText });
        } else {
          sendResponse({ error: "解析翻译数据失败: 格式异常" });
        }
      })
      .catch(error => {
        console.error("翻译插件内部错误:", error);
        // 静默处理，不让前端字幕框报错崩溃，直接返回空字符串
        sendResponse({ error: error.message, translation: "" }); 
      });

    return true; // 保持消息通道开启
  }
});

// 3. 监听浏览器快捷键
chrome.commands.onCommand.addListener((command) => {
  if (command === "toggle_fullscreen_settings") {
    // 获取当前活跃的 YouTube 标签页并发送切换面板的消息
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].id) {
        chrome.tabs.sendMessage(tabs[0].id, { action: "toggle_settings_panel" });
      }
    });
  }
});