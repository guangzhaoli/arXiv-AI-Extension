# arXiv AI 扩展&nbsp;🚀  

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)  
*一款浏览器扩展，让你只需一次点击即可将 arXiv 论文导入常用 AI 聊天平台。*

---

## ✨ 主要特性
- **斜杠命令触发** – 在聊天输入框输入 `/arxiv` 即可呼出导入对话框  
- **自动处理 PDF** – 粘贴 arXiv ID 或链接，扩展自动下载 PDF 并上传  
- **智能缓存** – 下载的论文缓存 **7 天**，避免重复流量  
- **实时进度条** – 下载 / 上传过程一目了然  
- **多平台支持** –  
  • **Chromium 系浏览器**：ChatGPT、Google Gemini、AI Studio  
  • **Firefox**：目前仅支持 ChatGPT（原因见下文）

---

## 🌍 支持站点
| 平台 | 域名 |
|------|------|
| ChatGPT | `chat.openai.com`, `chatgpt.com` |
| Gemini | `gemini.google.com` |
| AI Studio | `aistudio.google.com` |

> ⚠️ **Firefox 限制说明**：Gemini 与 AI Studio 的上传控件被封装在 *closed Shadow DOM* 内，且 Firefox 的安全策略禁止内容脚本构造携带文件的 `DataTransfer`。因此自动上传仅在 Chromium 浏览器可行，Firefox 目前只能自动上传到 ChatGPT。

---

## 🔧 安装

### Chrome / Edge
1. 克隆或下载本仓库  
2. 访问 `chrome://extensions/`（Chrome）或 `edge://extensions/`（Edge）  
3. 打开 **开发者模式**  
4. 点击 **加载已解压的扩展**，选择 **`arxiv-ai-extension`** 文件夹  

### Firefox
1. 打开 `about:debugging#/runtime/this-firefox`  
2. 点击 **加载临时附加组件…**  
3. 选择 `arxiv-ai-extension/manifest_firefox.json`  

> 未来将上线 AMO / Chrome Web Store 正式版本

---

## ⚡ 快速开始
1. 打开 ChatGPT、Gemini 或 AI Studio  
2. 在输入框输入 `/arxiv` 并回车  
3. 输入 arXiv ID 或链接，如 `2506.05046` 或 `https://arxiv.org/abs/2506.05046`  
4. 观察底部进度条，PDF 会像手动上传一样出现在聊天中  

---

## 🎯 高级技巧
- **右键导入** – 选中文本中的 arXiv 链接，右键 → **Import as arXiv paper**  
- **缓存管理** – 点击扩展图标查看缓存统计或手动清理  
- **自检功能** – Popup 内含 **Test Import** 按钮，快速诊断环境  

---

## 📁 项目结构
```text
arxiv-ai-extension/
├─ manifest.json            # Chrome/Edge (MV3)
├─ manifest_firefox.json    # Firefox (MV3) 临时加载
├─ background/
│  └─ service-worker.js
├─ content-scripts/
│  ├─ main.js
│  ├─ chat-detector.js
│  ├─ file-injector.js
│  └─ site-configs.js
├─ utils/
│  ├─ arxiv-parser.js
│  ├─ cache-manager.js
│  └─ progress-tracker.js
├─ components/
└─ assets/icons/
```

---

## 🛠️ 本地开发
1. `git clone https://github.com/your-username/arxiv-ai-extension.git`  
2. 按上文 *安装* 指南加载解压扩展  
3. 修改代码后刷新扩展页面或在 DevTools 中按 **Ctrl/Cmd + R** 即可生效  

### 新增聊天平台
1. 在 `content-scripts/site-configs.js` 中添加配置  
2. 在 `manifest.json` 的 `host_permissions` 中加入域名  
3. 调整选择器及上传方式并验证

---

## 🤝 贡献
欢迎 PR / Issue！  
- Fork → 新建分支 → 实现功能 → 提 PR  
- UI 变更请附截图或 GIF

---

## 📜 许可证
本项目基于 MIT 协议发布，详见 [`LICENSE`](LICENSE)。

---

祝你科研更高效，🤖 与 📄 的交流更顺畅！
