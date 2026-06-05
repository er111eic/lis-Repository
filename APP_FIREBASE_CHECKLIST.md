# Firebase App 化檢查清單

日期：2026-05-26

目的：

- 檢查目前 Firebase 專案是否適合支援 iOS / macOS App。
- 明確區分「只讀檢查」與「會改設定」。
- 避免在規劃階段更動 Firestore 既有資料。

重要原則：

- 本階段不新增、修改、刪除 Firestore `events` 內的任何資料。
- 需要修改設定前，先記錄現況，再確認是否執行。
- Firestore data tab 只看 schema，不手動編輯文件。

## 0. 專案基本資訊

只讀檢查。

| 項目 | 目前觀察值 | 待確認 |
| --- | --- | --- |
| Firebase projectId | `xingdexangdeclassroom` |  |
| Auth domain | `xingdexangdeclassroom.firebaseapp.com` |  |
| Firestore collection | `events` |  |
| Web SDK version | `11.9.1` |  |
| 目前正式網站 | GitHub Pages |  |

需要確認：

- [ ] 你是否有 Firebase Console 管理權限。
- [ ] 你是否有 Google Cloud Console 管理權限。
- [ ] 這個 Firebase project 是否就是正式資料庫。
- [ ] 是否有 staging / test project。若沒有，建議建立。

風險：

- 若直接在正式 project 開發 App，測試時容易污染正式資料。

建議：

- 建立 `xingdexangdeclassroom-dev` 或類似命名的測試 Firebase project。
- App 開發初期先連 dev project。

## 1. Authentication 檢查

多數項目為只讀檢查；啟用 provider 或修改網域屬於設定變更。

Firebase Console 路徑：

```text
Firebase Console
→ Build
→ Authentication
```

### Sign-in method

- [ ] Google provider 是否已啟用。
- [ ] Support email 是否已設定。
- [ ] 是否限制登入帳號網域。
- [ ] 是否只允許特定帳號使用系統。

記錄：

```text
Google provider: enabled / disabled
Support email:
登入限制:
```

### Authorized domains

只讀檢查。

確認目前是否包含：

- [ ] `xingdexangdeclassroom.firebaseapp.com`
- [ ] `xingdexangdeclassroom.web.app`
- [ ] `er111eic.github.io`
- [ ] 未來正式自訂網域，如果有

App 影響：

- Web 版登入需要 authorized domain。
- 原生 App 主要依 Bundle ID / URL scheme / Google config，不只靠 authorized domain。

### Native Google Sign-In 準備

設定變更，先不要執行，先確認。

需要未來取得：

- [ ] iOS client ID。
- [ ] Reversed client ID。
- [ ] `GoogleService-Info.plist`。
- [ ] Xcode URL scheme。

風險：

- Bundle ID 若後續更改，Firebase app 設定與 Google Sign-In 設定也要跟著改。

建議：

- 先決定 Bundle ID，再建立 Firebase iOS/macOS app。

## 2. Firestore Data Schema 檢查

只讀檢查。不要編輯文件。

Firebase Console 路徑：

```text
Firebase Console
→ Build
→ Firestore Database
→ Data
→ events
```

### Collection

- [ ] `events` collection 是否存在。
- [ ] 文件 ID 是否為 Firestore 自動 ID。
- [ ] 是否有其他 collection 也跟借用系統相關。

### Sample Document

請選 2 到 3 筆文件，只記錄欄位名稱與型別，不需要貼完整個人資料。

預期欄位：

| 欄位 | 預期型別 | 必填 | 備註 |
| --- | --- | --- | --- |
| `date` | string, `YYYY-MM-DD` | 是 | 用於月曆分組 |
| `title` | string | 是 | 活動名稱 |
| `startTime` | string, `HH:mm` | 是 | 開始時間 |
| `endTime` | string, `HH:mm` | 是 | 結束時間 |
| `venues` | array of string | 是 | 場地 |
| `hostType` | string | 是 | `學界` 或 `社會界` |
| `organizer` | string | 是 | 負責人 |
| `organizerPhone` | string | 否 | 電話選填 |

實際觀察：

```text
文件 1 欄位:
文件 2 欄位:
文件 3 欄位:
```

需注意：

- [ ] 是否有缺少 `date` 的舊資料。
- [ ] 是否有 `venues` 不是 array 的資料。
- [ ] 是否有 `hostType` 不是 `學界` / `社會界`。
- [ ] 是否有時間格式不是 `HH:mm`。

## 3. Firestore Security Rules 檢查

只讀檢查。不要直接修改 rules。

Firebase Console 路徑：

```text
Firebase Console
→ Build
→ Firestore Database
→ Rules
```

請複製目前 rules 到本機文件或提供給 Codex 分析。

要確認：

