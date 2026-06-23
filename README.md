# 包材庫存管理 PWA

這是一個可安裝到 iPhone 主畫面的包材庫存管理 PWA。包材資料全部儲存在 Firebase Firestore，手機 PWA、電腦網頁與多人裝置會使用同一份雲端資料並即時同步。

GitHub Pages 網址：

```text
https://1030685-rgb.github.io/packaging-inventory-pwa/
```

## 功能

- 新增包材
- 修改包材名稱
- 修改現有庫存
- 修改最低庫存
- 刪除包材
- 輸入取用數量並扣庫存
- 自動累計取用量 `totalUsed`
- 自動計算建議叫貨數量：`Math.max(0, minStock - currentStock)`
- 自動判斷狀態：`currentStock <= minStock` 顯示「需補貨」
- 需補貨項目使用淡紅色標示
- Firestore `onSnapshot` 即時同步手機、電腦與多人裝置
- Firestore 離線快取，短暫離線後恢復網路會自動同步
- 使用 Notification API 發送本機通知
- 使用 localStorage 記錄通知去重，不再用 localStorage 儲存庫存主資料

## Firestore 資料格式

Collection 名稱：

```text
packagingItems
```

每筆 document：

```js
{
  name: "紙箱",
  currentStock: 100,
  minStock: 20,
  totalUsed: 0,
  updatedAt: serverTimestamp()
}
```

## Firebase Config 去哪裡找

1. 前往 Firebase Console。
2. 選擇你的 Firebase 專案。
3. 進入「專案設定」。
4. 在「你的應用程式」新增或選擇 Web App。
5. 找到 Firebase SDK 設定，複製 `firebaseConfig`。
6. 打開 `firebase.js`，把同一組設定貼到這裡：

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

手機和電腦必須使用同一個部署版本、同一個 `firebase.js`、同一組 Firebase Config，才會連到同一個 Firestore 資料庫。

## 建立 Firestore Database

1. 在 Firebase Console 進入 Firestore Database。
2. 點「建立資料庫」。
3. 測試階段可以先選測試模式。
4. 建立完成後不需要手動建立 collection，網站第一次新增包材時會自動建立 `packagingItems`。

## Firestore Rules 測試版

測試時可先使用：

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

注意：這組 rules 只適合測試。正式使用請加上 Firebase Authentication 與權限限制，避免任何人都能讀寫庫存資料。

## 部署到 Firebase Hosting

先安裝 Firebase CLI：

```bash
npm install -g firebase-tools
```

登入 Firebase：

```bash
firebase login
```

初始化 Hosting：

```bash
firebase init hosting
```

初始化時建議：

- Public directory 使用目前專案根目錄：`.`
- Single-page app rewrite 選 `Yes`
- 不要覆蓋既有 `index.html`

如果已經有 `firebase.json`，也可以直接部署：

```bash
firebase deploy
```

## 部署到 GitHub Pages

本專案也保留 GitHub Actions 部署：

```text
.github/workflows/deploy.yml
```

在 GitHub repo 的 `Settings` → `Pages` 中，Source 選 `GitHub Actions`。推送到 `main` 後會自動部署。

## 清除手機 PWA 舊快取

如果手機 PWA 還看到舊版畫面：

1. iPhone 開啟「設定」。
2. 進入 Safari。
3. 點「進階」。
4. 點「網站資料」。
5. 搜尋你的網站網域，例如 `github.io` 或 Firebase Hosting 網域。
6. 刪除該網站資料。
7. 回到主畫面，刪除舊的 PWA 圖示。
8. 用 Safari 重新打開網站，再加入主畫面。

本專案的 `service-worker.js` 已更新快取版本，部署後通常重新整理或重新開啟 PWA 就會取得新版。

## 測試手機和電腦同步

1. 確認 `firebase.js` 已填入同一組 Firebase Config。
2. 確認 Firestore rules 允許測試讀寫。
3. 用電腦打開網站。
4. 用手機 Safari 或主畫面 PWA 打開同一個網站。
5. 電腦新增一筆包材，手機應即時出現。
6. 手機修改現有庫存，電腦應即時更新。
7. 任一裝置刪除包材，其他裝置應同步刪除。

## 測試扣庫存

1. 建立一筆包材，例如現有庫存 `100`、最低庫存 `20`。
2. 在「取用數量」輸入 `5`。
3. 按「扣庫存」。
4. 現有庫存應變成 `95`。
5. 累計取用量 `totalUsed` 應增加 `5`。
6. 另一台手機或電腦應即時看到相同結果。
7. 如果取用數量大於現有庫存，畫面會跳出「取用數量不可大於現有庫存」。

## 測試庫存不足通知

1. 在手機 PWA 點「開啟庫存通知」。
2. 允許通知權限。
3. 把現有庫存改成小於或等於最低庫存。
4. 狀態應顯示「需補貨」並使用淡紅底。
5. 通知標題為「哪項包材庫存不足需要」。
6. 通知內容會包含包材名稱、目前庫存、最低庫存、建議叫貨數量。

通知去重規則：

- localStorage 只記錄 `notified_${documentId}_${currentStock}`。
- 同一包材同一庫存數字不會重複通知。
- 庫存恢復正常後會清除該包材通知紀錄。
- 庫存再次低於最低庫存，或庫存數字變動後，會再次通知。

## 常見同步問題

- 手機和電腦沒有填同一組 Firebase Config。
- Firestore rules 沒有開放測試讀寫。
- 手機 PWA 還快取舊版 `script.js` 或 `firebase.js`。
- Service worker 尚未更新，請重新整理、關閉重開 PWA，或清除網站資料。
- 瀏覽器離線時會先使用 Firestore 離線快取，恢復網路後才同步雲端。

## 後端依賴

此版本不需要 Node.js 後端、Express、Render 或 LINE 通知 API。資料同步由 Firebase Firestore 負責，靜態檔案可部署到 GitHub Pages 或 Firebase Hosting。
