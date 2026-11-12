# PBNINJA

NinjaPB 匹克球前五拍黃金決策的互動教學網站，Coach Ninja (@ninjapbtw) 監製。正式網址：https://pbninja.vercel.app

| 路徑 | 內容 |
| --- | --- |
| `/` | 3D 第一人稱戰術場：決策紅綠燈、四種視角、逐格時間軸、決策挑戰、錄製短片 |
| `/2d/` | 2D 戰術互動指南：每一拍一塊可操作的戰術板，加六題決策測驗 |

每一個球路都有自己的網址，例如 `/#s04-drop`（第 3 拍改吊球）。頁面上的「複製這一球的連結」會複製目前這一球的網址。

## 檔案

- `scenes.js`：**簡報內容的唯一來源**。章節、球路、站位、技術說明、決策紅綠燈、影片連結、課程與裝備都在這裡，3D 與 2D 兩頁都讀它。改文字只改這裡。
- `core.js`：兩頁與檢查腳本共用的規則：含空氣阻力與旋轉的球路求解、正反手選邊。
- `app.js`：3D 場地、鏡頭、介面、後製特效、挑戰模式、錄影。
- `rig.js`：多關節小忍者的骨架、全身動作與步法。
- `2d/index.html`：2D 指南；戰術板圖形寫在頁內，簡報文字從 `scenes.js` 產生。
- `vendor/`：自架的 three.js r128 與後製外掛（MIT 授權，見 `vendor/THREE-LICENSE.txt`）。
- `tools/validate.js`：球路規則檢查。

## 部署與檢查

推到 `main` 會自動部署。Vercel 建置時會先跑 `node tools/validate.js`（見 `vercel.json`），檢查每一段球路：過網高度、界內、發球進對角發球區、截擊時腳不在廚房內、球速與弧度合理。任何一條不過，這次部署就會失敗，網站維持上一版。

本機檢查：`node tools/validate.js -v`
本機預覽：在這個資料夾執行 `npx serve .` 後開啟 http://localhost:3000

## 流量統計

頁面已載入 Vercel Web Analytics 的程式。要開始統計，請到 Vercel 專案 `pbninja` 的 Analytics 分頁按一次 Enable。
