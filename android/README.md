# Flosy Android — فلوسي

Native Android WebView wrapper for the existing published **Flosy** dashboard:
https://ahmedsayed20233.github.io/mynewproject/

- Android 7.0+ (API 24+).
- Java 17, Android Gradle Plugin 8.9.2, Gradle 8.11.1, compile/target SDK 35.
- Does not bundle passwords, service-role keys, or financial user data.
- Supports Android system printing / Save to PDF from the updated detailed Reports section.
- Uses the published website and Supabase project already configured there. Needs internet.
- Same Supabase account as browser. On-device WebView storage is separate from Chrome. Signing in and syncing restores cloud records.
- HTTPS-only remote content; disables mixed content and direct file/content access. Outside links open Android browser.
- Build for personal testing: `gradle -p android assembleDebug` (from repository root).
- APK from CI: Actions → **Build Flosy Android APK** → latest successful run → artifact `Flosy-Android-APK`.
- Debug APK is developer-signed for **testing**. It is **not** a production release signed for distribution via Google Play.
- The built-in site's local JavaScript backup uses blob URLs; this WebView wrapper may not support downloading those backups. For backup exports, open the web site in Chrome.
- Be aware a GitHub Actions debug keystore is generally ephemeral across build runs; installing a later APK may require uninstalling the previous one (back up/sync data first). Production updates need a securely preserved release signing key.

To build in Android Studio, open the `android` folder and run the app.
