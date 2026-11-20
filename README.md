# PersonalSpace

Personal bookmark manager — amar sob link, collection ar tag ek jaygay.

**Features**
- Collections (folder) ar tags diye link sajano, Favorites
- Instant search (title, link, note, tag)
- Grid / list view, light / dark theme (system onujayi)
- Screen e jekono jaygay link paste korlei save dialog khule
- Keyboard: `/` search, `N` notun link, `Esc` bondho
- Delete korle Undo
- Chrome / Edge / Firefox / Safari theke bookmarks `.html` import, JSON backup export/import

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
src/                     React UI (web + sob app e same)
  App.tsx                Main screen: search, filter, cards, dialog, toast
  store.ts               Bookmark ar collection er data logic
  components/            Sidebar, BookmarkCard, BookmarkDialog
  lib/storage.ts         Data save/load (ekhon localStorage)
  lib/importExport.ts    Browser bookmarks import, JSON backup
  lib/open.ts            Link khola (app e system browser, web e notun tab)
  styles.css             Design tokens, light/dark theme
src-tauri/           Rust backend + native config
  src/lib.rs         Tauri commands (e.g. app_info)
  tauri.conf.json    App name, window, bundle settings
.github/workflows/   CI: sob platform er build
```

## Setup

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
