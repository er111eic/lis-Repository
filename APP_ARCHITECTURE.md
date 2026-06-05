# iOS / macOS App 架構規劃

日期：2026-05-26

本文件接續 `APP_MIGRATION_PLAN.md`，定義第一版 iOS / macOS App 的建議架構、資料流、登入方式、開發里程碑與風險處理方式。

## 建議方向

建議採用：

- SwiftUI Multiplatform App。
- Firebase Auth 原生登入。
- Firebase Firestore 原生資料讀寫。
- 共用核心資料模型與 business logic。
- iOS 與 macOS 依平台調整 UI。

不建議把第一版正式上架 App 做成純 WebView。

原因：

- Google popup login 在 WebView 內可能不穩。
- 純網站包裝有 App Store 審核風險。
- 目前系統功能範圍不大，適合直接原生化核心流程。

可接受的備援方案：

- 先做內部測試用 WebView shell。
- 同步開發 SwiftUI 原生版。
- WebView 只作為過渡，不作為正式上架主方案。

## 目標平台

### iOS

主要使用場景：

- 手機快速查看今日與本月借用。
- 新增、編輯、刪除借用。
- 查看場地衝突。

UI 方向：

- 月曆首頁。
- 手機使用單欄 agenda list。
- 新增/編輯使用原生 `.sheet`。
- 詳情使用 `.sheet`。

### macOS

主要使用場景：

- 桌面管理整月活動。
- 快速比對場地與日期。
- 較大量編輯。

UI 方向：

- 桌面月曆 grid。
- Toolbar 放月份切換與新增。
- 詳情可用 inspector / popover / sheet。
- 表單比 iOS 更寬，但不做過度裝飾。

## App 分層架構

```text
XDSDSpaceBookingApp
├── App
│   ├── App entry
│   ├── Firebase bootstrap
│   └── Platform routing
├── Models
│   ├── BookingEvent
│   ├── Venue
│   ├── HostType
│   └── AppUser
├── Services
│   ├── AuthService
│   ├── EventRepository
│   ├── ConflictService
│   └── UserRoleService
├── ViewModels
│   ├── CalendarViewModel
│   ├── EventFormViewModel
│   └── EventDetailViewModel
├── Views
│   ├── CalendarView
│   ├── MonthGridView
│   ├── AgendaListView
│   ├── EventFormSheet
│   └── EventDetailSheet
└── Shared
    ├── DateUtils
    ├── Validation
    └── DesignTokens
```

## 核心資料模型

### BookingEvent

Swift model 建議：

```swift
struct BookingEvent: Identifiable, Codable, Equatable {
    var id: String?
    var date: String
    var title: String
    var startTime: String
    var endTime: String
    var venues: [String]
    var hostType: HostType
    var organizer: String
    var organizerPhone: String?
    var createdAt: Date?
    var updatedAt: Date?
    var createdByUid: String?
    var updatedByUid: String?
}
```

### HostType

```swift
enum HostType: String, Codable, CaseIterable {
    case academic = "學界"
    case community = "社會界"
}
```

### Venue

第一版可先用靜態清單：

```swift
enum Venue: String, CaseIterable, Codable {
    case xiangdeBuddhaHall = "晑德-佛堂"
    case xiangdeKitchen = "晑德-廚房"
    case xiangdeClassroom = "晑德-多功能教室"
    case xiangdeMeetingRoom = "晑德-會談室"
    case xingdeBuddhaHall = "杏德-佛堂"
    case xingdeKitchen = "杏德-坤伙"
}
```

後續若場地需要後台管理，再改成 Firestore `venues` collection。

## Firebase 資料流

### 啟動

```text
App launch
→ FirebaseApp.configure()
→ AuthService 監聽登入狀態
→ 已登入：讀取目前月份 events
→ 未登入：顯示登入畫面
```

### 讀取月份資料

```text
CalendarViewModel.selectedMonth
→ EventRepository.fetchEvents(month)
→ Firestore query: date >= monthStart && date <= monthEnd
→ decode BookingEvent
→ group by date
→ render calendar
```

### 新增活動

```text
EventFormSheet
→ validate required fields
→ ConflictService local pre-check
→ EventRepository.create(event)
→ server-side conflict check
→ Firestore write
→ refresh month events
```

### 編輯活動

```text
EventDetailSheet
→ Edit
→ EventFormSheet(existingEvent)
→ validate
→ ConflictService excludes current event id
→ EventRepository.update(event)
→ server-side conflict check
→ Firestore write
→ refresh month events
```

### 刪除活動

```text
EventDetailSheet
→ Delete confirmation
→ EventRepository.delete(eventId)
→ refresh month events
```

## Firestore Query 設計

第一版建議查詢當月：

```swift
events
  whereField("date", isGreaterThanOrEqualTo: monthStart)
  whereField("date", isLessThanOrEqualTo: monthEnd)
```

必要條件：

- `date` 必須維持 `YYYY-MM-DD` 字串格式。
- 字串排序才能正確反映日期順序。

替代方案：

- 新增 `dateValue: Timestamp` 欄位。
- 查詢用 Timestamp。

建議：

- 短期保留 `date` 字串，降低遷移成本。
- 中期新增 `dateValue`，改善查詢語意。

## 衝突檢查策略

### 第一階段：App 本機檢查

App 端先檢查目前月份已載入資料：

- 相同日期。
- 任一場地相同。
- 時間區間重疊。
- 編輯時排除同一個 event id。

這能改善使用者體驗，但不是最終保護。

