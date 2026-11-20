# PersonalSpace

Personal bookmark manager — amar sob link, folder ar tag ek jaygay. Data thake **Google Sheet** e, login hoy **Google Apps Script** diye.

**Features**
- Folder ar tag diye link sajano, Favorites
- Instant search (title, link, note, tag)
- Grid / list view, light / dark theme (system onujayi)
- Screen e jekono jaygay link paste korlei save dialog khule
- Keyboard: `/` search, `N` notun link, `Esc` bondho
- Delete korle Undo
- Chrome / Edge / Firefox / Safari theke bookmarks `.html` import (browser er folder gula folder hoye ashe), JSON backup export/import

Ek codebase theke build hoy:

| Platform | Output | Command |
|---|---|---|
| Web | static site (`dist/`) | `npm run build:web` |
| Windows | `.exe` (NSIS) / `.msi` | `npm run desktop:build` (Windows e) |
| macOS | `.dmg` / `.app` | `npm run desktop:build` (Mac e) |
| Linux | `.deb` / `.AppImage` / `.rpm` | `npm run desktop:build` (Linux e) |
| Android | `.apk` / `.aab` | `npm run android:build` |
| iOS | `.ipa` | `npm run ios:build` (Mac + Xcode lagbe) |

**Stack:** [Tauri v2](https://v2.tauri.app) (Rust) + React + TypeScript + Vite + Motion (animation) + Lucide (icons).

## Project structure

```
apps-script/Code.gs      Google Apps Script backend (login + Sheet e data)
src/                     React UI (web + sob app e same)
  App.tsx                Main screen: search, filter, cards, dialog, toast
  store.ts               Bookmark ar collection er data logic
  components/            Sidebar, BookmarkCard, BookmarkDialog
  lib/storage.ts         Data save/load (ekhon localStorage)
  lib/importExport.ts    Browser bookmarks import, JSON backup
  lib/sync.ts            Apps Script er sathe login, sync queue, offline retry
  components/LoginScreen.tsx  Login screen
  lib/open.ts            Link khola (app e system browser, web e notun tab)
  styles.css             Design tokens, light/dark theme
src-tauri/           Rust backend + native config
  src/lib.rs         Tauri commands (e.g. app_info)
  tauri.conf.json    App name, window, bundle settings
.github/workflows/   CI: sob platform er build
```

## Google Sheet + Apps Script setup (ekbar korte hobe)

1. [Google Sheets](https://sheets.new) e notun ekta Sheet khulun, naam din (jemon *PersonalSpace Data*).
2. Menu theke **Extensions → Apps Script** khulun.
3. `Code.gs` er sob lekha muche, ei repo-r [`apps-script/Code.gs`](apps-script/Code.gs) puro ta paste korun. **Save** (Ctrl+S).
4. Baam pasher **⚙ Project Settings** → niche **Script properties** → **Add script property**:
   - Property: `APP_PASSWORD`
   - Value: apnar login password (shokto ekta din)
   - **Save script properties**
5. Upore dan dike **Deploy → New deployment** → ⚙ theke **Web app** select korun:
   - Execute as: **Me**
   - Who has access: **Anyone**
   - **Deploy** → Google permission chaile **Authorize access** → apnar account → *Advanced → Go to … (unsafe)* → **Allow**
     (eta apnar nijer script, tai Google ei warning dey)
6. **Web app URL** ta copy korun (`https://script.google.com/macros/s/…/exec`).
7. PersonalSpace khule login screen e URL ar password din. Prothom bar login korle Sheet e `Bookmarks` ar `Folders` naame duita tab nije theke toiri hobe.

**URL kothay thake:** [`src/config.ts`](src/config.ts) e. Ekhane URL thakle login e shudhu password chay. Notun deployment (notun URL) korle oi file e URL bodlan.

**Code.gs update korle:** Deploy → **Manage deployments** → ✏️ → Version: **New version** → Deploy. (URL same thakbe.)

**Password bodlate:** Script properties e `APP_PASSWORD` change korun. Ager login gula 90 din por nije theke expire hobe.

### Kivabe kaj kore

- Login e password Apps Script check kore, mille ekta token dey (90 din valid). Password kothao save hoy na, shudhu token device e thake.
- Prottek change (add, edit, delete, favorite, folder) shathe shathe screen e dekhay, device e cache hoy, tarpor background e Sheet e jay.
- Internet na thakle change gula jome thake; net firle nije theke Sheet e chole jay. Sidebar er niche status dekhay.
- App khulle ba window e focus korle Sheet theke latest data ane, tai onno device er change o dekhben.
- Sheet e haate edit korleo cholbe; column header er naam dekhe data pore.

## Development setup

1. Prerequisites: <https://v2.tauri.app/start/prerequisites/>
   - Node.js 20+ ar Rust (`rustup`)
   - Windows: Microsoft C++ Build Tools + WebView2
   - Linux: `libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf`
   - Android: Android Studio, SDK, NDK, `JAVA_HOME`, `ANDROID_HOME`, `NDK_HOME`
   - iOS: macOS + Xcode
2. `npm install`

## Development

```bash
npm run dev            # web — browser e http://localhost:1420
npm run desktop:dev    # desktop app window

npm run android:init   # prothom bar ekbar
npm run android:dev    # emulator / phone e

npm run ios:init       # prothom bar ekbar (Mac)
npm run ios:dev
```

## Release (CI)

`.github/workflows/build.yml`:

- **main e push** → web build, GitHub Pages e deploy (Settings → Pages → Source: *GitHub Actions* ekbar on korte hobe).
- **`v*` tag push** (e.g. `git tag v0.1.0 && git push --tags`) → Windows, macOS (Apple Silicon + Intel), Linux installer gula ekta **draft Release** e upload hoy, ar Android APK *Actions → artifacts* e paben.

### Signing note

- Android APK ekhon debug-signed (direct install kora jay). Play Store er jonno release keystore lagbe: <https://v2.tauri.app/distribute/sign/android/>
- iOS `.ipa` er jonno Apple Developer account ar signing lagbe, tai CI te rakha hoy ni: <https://v2.tauri.app/distribute/app-store/>
- macOS/Windows code signing optional, chaile pore add kora jabe.
