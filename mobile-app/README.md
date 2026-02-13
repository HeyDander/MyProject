# Mobile App

Это мобильная версия твоего проекта (Android/iOS) на `Expo` + `WebView`.

## Как запустить

1. В корне проекта запусти сервер сайта:
   - `npm run dev`
2. Установи mobile-зависимости:
   - `npm run mobile:install`
3. Запусти мобильное приложение:
   - `npm run mobile:start`

## Важно про URL сервера

По умолчанию приложение открывает:

- Android Emulator: `http://10.0.2.2:3000/login`
- iOS Simulator: `http://localhost:3000/login`

Если открываешь с реального телефона, укажи IP твоего компьютера:

- macOS/Linux:
  - `EXPO_PUBLIC_SERVER_URL=http://192.168.x.x:3000/login npm run mobile:start`
- Windows (PowerShell):
  - `$env:EXPO_PUBLIC_SERVER_URL=\"http://192.168.x.x:3000/login\"; npm run mobile:start`

Телефон и компьютер должны быть в одной Wi‑Fi сети.
