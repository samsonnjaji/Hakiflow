# Katiba OS Flutter client

This is the adaptive Android, iOS, web, Windows, macOS, and Linux client for the same Katiba OS API used by the React PWA. It includes citizen, paralegal, and lawyer workspaces; intake; case review; evidence; AI findings; contract review; PDF pack access; microphone transcription; and disclosed AI voice playback.

## Run locally

Start the repository API first with `npm run dev:api` from the project root.

Android emulator:

```powershell
flutter run --dart-define=KATIBA_API_URL=http://10.0.2.2:8787
```

Web or desktop:

```powershell
flutter run -d chrome --dart-define=KATIBA_API_URL=http://127.0.0.1:8787
```

The API URL can also be edited on the role-selection screen. A physical phone must use the development computer's LAN IP and allow the relevant firewall rule.

## Verify

```powershell
dart format --output=none --set-exit-if-changed lib test
flutter analyze
flutter test
flutter build apk --debug --dart-define=KATIBA_API_URL=https://katiba-os-api.onrender.com
flutter build web --release --dart-define=KATIBA_API_URL=https://katiba-os-api.onrender.com
```

## Production configuration

Release builds default to the live Render API. The explicit command is:

```powershell
flutter build apk --release --dart-define=KATIBA_API_URL=https://katiba-os-api.onrender.com
```

Never compile `OPENAI_API_KEY` into Flutter. The app sends authenticated audio or summary text to Katiba OS; the Render API holds the key and calls OpenAI. Android, iOS, and macOS microphone declarations are included. iOS and macOS builds require Xcode on macOS; Windows builds require Visual Studio Desktop development with C++.

Release builds enforce HTTPS. Debug and profile manifests allow cleartext traffic only for local-emulator development. The included release APK uses the development signing key for hackathon side-loading; configure a private upload key before publishing to an app store.
