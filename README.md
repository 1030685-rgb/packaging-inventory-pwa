# 包材庫存管理 PWA

這是一個可安裝到 iPhone 主畫面的包材庫存管理 PWA。資料改用 Firebase Firestore 儲存，手機 PWA 和電腦網頁會共用同一份庫存資料並即時同步。

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
- Firestore 即時同步手機與電腦資料
- Firestore 離線快取，短暫離線後可在恢復網路時同步
- 自動判斷狀態：現有庫存小於或等於最低庫存時顯示「需補貨」
- 需補貨項目使用淡紅色標示
- 使用 Notification API 發送手機本機通知
- 使用 localStorage 記錄通知是否已發送，避免同一包材同一庫存數字重複通知
- 可透過 Safari 加入 iPhone 主畫面

## Firebase 設定

### 1. 建立 Firebase 專案

1. 前往 Firebase Console。
2. 建立新專案。
3. 專案建立後，進入「專案設定」。
4. 在「你的應用程式」新增 Web App。
5. 複製 Firebase SDK 設定物件。

### 2. 建立 Firestore Database

1. 在 Firebase Console 左側選單進入 Firestore Database。
2. 點選「建立資料庫」。
3. 測試階段可先選擇測試模式。
4. 建立完成後，本網站會使用 collection：

```text
packagingItems
```

每筆 document 格式：

```js
{
  name: "紙箱",
  currentStock: 10,
  minStock: 5,
  updatedAt: serverTimestamp()
}
```

### 3. 填入 firebase.js

打開 `firebase.js`，把 Firebase Console 提供的設定貼到 `firebaseConfig`：

```js
const firebaseConfig = {
  apiKey: "請填入",
  authDomain: "請填入",
  projectId: "請填入",
  storageBucket: "請填入",
  messagingSenderId: "請填入",
  appId: "請填入"
};
```

未填入前，網站會顯示「尚未設定 Firebase」，不會寫入資料。

### 4. Firestore Rules

測試用 rules：

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /packagingItems/{itemId} {
      allow read, write: if true;
    }
  }
}
```

注意：以上 rules 僅適合測試。正式使用時應加入登入權限與更嚴格的讀寫規則，避免任何人都能修改庫存資料。

## GitHub Pages 部署

本專案已包含 GitHub Actions 部署檔案：

```text
.github/workflows/deploy.yml
```

GitHub Pages 設定方式：

1. 進入 repository：`1030685-rgb/packaging-inventory-pwa`
2. 開啟 `Settings`
3. 進入 `Pages`
4. `Source` 選擇 `GitHub Actions`
5. 推送到 `main` 分支後，GitHub Actions 會自動部署
6. 部署完成後打開：

```text
https://1030685-rgb.github.io/packaging-inventory-pwa/
```

## iPhone 加入主畫面

1. 用 iPhone Safari 打開正式網址。
2. 點 Safari 下方分享按鈕。
3. 選擇「加入主畫面」。
4. 從主畫面打開「包材庫存」App。

## 開啟本機通知

1. 從 iPhone 主畫面打開 App。
2. 點「開啟庫存通知」。
3. 允許通知權限。
4. 當 Firestore 同步到需補貨項目時，會發送本機通知。

iOS PWA 通知限制：

- iPhone 必須使用支援 PWA 通知的 iOS 版本。
- 通常需要先加入主畫面，再從主畫面 App 開啟。
- 使用者必須允許通知。
- 如果瀏覽器或系統不支援 Notification API，畫面會提示「此裝置不支援本機通知，請改用畫面內提醒」。

## 測試手機與電腦同步

1. 確認 `firebase.js` 已填入正確 Firebase 設定。
2. 確認 Firestore rules 已允許測試讀寫。
3. 用電腦打開正式網址。
4. 用 iPhone Safari 或主畫面 PWA 打開同一網址。
5. 在電腦新增一筆包材，手機應即時出現。
6. 在手機修改現有庫存，電腦應即時更新。
7. 在任一裝置刪除包材，另一台裝置應同步刪除。
8. 將現有庫存改成小於或等於最低庫存，應顯示「需補貨」並在允許通知後發送本機通知。

## 後端依賴

此版本不需要 Node.js 後端、Express、Render 或 LINE 通知 API。GitHub Pages 會直接提供靜態檔案，資料同步由 Firebase Firestore 負責。
