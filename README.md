# Big Green Arrow

A free, open-source weight tracker that ignores the day-to-day noise of the scale. It shows your **trend weight** and how fast that trend is moving. One big arrow tells you whether you're on track for your goal and whether your pace is healthy.

- 🟢 **Big green arrow**: right direction, at the pace you chose
- 🟩 **Light green**: right direction, but slow
- ⚪ **Dash**: flat
- 🟥 **Light red / 🔴 red**: going the wrong way
- 🟠 **Amber**: right direction, but too fast

No accounts, no ads, no servers. Your data stays on your phone. See [SPEC.md](SPEC.md) for the full product spec.

> **Status:** early development. You can log weigh-ins and see your trend and arrow. Onboarding, settings, history, and Health sync are next.

## Development

Requires Node 22+ (Node 24 LTS recommended).

```bash
npm install
npm test            # unit tests (engine, storage, helpers)
npm run typecheck   # run `npx expo start` once first so it generates expo-env.d.ts
npm run lint
npx expo start      # dev server: press a for Android, w for web, or scan the QR code with Expo Go
```

The web build is only for development. It stores data in the browser with SQLite compiled to WebAssembly, which is why `metro.config.js` sets cross-origin isolation headers.

### Project layout

| Path | What it is |
|---|---|
| `src/engine/` | The trend and arrow engine: pure TypeScript, no React or native imports. Weigh-ins + settings → trend, rate, arrow state |
| `src/app/` | Screens (Expo Router) |
| `src/data/` | On-device storage: SQLite schema and migrations, weigh-ins, preferences |
| `src/lib/` | Small app helpers: dates, weight input parsing, labels |
| `src/components/` | UI components, including the arrow |
| `src/demo/` | Sample histories for trying the arrow |

The engine is the heart of the app. Every rule in it (smoothing, rate, zones, anti-flicker, confidence) has unit tests in `src/engine/__tests__/`.

## Privacy

Big Green Arrow has no backend and collects no analytics. Health data is read from Apple Health / Health Connect with your permission, and only leaves your device when you export it yourself. The code is public so anyone can check this.

## Disclaimer

Big Green Arrow is not medical advice. Talk to a healthcare professional before starting a diet or weight-change plan.

## License

[MIT](LICENSE)
