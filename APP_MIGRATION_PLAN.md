# iOS / macOS App 遷移盤點

日期：2026-05-26

本文件執行前期規劃的第 1、2 步：

1. 盤點目前網站功能、資料流與限制。
2. 整理 Firebase Auth / Firestore 在 iOS 與 macOS App 化前需要確認的設定。

## Step 1：目前網站功能盤點

### 產品範圍

目前網站是空間借用管理系統，用來管理不同日期、時間、場地、主辦單位與負責人的借用活動。

目前主要流程：

- 使用 Google 登入。
- 查看月曆借用狀態。
- 查看今日借用摘要。
- 新增借用活動。
- 編輯既有活動。
- 刪除既有活動。
- 儲存前檢查場地與時間是否衝突。
- 用顏色區分主辦單位：
  - `學界`：藍色。
  - `社會界`：橘色。
- 姓名欄位會出現曾經填入過的負責人選項。

### 目前檔案結構

- `index.html`
  - 頁面骨架。
  - Firebase SDK 載入。
  - Firebase config。
  - Google 登入按鈕與登入狀態顯示。
  - 新增/編輯活動 sheet。
  - 活動詳情 sheet。
  - 匯入資料 dialog，但目前尚未實作。

- `main.js`
  - 月曆渲染。
  - 表單狀態。
  - 場地選擇。
  - 時段衝突檢查。
  - Firestore 新增、讀取、更新、刪除。
  - Toast 提示。
  - 新增、編輯、刪除流程。
  - 負責人姓名建議清單。

- `style.css`
  - 桌面月曆格。
  - 手機版單欄日曆。
  - 新增/編輯 sheet。
  - 活動詳情 sheet。
  - 學界/社會界顏色樣式。

- `DESIGN.md`
  - 目前 UI 方向。
  - Apple / Notion / Linear 極簡工具型介面規範。

### 目前資料模型

Firestore collection：

- `events`

目前活動文件欄位：

```js
{
  date: "YYYY-MM-DD",
  title: string,
  startTime: "HH:mm",
  endTime: "HH:mm",
  venues: string[],
  hostType: "學界" | "社會界",
  organizer: string,
  organizerPhone: string
}
```

目前 Firestore 寫入方式：

- 新增：`addDoc(collection(db, 'events'), data)`
- 編輯：`setDoc(doc(db, 'events', eventObj.id), data)`
- 刪除：`deleteDoc(doc(db, 'events', eventId))`

目前讀取方式：

- 讀取整個 `events` collection。
- 前端依照 `date` 分組後渲染月曆。

風險：

- 如果資料量變大，讀取整個 collection 會增加 Firestore 讀取成本，也會影響 App 啟動速度。

建議：

- App 版改成只查詢目前月份或指定日期範圍。

### 目前固定場地

場地清單目前寫死在 `main.js`：

```js
[
  "晑德-佛堂",
  "晑德-廚房",
  "晑德-多功能教室",
  "晑德-會談室",
  "杏德-佛堂",
  "杏德-坤伙"
]
```

App v1 建議：

- 先維持靜態清單，轉成 Swift 常數。

未來需要非工程人員管理場地時：

- 再改成 Firestore `venues` collection。

### 目前驗證規則

必填：

- 日期。
- 活動名稱。
- 主辦單位。
- 開始時間。
- 結束時間。
- 至少一個場地。
- 負責人姓名。

選填：

- 電話。

時間規則：

- 結束時間必須晚於開始時間。
- 選擇開始時間後，系統會自動帶入一小時後作為結束時間。

衝突規則：

- 同一天、同一場地、時間重疊時不可儲存。
- 編輯活動時，會排除目前正在編輯的活動本身。

重要風險：

- 目前衝突檢查只在前端執行。
- 如果兩個使用者同時送出重疊借用，仍可能寫入衝突資料。

解法：

- App 化時應把「建立/更新活動」移到 Firestore transaction 或 Cloud Function。
- Firestore rules 負責權限與欄位基本驗證。
- Cloud Function 或 transaction 負責最終衝突檢查。

### 目前登入流程

目前使用：

- Firebase Auth。
- GoogleAuthProvider。
- Web `signInWithPopup(auth, provider)`。
- `onAuthStateChanged` 同步登入狀態。

App 化風險：

- Web popup 登入不適合直接放進 iOS/macOS WebView。
- iOS/macOS App 應該改用 Firebase Auth + Google Sign-In 原生 SDK。

### 目前 UI 對應到 App 的方式

目前網站畫面：

- Header：標題與帳號狀態。
- 使用需知：登入後折疊。
- 月份切換 toolbar。
- 今日摘要。
- 學界/社會界圖例。
- 月曆。
- 新增/編輯活動 sheet。
- 活動詳情 sheet。
- Toast。

SwiftUI 對應建議：

- Header：`NavigationStack` + toolbar。
- 月曆：自訂 SwiftUI month grid。
- 手機新增/編輯：`.sheet`。
- macOS 新增/編輯：sheet 或獨立 inspector panel。
- 活動詳情：iOS 用 sheet，macOS 可用右側 inspector 或 popover。
- Toast：改成 native alert/banner pattern。

### 目前尚未 App-ready 的部分

- `importData()` 目前只是 placeholder。
- 沒有離線模式。
- 沒有推播或提醒。
- 沒有使用者角色權限 UI。
- 沒有審計紀錄。
- 沒有伺服器端衝突保護。
- 沒有自動化測試。

