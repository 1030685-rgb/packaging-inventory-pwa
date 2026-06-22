# 包材庫存管理 PWA

這是一個可部署到 GitHub Pages 的純前端 PWA App，用來管理包材庫存。資料儲存在使用者瀏覽器的 `localStorage`，不需要 Node.js、Express 或後端資料庫。

正式網址：

```text
https://1030685-rgb.github.io/packaging-inventory-pwa/
```

## 功能

- 新增包材
- 修改包材名稱
- 修改現有庫存
- 修改最低庫存
- 刪除包材
- 自動判斷「正常 / 需補貨」
- 庫存不足時以淡紅色標示
- 使用 `localStorage` 保留資料
- 使用 Notification API 發送本機通知
- 支援 iPhone Safari 加入主畫面
- 使用 service worker 快取主要檔案，離線時仍可開啟

## GitHub Pages 部署方式

本專案已包含 GitHub Actions 部署檔案：

```text
.github/workflows/deploy.yml
```

部署流程：

1. 將專案推送到 GitHub repository：

```text
1030685-rgb/packaging-inventory-pwa
```

2. 到 GitHub repo 頁面。
3. 點 `Settings`。
4. 點左側 `Pages`。
5. 在 `Build and deployment` 區塊中，將 `Source` 改成：

```text
GitHub Actions
```

6. 推送到 `main` 分支後，GitHub Actions 會自動部署。
7. 部署完成後可開啟：

```text
https://1030685-rgb.github.io/packaging-inventory-pwa/
```

## iPhone 加入主畫面

1. 用 iPhone Safari 開啟：

```text
https://1030685-rgb.github.io/packaging-inventory-pwa/
```

2. 點 Safari 下方的分享按鈕。
3. 選擇「加入主畫面」。
4. 從主畫面打開「包材庫存」App。

## 開啟庫存通知

1. 從主畫面打開 App。
2. 點「開啟庫存通知」。
3. 如果允許通知，畫面會顯示「已開啟庫存通知」。
4. 新增或儲存包材時，若現有庫存小於或等於最低庫存，會發送本機通知。

通知內容格式：

```text
包材庫存不足
XXX 庫存不足，目前庫存 XX，最低庫存 XX，請安排補貨。
```

## iOS PWA 通知限制

- iPhone 必須使用 Safari 開啟網站。
- 必須先「加入主畫面」。
- 必須從主畫面打開 App。
- 必須點「開啟庫存通知」並允許通知。
- 如果裝置或瀏覽器不支援 Notification API，畫面會顯示「此裝置不支援本機通知，請改用畫面內提醒。」

## GitHub Pages 路徑設定

此 repo 會部署在子路徑：

```text
/packaging-inventory-pwa/
```

因此 PWA 設定已調整為：

```json
{
  "start_url": "/packaging-inventory-pwa/",
  "scope": "/packaging-inventory-pwa/"
}
```

service worker 也會以目前 scope 快取以下檔案：

- `index.html`
- `style.css`
- `script.js`
- `manifest.json`
- `icons/icon-192.png`
- `icons/icon-512.png`
