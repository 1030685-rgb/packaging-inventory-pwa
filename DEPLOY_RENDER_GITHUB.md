# GitHub 上傳與 Render 部署教學

本專案是 Node.js + Express 提供靜態 PWA 檔案，Render 請使用 Web Service 部署。

官方參考：

- Render Node/Express 部署文件：https://render.com/docs/deploy-node-express-app
- Render Blueprint `render.yaml` 文件：https://render.com/docs/blueprint-spec

## 目前專案檔案

請以上傳 `outputs` 資料夾內的內容為主，重要檔案包含：

- `index.html`
- `style.css`
- `script.js`
- `server.js`
- `package.json`
- `manifest.json`
- `service-worker.js`
- `render.yaml`
- `icons/icon-192.png`
- `icons/icon-512.png`

## 本機測試

在 `outputs` 資料夾執行：

```bash
npm install
npm start
```

開啟：

```text
http://localhost:3000
```

## 方法一：用 GitHub 網頁上傳

1. 登入 GitHub。
2. 點右上角 `+`，選擇 `New repository`。
3. Repository name 可填：

```text
packaging-inventory-pwa
```

4. 建立空白 repo，不要勾選自動建立 README。
5. 進入新 repo，點 `uploading an existing file`。
6. 將 `outputs` 資料夾內的檔案拖進 GitHub。
7. 注意：請不要上傳 `node_modules`。
8. Commit message 可填：

```text
Initial packaging inventory PWA
```

9. 點 `Commit changes`。

## 方法二：用 Git 指令上傳

在 `outputs` 資料夾執行：

```bash
git init
git add .
git commit -m "Initial packaging inventory PWA"
git branch -M main
git remote add origin https://github.com/你的帳號/packaging-inventory-pwa.git
git push -u origin main
```

如果你已經有 GitHub repo，請把上面的 `你的帳號` 和 repo 名稱換成你的實際網址。

## Render 部署方式

1. 登入 Render：https://dashboard.render.com
2. 點 `New`。
3. 選擇 `Web Service`。
4. 連接 GitHub，選擇剛剛上傳的 repo。
5. Render 若偵測到 `render.yaml`，可依 Blueprint 建立服務。
6. 若手動設定，請填：

```text
Language: Node
Build Command: npm install
Start Command: npm start
```

7. Instance Type 可先選 Free。
8. 點 `Create Web Service`。
9. 部署完成後，Render 會產生網址，格式通常像：

```text
https://packaging-inventory-pwa.onrender.com
```

## 如果 repo 根目錄不是 outputs

如果你把整個 `new-chat-2` 上傳到 GitHub，而不是只上傳 `outputs` 裡面的檔案，Render 建立 Web Service 時請設定：

```text
Root Directory: outputs
Build Command: npm install
Start Command: npm start
```

## iPhone 安裝 PWA

1. 用 iPhone Safari 打開 Render 產生的 `https://...onrender.com` 網址。
2. 點 Safari 分享按鈕。
3. 選擇「加入主畫面」。
4. 從主畫面打開「包材庫存」。
5. 點「開啟庫存通知」並允許通知。

## 注意事項

- 庫存資料儲存在每台裝置自己的瀏覽器 `localStorage`，不同手機之間不會同步。
- iOS PWA 通知必須使用 HTTPS，Render 產生的 `onrender.com` 網址符合此條件。
- iPhone 必須先用 Safari 加入主畫面，再從主畫面打開 App，才比較完整支援 PWA 通知。
- Render Free 服務可能會休眠，第一次開啟可能需要等待一段時間。