## Step 2：Firebase / Auth / Firestore 準備事項

### 目前 Firebase 專案

從 `index.html` 觀察到：

- Firebase projectId：`xingdexangdeclassroom`
- Auth domain：`xingdexangdeclassroom.firebaseapp.com`
- Firestore collection：`events`
- Auth provider：Google
- Firebase Web SDK：`11.9.1`

說明：

- Firebase Web API key 不是伺服器密鑰。
- 真正的安全性必須靠 Firebase Auth 與 Firestore security rules。

### Firebase Console 需要確認

1. Authentication
   - Google sign-in provider 是否已啟用。
   - Support email 是否已設定。
   - Authorized domains 是否包含正式網站網域。

2. Firestore
   - `events` collection 是否存在。
   - 現有文件是否符合目前資料模型。
   - 若未來改成日期範圍查詢，是否需要建立 index。

3. Security Rules
   - 未登入使用者是否被禁止讀寫。
   - 登入後是否所有人都能新增、編輯、刪除。
   - 是否需要限制只有核准帳號可操作。

4. Native App 設定
   - 在 Firebase 專案加入 iOS app。
   - 若 macOS 獨立 target，也加入 macOS app。
   - 下載每個 target 對應的 `GoogleService-Info.plist`。
   - 確認 Bundle ID 與 Xcode 專案一致。

### 建議 Bundle ID

如果 iOS 與 macOS 分開：

- iOS：`org.xingde.spacebooking.ios`
- macOS：`org.xingde.spacebooking.macos`

如果使用單一 multiplatform app：

- `org.xingde.spacebooking`

建議：

- 第一版若用 SwiftUI Multiplatform，可先用單一 base ID。
- 如果 iOS/macOS 之後會有不同功能或不同上架節奏，才拆成兩個 Bundle ID。

### 原生 App 需要的 Firebase SDK

iOS/macOS SwiftUI App 預計需要：

- `FirebaseAuth`
- `FirebaseFirestore`
- `FirebaseAnalytics`，可選
- `GoogleSignIn`

App 版最小資料服務：

- 監聽登入狀態。
- 讀取目前月份活動。
- 新增活動。
- 編輯活動。
- 刪除活動。
- 儲存前檢查衝突。
- 儲存時做伺服器端最終衝突保護。

### 建議 Firestore 查詢調整

目前網站：

```js
getDocs(collection(db, 'events'))
```

App 版建議改成：

- 查詢目前月份。
- 使用 `date >= monthStart` 與 `date <= monthEnd`。
- Firestore 若提示需要 index，再依提示建立 index。

原因：

- 降低讀取成本。
- 提升啟動速度。
- 更適合做本機快取與離線模式。

### 建議補強資料欄位

保留既有欄位，新增 metadata：

```js
{
  date: "YYYY-MM-DD",
  title: string,
  startTime: "HH:mm",
  endTime: "HH:mm",
  venues: string[],
  hostType: "學界" | "社會界",
  organizer: string,
  organizerPhone: string,
  createdAt: Timestamp,
  updatedAt: Timestamp,
  createdByUid: string,
  updatedByUid: string
}
```

理由：

- 可追蹤誰建立、誰修改。
- 對未來權限控管有用。
- 對除錯同步問題有用。

遷移注意：

- 舊資料沒有 metadata。
- App 必須能容忍舊文件缺少 metadata。
- 可在後續做一次性 backfill。

### 權限模型建議

最低標準：

- 未登入不能讀寫。
- 登入後可讀。
- 新增、編輯、刪除限制為核准使用者。

更完整：

- `admin`：全部管理。
- `editor`：新增、編輯、刪除。
- `viewer`：只讀。

可用方式：

- Firestore `users/{uid}` 儲存角色。
- 或使用 Firebase Auth custom claims。

### 已發現問題與解法

| 問題 / 風險 | 影響 | 解法 |
| --- | --- | --- |
| WebView 內 Google popup 登入可能不穩 | App 登入體驗不可靠 | 改用原生 Firebase Auth + GoogleSignIn SDK |
| 目前只做前端衝突檢查 | 多人同時新增時可能重疊 | 用 transaction 或 Cloud Function 做最終檢查 |
| 讀取整個 `events` collection | 資料量大時成本與速度變差 | 改成月份日期範圍查詢 |
| Firestore rules 未在 repo 內 | 無法確認資料是否安全 | 到 Firebase Console 匯出或截圖 rules |
| 沒有角色權限 | 任何登入者可能可修改資料 | 建立 admin/editor/viewer 權限模型 |
| 沒有測試 | App 化時容易出現回歸 | 先補衝突檢查與日期處理測試 |
| 場地清單寫死 | 場地變更需要改版 | v1 保持靜態；需要管理後再改 Firestore |
| 舊資料沒有 metadata | 追蹤與稽核不足 | 新資料開始寫 metadata，舊資料後續 backfill |

## 下一步建議

接下來應執行第 3 步：

1. 確認 App 技術路線：
   - WebView v1。
   - SwiftUI 原生 v1。
   - 先 WebView、再逐步原生化。

2. 決定 Bundle ID。

3. 從 Firebase Console 匯出或截圖：
   - Authentication providers。
   - Firestore security rules。
   - Firestore `events` sample document。

4. 建立下一份文件：
   - `APP_ARCHITECTURE.md`
   - 內容包含 v1 架構、資料流、登入方式、App Store 風險與開發里程碑。
