# PBNINJA

NinjaPB 匹克球前五拍黃金決策的互動教學網站，Coach Ninja (@ninjapbtw) 監製。

| 路徑 | 內容 |
| --- | --- |
| `/` | 3D 第一人稱戰術場：六個章節、決策紅綠燈、四種視角、逐格時間軸 |
| `/2d/` | 2D 戰術互動指南：每一拍一塊可操作的戰術板，加六題決策測驗 |

純靜態網站，沒有建置步驟。3D 版從 cdnjs 載入 three.js r128。

- `index.html`：3D 版的頁面與介面
- `app.js`：場地、球路物理、揮拍、鏡頭與介面邏輯
- `scenes.js`：五拍的球路、站位與技術說明資料
- `rig.js`：多關節小忍者的骨架與全身動作解算
- `2d/index.html`：2D 指南（單一檔案）

本機預覽：`npx serve .` 後開啟 http://localhost:3000