- [ ] 未登入是否不能讀取。
- [ ] 未登入是否不能寫入。
- [ ] 登入後是否所有人都能寫入。
- [ ] 是否限制 collection。
- [ ] 是否驗證欄位型別。
- [ ] 是否驗證必要欄位。
- [ ] 是否防止使用者偽造 `createdByUid` / `updatedByUid`。

風險分級：

| 現況 | 風險 |
| --- | --- |
| `allow read, write: if true` | 高 |
| `allow read, write: if request.auth != null` | 中 |
| 有角色/欄位驗證 | 低到中 |

App 前建議目標：

```text
未登入：不可讀寫
viewer：可讀
editor：admin/editor 可新增、編輯、刪除
admin：可管理角色
```

## 4. Firestore Index 檢查

只讀檢查。

Firebase Console 路徑：

```text
Firestore Database
→ Indexes
```

App 版預計需要查詢：

```text
events
where date >= monthStart
where date <= monthEnd
```

需要確認：

- [ ] 是否已有 `events.date` 相關 index。
- [ ] 若沒有，是否 Firestore 單欄 index 已足夠。
- [ ] 未來若加 `createdByUid` / `updatedByUid` / `hostType` 篩選，可能需要 composite index。

備註：

- Firestore 通常會在查詢失敗時提供建立 index 的連結。
- 不需要現在主動建立大量 index。

## 5. Native App 設定準備

設定變更。先決定 Bundle ID，再執行。

Firebase Console 路徑：

```text
Project settings
→ General
→ Your apps
```

### Bundle ID 決策

待決定：

- [ ] 單一 Multiplatform Bundle ID：`org.xingde.spacebooking`
- [ ] iOS/macOS 分開：
  - iOS：`org.xingde.spacebooking.ios`
  - macOS：`org.xingde.spacebooking.macos`

建議：

- 第一版用單一 SwiftUI Multiplatform project。
- 若 Firebase/Google 設定要求拆 target，再拆 Bundle ID。

### iOS App

建立後需取得：

- [ ] `GoogleService-Info.plist`
- [ ] iOS client ID
- [ ] reversed client ID
- [ ] URL scheme

### macOS App

需要確認：

- [ ] Firebase 是否用同一個 plist。
- [ ] Google Sign-In macOS URL scheme 是否正確。
- [ ] App Sandbox capability 是否影響網路連線。

## 6. Google Cloud Console 檢查

只讀檢查為主。

Google Cloud Console 路徑：

```text
Google Cloud Console
→ APIs & Services
→ Credentials
```

需要確認：

- [ ] Firebase 專案對應的 Google Cloud project。
- [ ] OAuth consent screen 是否已設定。
- [ ] OAuth app name 是否合理。
- [ ] Support email 是否正確。
- [ ] Authorized domains 是否包含相關網域。
- [ ] 是否有 iOS OAuth client。
- [ ] 是否有 macOS 需要的 OAuth client。

風險：

- 若 OAuth consent screen 資訊不完整，原生 Google 登入可能卡住或在測試帳號外不可用。

## 7. 權限模型決策

需要產品決策，不直接改資料。

選項 A：approved email list

- 優點：簡單。
- 缺點：權限不細。

選項 B：Firestore `users/{uid}` role

- 優點：彈性高。
- 缺點：需要管理介面或手動維護。

選項 C：Firebase Auth custom claims

- 優點：安全、適合正式權限。
- 缺點：需要後端或管理工具設定 claims。

建議：

- v1 使用 Firestore `users/{uid}`。
- 若之後需要更嚴格，再升級 custom claims。

## 8. 不可更動資料庫原則

在進入實作前，Codex 應遵守：

- 不執行會寫入 Firestore 的 script。
- 不呼叫 `addDoc`、`setDoc`、`deleteDoc` 對正式資料庫操作。
- 不使用 Firebase Admin SDK 修改正式資料。
- 不清空 collection。
- 不改 Firestore rules，除非你明確要求並確認內容。

允許：

- 讀取本機程式碼。
- 產生文件。
- 撰寫尚未執行的 rules 草稿。
- 撰寫尚未連線正式資料庫的 App 程式骨架。
- 建立 mock data 或 local sample data。

## 9. 要請你提供的資料

為了進入下一階段，請提供：

- [ ] Firestore security rules 內容。
- [ ] `events` collection 任 2 到 3 筆範例欄位結構，遮蔽私人資訊即可。
- [ ] 目前有哪些人可以新增/編輯/刪除。
- [ ] 是否需要 viewer 只讀角色。
- [ ] 是否有正式 App 名稱。
- [ ] Bundle ID 偏好。
- [ ] 是否要先建 dev Firebase project。

## 10. 下一步

完成本檢查清單後，下一份文件建議為：

- `APP_SECURITY_RULES_DRAFT.md`

內容：

- Firestore rules 草稿。
- `users/{uid}` role model。
- `events` 欄位驗證規則。
- 不改正式 rules，只先建立可審查版本。
