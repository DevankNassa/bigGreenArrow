# Release checklist

## iOS: TestFlight from GitHub Actions

`.github/workflows/ios-release.yml` builds a signed `.ipa` on a GitHub-hosted
Mac (`expo prebuild`, then `xcodebuild`) and uploads it to App Store
Connect. No Mac and no EAS account are needed. The repo is public, so the
macOS runner minutes are free. The only cost is the Apple Developer Program.

One-time setup. The distribution certificate and the App Store Connect API
key from Instant Playlist (`~/ios-signing`) are reused; only the app ID,
the provisioning profile and the App Store Connect app are new.

Developer portal (https://developer.apple.com/account):
- [ ] Identifiers → **+** → App IDs → App → Bundle ID (explicit)
      `com.devanknassa.biggreenarrow`. No extra capabilities needed.
- [ ] Profiles → **+** → Distribution *App Store Connect* → that app ID →
      the existing Apple Distribution certificate → name it
      `Big Green Arrow App Store` → download it into `~/ios-signing`.

App Store Connect (https://appstoreconnect.apple.com):
- [ ] Apps → **+** New App → iOS, name "Big Green Arrow", language, bundle
      ID `com.devanknassa.biggreenarrow`, SKU (any string, e.g. `biggreenarrow`).

GitHub secrets (run in `~/ios-signing`, from this repo's folder or with `-R DevankNassa/bigGreenArrow`):
```sh
base64 -w0 dist.p12 | gh secret set IOS_DIST_CERT_P12_BASE64 -R DevankNassa/bigGreenArrow
gh secret set IOS_DIST_CERT_PASSWORD -R DevankNassa/bigGreenArrow          # paste the .p12 password
base64 -w0 "Big_Green_Arrow_App_Store.mobileprovision" | gh secret set IOS_PROFILE_BASE64 -R DevankNassa/bigGreenArrow
gh secret set APPSTORE_KEY_ID -R DevankNassa/bigGreenArrow                 # paste Key ID
gh secret set APPSTORE_ISSUER_ID -R DevankNassa/bigGreenArrow              # paste Issuer ID
gh secret set APPSTORE_PRIVATE_KEY -R DevankNassa/bigGreenArrow < AuthKey_*.p8
```
(Use the profile file name you actually downloaded.)

Each build:
- [ ] `gh workflow run ios-release.yml` (or Actions → *iOS release (TestFlight)*
      → Run workflow). The workflow file must be on `main` for this.
- [ ] The build appears in App Store Connect → TestFlight after processing
      (~15–30 min). Add yourself as an internal tester and install it from
      the TestFlight app.
- [ ] The build number is the workflow run number. Bump `expo.version` in
      `app.json` for a new version.

`app.json` sets `ios.config.usesNonExemptEncryption: false`, so App Store
Connect doesn't ask the export-compliance question for each build.

The distribution certificate expires a year after it was created; when it's
renewed, update the two `IOS_DIST_CERT_*` secrets here and in Instant
Playlist, and regenerate both profiles.
