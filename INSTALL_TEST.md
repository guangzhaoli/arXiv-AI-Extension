# 扩展安装测试指南

## 安装步骤

### Chrome/Edge 安装
1. 打开浏览器，进入 `chrome://extensions/`
2. 开启右上角的"开发者模式"开关
3. 点击"加载已解压的扩展程序"
4. 选择 `arxiv-ai-extension` 文件夹
5. 确认扩展出现在列表中，状态为"已启用"

### Firefox 安装
1. 打开 Firefox，进入 `about:debugging`
2. 点击"This Firefox"
3. 点击"Load Temporary Add-on"
4. 选择 `arxiv-ai-extension/manifest_v2.json` 文件
5. 确认扩展安装成功

## 功能测试

### 1. 基本功能测试
1. 打开 [ChatGPT](https://chat.openai.com/)
2. 在聊天框中输入 `/arxiv`
3. 应该弹出导入对话框
4. 输入测试论文ID：`2301.07041`
5. 点击"Import Paper"
6. 观察进度条和最终上传结果

### 2. 扩展状态测试
1. 点击浏览器工具栏中的扩展图标
2. 查看弹出窗口显示的状态信息
3. 确认当前网站识别正确
4. 测试"Clear Cache"和"Test Import"按钮

### 3. 支持网站测试
测试以下网站的兼容性：
- ✅ ChatGPT: https://chat.openai.com/
- ✅ Gemini: https://gemini.google.com/
- ✅ AI Studio: https://aistudio.google.com/

## 常见问题排除

### 扩展无法加载
- 检查manifest.json语法是否正确
- 确保所有文件路径存在
- 查看扩展管理页面的错误信息

### /arxiv命令无响应  
- 确认在支持的网站上
- 刷新页面重试
- 查看浏览器控制台错误信息
- 确认扩展已启用

### PDF上传失败
- 检查网络连接
- 尝试其他arXiv论文ID
- 查看控制台网络请求状态

### 权限问题
如果遇到权限相关错误，确认manifest文件包含以下权限：
```json
"permissions": [
  "storage",
  "activeTab", 
  "contextMenus",
  "notifications",
  "scripting"
],
"host_permissions": [
  "https://chat.openai.com/*",
  "https://gemini.google.com/*", 
  "https://aistudio.google.com/*",
  "https://arxiv.org/*"
]
```

## 调试信息

### 查看控制台日志
1. 按F12打开开发者工具
2. 切换到Console标签
3. 查看arXiv Extension相关日志

### 查看后台脚本错误
1. 进入 `chrome://extensions/`
2. 找到arXiv AI Extension
3. 点击"检查视图"中的"service worker"
4. 查看后台脚本日志

如果遇到问题，请将控制台错误信息反馈给开发者。
