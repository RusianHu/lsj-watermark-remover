# LSJ Watermark Remover

AI 图像去水印工具 - 基于反向 Alpha 混合算法，纯浏览器本地处理

## 简介

LSJ Watermark Remover 是一个免费的 AI 图像去水印工具，专门用于去除 Gemini、豆包、通义千问等 AI 生成图像的水印。该工具完全在浏览器端运行，无需上传图片到服务器，保障用户隐私安全。

## 功能特点

- **极速处理** - 基于现代浏览器技术加速处理，毫秒级响应，无需等待排队
- **隐私安全** - 纯前端运行，图片数据不离机，绝不上传服务器
- **完全免费** - 无次数限制，无隐藏付费，即开即用
- **批量处理** - 支持同时处理多张图片
- **多语言支持** - 支持简体中文和英文界面

## 支持的图片格式

- JPG / JPEG
- PNG
- WebP

## 技术原理

该工具使用反向 Alpha 混合 (Reverse Alpha Blending) 算法来去除水印。通过分析水印的 Alpha 通道信息，还原被水印覆盖的原始像素值。

### 核心算法

1. **水印检测** - 根据图片尺寸自动检测水印配置（48×48 或 96×96）
2. **Alpha 图计算** - 从预设的背景捕获图像计算水印的透明度映射
3. **水印去除** - 使用反向混合公式还原原始像素

## 使用方法

### 在线使用

直接在浏览器中打开 `index.html` 文件即可使用。

### 本地部署

1. 下载或克隆本项目
2. 使用任意 HTTP 服务器托管项目文件，例如：
   ```bash
   # 使用 Python
   python -m http.server 8080

   # 或使用 PHP
   php -S localhost:8080

   # 或使用 Node.js (npx serve)
   npx serve .
   ```
3. 在浏览器中访问 `http://localhost:8080`

### 操作步骤

1. **选择图片** - 点击上传区域或拖拽图片到页面
2. **自动处理** - 算法自动检测并去除水印
3. **下载结果** - 点击下载按钮保存处理后的图片

## 技术栈

- **前端框架**: 原生 JavaScript (ES Modules)
- **样式**: Tailwind CSS
- **图片处理**: Canvas API
- **第三方库**:
  - JSZip - 批量下载打包
  - Exifr - EXIF 信息读取
  - Medium Zoom - 图片预览缩放

## 浏览器兼容性

支持所有现代浏览器：
- Chrome 80+
- Firefox 75+
- Safari 14+
- Edge 80+

## 注意事项

- 本工具仅供学习交流使用
- 请勿用于非法用途
- 处理过程完全在本地进行，不会上传任何数据

## 相关链接

- [去水印原理详解](https://allenkuo.medium.com/removing-gemini-ai-watermarks-a-deep-dive-into-reverse-alpha-blending-bbbd83af2a3f)

## 许可证

MIT License

---

© 2025 LSJ Watermark Remover. All rights reserved.