### 第二階段：伺服器端最終檢查

正式上架前建議補上其一：

1. Firestore transaction
   - App 讀取同日 events。
   - 在 transaction 內檢查衝突。
   - 無衝突才寫入。

2. Cloud Function callable API
   - App 呼叫 `createBooking` / `updateBooking`。
   - Function 檢查權限與衝突。
   - Function 寫入 Firestore。

建議選擇：

- 若使用者數少：先用 Firestore transaction。
- 若需要嚴格權限、稽核、通知：用 Cloud Function。

## 登入與權限

### 登入方式

iOS / macOS App 使用：

- FirebaseAuth。
- GoogleSignIn。

不要使用：

- WebView 內的 `signInWithPopup`。

### 權限模型

第一版最低要求：

- 未登入：不能進入系統。
- 已登入：可讀取。
- 只有核准帳號可新增、編輯、刪除。

建議資料結構：

```text
users/{uid}
  displayName
  email
  role: "admin" | "editor" | "viewer"
  enabled: true
```

角色：

- `admin`：管理所有資料與使用者。
- `editor`：新增、編輯、刪除活動。
- `viewer`：只讀。

## UI 架構

### 共用 UI 原則

沿用 `DESIGN.md`：

- 工具型介面。
- 不做行銷式首頁。
- 以月曆、今日摘要、表單為主。
- 學界藍色。
- 社會界橘色。
- 避免過度裝飾。

### iOS UI

首頁：

- 上方：月份切換。
- 中段：今日摘要。
- 主體：手機 agenda list。
- 底部或 toolbar：新增。

新增/編輯：

- 原生 sheet。
- 表單分區：
  - 活動資訊。
  - 空間選擇。
  - 聯絡資訊。
- Save 固定在 bottom toolbar。

活動詳情：

- sheet。
- 顯示完整欄位。
- 下方提供編輯與刪除。

### macOS UI

首頁：

- Toolbar：
  - 上一月。
  - 目前月份。
  - 下一月。
  - 新增借用。
- 主體：月曆 grid。
- 右側可選 inspector：顯示選取活動詳情。

新增/編輯：

- sheet 或 floating panel。
- 鍵盤操作需要可用：
  - `Cmd+N` 新增。
  - `Esc` 關閉。
  - `Cmd+S` 儲存。

## v1 開發里程碑

### Milestone 0：準備

- 建立 Xcode SwiftUI Multiplatform 專案。
- 決定 Bundle ID。
- 在 Firebase Console 加入 iOS/macOS app。
- 加入 `GoogleService-Info.plist`。

### Milestone 1：資料模型與 Firebase

- 建立 `BookingEvent`。
- 建立 `Venue`。
- 建立 `HostType`。
- 建立 `AuthService`。
- 建立 `EventRepository`。
- 可讀取目前月份 events。

### Milestone 2：月曆與列表

- iOS agenda list。
- macOS month grid。
- 今日摘要。
- 學界/社會界顏色標示。

### Milestone 3：新增與編輯

- 新增活動 sheet。
- 編輯活動 sheet。
- 本機表單驗證。
- 本機衝突檢查。
- Firestore create/update。

### Milestone 4：詳情與刪除

- 活動詳情 sheet / inspector。
- 刪除確認。
- Firestore delete。

### Milestone 5：權限與安全

- 使用者角色讀取。
- 只允許核准帳號寫入。
- Firestore rules 更新。
- transaction 或 Cloud Function 衝突保護。

### Milestone 6：測試與發佈準備

- iPhone 實機測試。
- iPad 模擬器測試。
- macOS 測試。
- TestFlight。
- App icon。
- App Store screenshots。
- Privacy labels。

## 需要準備的資料

請準備或確認：

- Apple Developer Program 帳號。
- Firebase Console 管理權限。
- Google Cloud Console 管理權限。
- Firestore security rules。
- 目前 `events` collection 的 2 到 3 筆範例資料。
- App 名稱。
- Bundle ID 決策。
- App icon 原始圖。
- 哪些 Google 帳號可以管理資料。

## 技術風險與處理

| 風險 | 影響 | 處理 |
| --- | --- | --- |
| 原生 Google 登入設定較多 | 初期設定可能卡住 | 先完成 Firebase iOS/macOS app 設定與 URL scheme |
| Firestore rules 未確認 | 可能有資料安全問題 | 先匯出 rules，再設計角色權限 |
| 同步寫入衝突 | 可能產生重疊借用 | transaction 或 Cloud Function |
| iOS/macOS UI 差異 | 共用 UI 可能不自然 | 共用模型與 service，UI 分平台調整 |
| 舊資料缺 metadata | 不能完整稽核 | App 容忍缺欄位，新資料開始寫 metadata |
| App Store 審核 | 純 WebView 風險高 | 採 SwiftUI 原生 App 作為正式方案 |

## 待決策項目

1. 是否採用 SwiftUI 原生 v1。
2. Bundle ID 是否使用單一 multiplatform ID。
3. 寫入權限是否採 approved email list 或角色模型。
4. 衝突保護採 Firestore transaction 或 Cloud Function。
5. 場地清單 v1 是否維持靜態。
6. 是否需要提醒/推播。
7. 是否需要匯入/匯出功能。

## 下一步

建議下一步執行：

1. 建立 `APP_FIREBASE_CHECKLIST.md`。
2. 逐項列出 Firebase Console 要確認的畫面與設定。
3. 等你提供 Firestore rules 後，進一步設計安全規則與角色模型。
