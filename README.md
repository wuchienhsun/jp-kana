# 日文漢字自動標註平假名

這是一個簡單的網頁工具，可以將日文文章中的漢字自動標註平假名，並生成帶有 `<ruby>` 標籤的 HTML 代碼。

## 功能

- 輸入日文文章，自動識別漢字
- 自動為漢字標註平假名（ふりがな）
- 智能處理混合漢字和平假名的詞彙，只為漢字部分添加注音
- 特殊處理「ヶ月」「ヶ所」「ヶ国」等詞彙
- 處理數字+計數詞組合（如「一人」「二冊」等）
- 保留原始段落和換行格式
- 生成帶有 `<ruby>` 標籤的 HTML 代碼
- 一鍵複製 HTML 代碼
- 提供多種測試範例

## 使用技術

- 純前端 JavaScript
- [kuromoji.js](https://github.com/takuyaa/kuromoji.js/) - 日文形態素解析器
- 本地字典檔案 - 避免跨域問題和 CDN 依賴
- GitHub Pages 部署

## 本地運行

1. 克隆此倉庫
2. 使用任何靜態文件服務器運行，例如：
   ```bash
   python -m http.server
   ```
3. 在瀏覽器中訪問 `http://localhost:8000`

## 關於字典檔案

本項目使用 kuromoji.js 的字典檔案，這些檔案已經下載到 `dict/` 目錄中：

- base.dat.gz
- cc.dat.gz
- check.dat.gz
- tid.dat.gz
- tid_map.dat.gz
- tid_pos.dat.gz
- unk.dat.gz
- unk_char.dat.gz
- unk_compat.dat.gz
- unk_invoke.dat.gz
- unk_map.dat.gz
- unk_pos.dat.gz

使用本地字典檔案可以避免跨域問題和 CDN 依賴，確保應用在 GitHub Pages 等環境中正常運行。

## 部署到 GitHub Pages

本專案已配置 GitHub Actions 自動部署到 GitHub Pages。只需將代碼推送到 `main` 分支，就會自動部署。

### 手動部署步驟

1. 在 GitHub 倉庫設置中啟用 GitHub Pages
2. 選擇 `main` 分支作為源
3. 推送代碼到 `main` 分支

## 使用方法

1. 在文本框中輸入或粘貼日文文章
2. 點擊「產生帶假名的 HTML」按鈕
3. 查看帶有平假名標註的結果
4. 點擊「複製 HTML」按鈕複製 HTML 代碼

## 特殊處理邏輯

- 只對漢字添加 ruby 標籤，避免平假名重複
- 智能處理動詞和形容詞（通常漢字在前，平假名在後）
- 特殊處理「ヶ月」「ヶ所」「ヶ国」等詞彙
- 處理數字+計數詞組合（如「一人」「二冊」等）
- 保留原始段落和換行格式
- 生成的 HTML 被包裹在 `div.js-article-body` 中，方便與 Ghost 部落格兼容

## 授權

MIT 