# Big Green Arrow: Product Spec

**Status:** Draft v0.5
**Date:** 2026-10-21
**Owner:** Devank Nassa

---

## 1. Summary

Big Green Arrow is a mobile weight tracker that ignores the day-to-day noise of the scale. It shows a **trend weight** (a rolling average) and the **rate of change** of that trend. The main screen is one large arrow, and its direction and color tell you right away whether your trend is moving the right way at a healthy pace for your goal.

A single scale reading is a snapshot. Water, sodium, glycogen, digestion, and time of day can move it by 1–2 kg in a day. The trend is what matters.

## 2. Problem

- Daily scale readings are noisy. People overreact to them by panicking, crash dieting, or giving up.
- Moving weight **too fast** in either direction has real costs:
  - **Cutting too fast** loses more lean mass, hurts performance and recovery, and makes rebound more likely.
  - **Bulking too fast** adds a lot of fat for little extra muscle.
- Most weight apps show the raw number, or a chart with no judgment attached. They don't answer the question users actually have: *"Am I on track, and is my pace right?"*

## 3. Goals and Non-Goals

### Goals
1. Answer "am I on track?" in under a second, from the arrow alone.
2. Logging a weigh-in takes under 5 seconds.
3. Treat both directions of "wrong" as wrong: a trend that goes the wrong way *and* a trend that goes the right way too fast.
4. Let users tune what "optimal" means for them in settings.
5. Private by default: data stays on the device, and no account is needed.
6. Use the weight data already in Apple Health / Health Connect, so smart-scale users never have to type a number.
7. **Free.** No ads, no in-app purchases, no subscriptions, no paywalled features. No backend, so running costs stay at zero.

### Non-Goals (v1)
- Calorie or macro tracking, food logging
- Workout tracking
- Social features, sharing feeds, leaderboards
- Cloud accounts or multi-device sync
- Medical advice or diagnosis

## 4. Target Users

| Persona | Goal | What they need |
|---|---|---|
| **The Cutter** | Lose fat, keep muscle | Reassurance during flat or noisy weeks, and a warning when loss is too aggressive |
| **The Lean Bulker** | Gain muscle, limit fat | A brake when the scale climbs too fast |
| **The Maintainer** | Hold a weight after a diet | An early warning when weight drifts outside a band |

## 5. Core Concepts

### 5.1 Weigh-in
A raw scale reading with a timestamp. Stored in kg internally and displayed in the user's unit.

### 5.2 Trend Weight
A smoothed estimate of "true" weight. Default algorithm: a **time-aware exponential moving average (EMA)**. It handles missed days correctly, which a simple N-day average does not.

```
On each new weigh-in w at time t (days since previous weigh-in = Δd):

  α_eff  = 1 − (1 − α)^Δd           // decay scales with the gap
  trend  = trend_prev + α_eff × (w − trend_prev)

Seed: trend_0 = first weigh-in
Default α = 0.10  (Hacker's Diet style; roughly a 10–20 day memory)
```

Selectable in settings:
| Method | Notes |
|---|---|
| EMA (default) | Smooth, handles gaps, responds steadily |
| Simple moving average (7 / 14 / 21 days) | Easiest to understand, but lags more and jumps when an old value drops out of the window |

**Multiple weigh-ins on one day:** use the **first** one of the day by default, since morning fasted weight is the most consistent. Setting: `first | last | average`.

### 5.3 Rate of Change
The slope of the trend line, expressed as **% of body weight per week** by default. A percentage scales fairly for a 55 kg person and a 120 kg person. Users can switch the display to kg/week or lb/week.

```
slope_per_day = linear regression of trend values over the lookback window
rate_%bw_wk   = (slope_per_day × 7) / current_trend × 100

Default lookback window = 14 days (setting: 7 / 14 / 21 / 28)
```

### 5.4 Goal
| Goal type | Meaning |
|---|---|
| `lose` | Reduce weight toward a target |
| `gain` | Increase weight toward a target |
| `maintain` | Stay within ± a band around a target |

Target weight is optional for `lose` and `gain`. When it is set, the app shows the estimated time to reach it at the current rate.

## 6. The Arrow (Core Feature)

### 6.1 Arrow States
The arrow's state comes from **goal type + rate zone**.

**The user chooses their own optimal pace.** During onboarding they set an optimal range (min–max % BW/week), and they can change it in Settings at any time. The other zones are derived from it:

| Zone | Boundary |
|---|---|
| Maintenance (dash) | ± maintenance band (default ±0.15, adjustable) |
| Slow (right direction) | between the maintenance band and the user's optimal **min** |
| Optimal | between the user's optimal **min** and **max**. The min can't be inside the flat band |
| Too fast | beyond the user's optimal **max** |
| Slow (wrong direction) | between the maintenance band and the **red threshold** on the wrong side |
| Wrong way | beyond the **red threshold** on the wrong side |

The **red threshold** is set by the user (Settings → Pace). By default it equals the user's optimal min, mirrored to the wrong side. A user who wants a stricter alarm can lower it, for example to 0.2% so that small gains on a cut show red sooner. A user who finds red too stressful can raise it. It can never be set below the maintenance band.

**Color language** (the same for every goal):
| Color | Meaning |
|---|---|
| 🟢 **Big green** | Right direction at the right pace. Celebrate |
| 🟩 Light green | Right direction, but slow |
| ⚪ Gray dash | Flat |
| 🟥 Light red | Wrong direction, but slow |
| 🔴 Red | Wrong direction, clearly |
| 🟠 Amber | Right direction, but too fast |

The tables below use example ranges of 0.5–1.0% (lose) and 0.25–0.5% (gain). They are only examples; the user's values replace them.

#### Goal = `lose`
| Rate (% BW / week) | State | Visual |
|---|---|---|
| > +0.50 | **Wrong way** | 🔴 Red arrow pointing up |
| +0.15 … +0.50 | **Slow gain (wrong way)** | 🟥 Light red arrow angled up |
| −0.15 … +0.15 | **Maintenance** | ⚪ Gray dash ( — ) |
| −0.50 … −0.15 | **Slow loss** | 🟩 Light green arrow angled down, no celebration |
| −1.00 … −0.50 | **Optimal** | 🟢 **Big green arrow** pointing down, with celebration |
| < −1.00 | **Too fast** | 🟠 Amber arrow pointing steeply down, with a warning |

#### Goal = `gain` (mirror of `lose`)
| Rate (% BW / week) | State | Visual |
|---|---|---|
| < −0.25 | **Wrong way** | 🔴 Red arrow pointing down |
| −0.25 … −0.15 | **Slow loss (wrong way)** | 🟥 Light red arrow angled down |
| −0.15 … +0.15 | **Maintenance** | ⚪ Gray dash |
| +0.15 … +0.25 | **Slow gain** | 🟩 Light green arrow angled up, no celebration |
| +0.25 … +0.50 | **Optimal** | 🟢 **Big green arrow** pointing up, with celebration |
| > +0.50 | **Too fast** | 🟠 Amber arrow pointing steeply up, with a warning |

#### Goal = `maintain`
For `maintain`, "flat" is the goal, so the celebrating arrow points **sideways** (→) instead of showing a dash.

| Condition | State | Visual |
|---|---|---|
| Trend within ± band (default ±1.5%) of target **and** rate within ± maintenance band | **On target** | 🟢 **Big green arrow pointing sideways (→)**, with celebration |
| Trend inside band but drifting (rate beyond the maintenance band) | **Drifting** | 🟥 Light red arrow angled in the drift direction |
| Trend outside band and moving further away | **Off target** | 🔴 Red arrow angled away from target |
| Trend outside band but moving back toward target | **Returning** | 🟩 Light green arrow angled toward target |

### 6.2 Arrow Angle
The arrow always points to the right, like a trend line read left to right. Its **angle maps continuously to the rate**: horizontal (→) is flat, the optimal max sits at 60°, and the arrow points straight up or down at 1.5× the optimal max or faster. (For `maintain`, straight up or down is 1% BW/week.) A faster rate gives a steeper arrow, so the arrow carries information instead of being just a few fixed icons. The `maintain` goal's on-target arrow sits at or near horizontal.

### 6.3 Hysteresis (prevent flicker)
When the rate sits near a zone boundary, the state could flip every day. Rules:
- A state change needs the rate to pass the boundary by **≥ 0.05% BW/week**, **or** to stay past it for **2 consecutive weigh-ins**.
- The celebration animation plays only on a **transition into** Optimal (or On target for `maintain`), plus at most once per day on the first app open while in that state.

### 6.4 Calibrating State
The arrow needs enough data before it can mean anything.
- With fewer than **5 weigh-ins** or less than **7 days** of history, show a **gray outlined arrow** labeled *"Calibrating: 3 of 5 weigh-ins"*.
- If the lookback window has fewer than 4 weigh-ins (sparse logging), show the arrow at reduced opacity with *"Low confidence: log more often"*.

### 6.5 Celebration
- **Optimal / On target:** the arrow pulses, then a short burst of confetti or particles, plus a haptic "success" tap.
- **Streak:** a counter of consecutive days in Optimal (for example, "🔥 12 days on pace"), or On target for `maintain` (for example, "🔥 40 days holding steady").
- **Too fast:** never celebrated. Show a supportive message instead, such as *"You're losing faster than your 1%/week limit. Consider eating a bit more to protect muscle."* (the number shown is the user's own optimal max).

## 7. Screens

### 7.1 Home
```
┌─────────────────────────────┐
│                             │
│            ↘                │  ← the arrow (about 50% of screen)
│        (big green)          │
│                             │
│     Trend: 82.4 kg          │
│     −0.7% / week  ✓ Optimal │
│                             │
│   Today's scale: 83.1 kg    │  ← de-emphasized (smaller, gray)
│   🔥 12 days on pace         │
│   ~9 weeks to 78 kg          │
│                             │
│        [ + Log weight ]     │
└─────────────────────────────┘
```
- The scale weight is visually secondary on purpose.
- Optional setting: **"Hide scale weight"**, which shows only trend and rate. This helps users who find raw numbers stressful.

### 7.2 Log Weight
- Opens with a number pad pre-filled with the last value, so a typical entry only changes the last 1–2 digits.
- Date and time default to now. A day stepper (‹ Today ›) handles back-dated entries, keeping the current time of day. A full date/time picker can come later.
- −/+ buttons step the value by 0.1. A decimal comma is accepted as well as a point.
- Values outside 20–400 kg are rejected as typos.
- Optional note.
- **Outlier check:** if the entry differs from the trend by more than 3%, ask *"That's a big jump from your trend. Save anyway?"* to catch typos such as 8.24 vs 82.4.
- If Health write-back is on, the manual entry is also written to Apple Health / Health Connect (see §8).

### 7.3 Chart
- Raw weigh-ins as faint dots and the trend as a bold line.
- A shaded **"optimal corridor"** projected forward from the start of the current window, showing where the trend would be at the min and max optimal rates.
- Target weight shown as a horizontal line.
- Range selector: 2W / 1M / 3M / 6M / 1Y / All.
- Background tinted by arrow state over time, so you can see which periods were on pace.

### 7.4 History
- A reverse-chronological list showing date, scale weight, trend at that point, and the difference from trend.
- Tap a row to edit it (weight, day, note), exclude it from the trend, or delete it (with confirmation). Swipe actions can be added later as a shortcut. All trend values after the edited date are recomputed.
- Each entry shows a small source badge (manual, Apple Health, Health Connect, import). Entries that came from Health can be **excluded** but not edited, because Health owns that data.

### 7.5 Settings
| Section | Setting | Default |
|---|---|---|
| **Goal** | Goal type | `lose` |
| | Target weight | (none) |
| | Maintain band | ±1.5% |
| **Pace** | Optimal range: min and max (% BW/week), set per goal type | chosen by user in onboarding |
| | Maintenance band (the dash zone) | ±0.15% BW/week |
| | Red threshold: how far the trend can move the wrong way before the arrow turns from light red to red (slider from the maintenance band up to 2.0, in 0.05 steps) | same as the optimal min |
| | Rate display unit | % BW/week |
| **Trend** | Smoothing method | EMA |
| | EMA α or SMA window | 0.10 / 7 days |
| | Slope lookback window | 14 days |
| | Same-day weigh-in rule | first |
| **Display** | Units | kg / lb (from locale) |
| | Hide scale weight | off |
| | Celebrations (animation and haptics) | on |
| **Reminders** | Daily weigh-in reminder | on, 07:00 |
| **Data** | Import CSV, Export CSV, Delete all data | (none) |
| **Health** | Read weight from Apple Health / Health Connect | on if permission granted |
| | Write manual entries back to Health | on |
| | Re-import full history | (action) |

#### 7.5.1 Choosing a pace
The user sets their own optimal range; the app does not impose a default. The pace picker has:
- **Two sliders** (min and max, in % BW/week) on a scale from 0 to 2.0, in 0.05 steps.
- **Live translation** next to the sliders, in the user's own numbers. Example: *"At 82 kg, that's 0.41–0.82 kg per week"* and *"~9–18 weeks to 78 kg"*.
- **Optional quick-pick chips** that only fill in the sliders and can be adjusted afterward. They are labeled *Gentle* (lose 0.25–0.5 / gain 0.15–0.25), *Moderate* (lose 0.5–1.0 / gain 0.25–0.5), and *Fast* (lose 0.75–1.25 / gain 0.5–0.75).

#### 7.5.2 Over-1% warning
If the optimal **max** is set above **1.0% BW/week in either direction** (lose or gain):
- The slider track past 1.0% turns amber while dragging.
- On save, a confirmation dialog appears:
  - **Lose:** *"Losing more than 1% of your body weight per week increases muscle loss and makes it harder to keep the weight off. Keep this pace?"*
  - **Gain:** *"Gaining more than 1% of your body weight per week usually adds mostly fat rather than muscle. Keep this pace?"*
  - Buttons: **Keep it** / **Go back to 1%**
- After the user confirms, a small amber caution tag ("Above 1%/week") stays next to the pace in Settings and on the chart's optimal corridor. The app does not keep nagging after that.
- The warning comes back if the user changes the pace again.

### 7.6 Onboarding (5 short screens)
1. "The scale lies day to day. The trend doesn't." (short explanation with an animated example)
2. **Connect Health.** Ask for Apple Health / Health Connect permission to read weight. If the user grants it, import their history. If that history is long enough, the arrow skips the calibrating state and is live right away.
3. Choose a goal (lose / gain / maintain) and optionally a target.
4. **Choose a pace** (see §7.5.1), with the over-1% warning if it applies (§7.5.2). Skipped for `maintain`, which asks for a band instead.
5. Units, plus current weight if Health returned nothing (this becomes the first weigh-in). Then turn on reminders. Smart-scale users get a "remind me only if no weigh-in synced by 10:00" option.

## 8. Health Integration

| Platform | API | Data type |
|---|---|---|
| iOS | Apple HealthKit | `HKQuantityTypeIdentifierBodyMass` |
| Android | **Health Connect** | `WeightRecord` |

> **Note on Google Fit:** Google has deprecated the Google Fit APIs in favor of Health Connect. Google Fit, Samsung Health, Withings, Fitbit, and most smart-scale apps write their data into Health Connect, so reading from Health Connect gets Google Fit weight data and more.

### 8.1 Read
- **Permissions:** read body weight only. The app asks for nothing else.
- **First connection:** import all available weight history.
- **Ongoing sync:** pull new samples each time the app comes to the foreground. On iOS, also use a HealthKit background observer so the widget and reminders stay current. On Android, use the Health Connect changes token to fetch only what changed.
- **Deduplication:** each Health sample is stored with its external ID. Re-syncing never creates duplicates. Samples deleted in Health are also deleted locally.
- **Multiple sources** (for example, a smart scale *and* manual entries in Health): the same-day rule (§5.2) picks one value per day.

### 8.2 Write
- Manual entries are written to Health as body-weight samples (when write-back is on).
- The app records the external ID it gets back. When that sample comes back in a later sync, the app recognizes it as its own and does not import it twice.

### 8.3 Permission denied or revoked
- The app works fully with manual entry only.
- Settings shows "Health: not connected", with a button that opens the system permission screen.
- Data already imported is kept, and the user can delete it.

## 9. Data Model

```ts
WeighIn {
  id: uuid
  timestamp: ISO8601 (with tz offset)
  weightKg: number           // canonical storage unit
  source: 'manual' | 'apple_health' | 'health_connect' | 'import'
  externalId?: string        // HealthKit UUID / Health Connect record id
  originApp?: string         // e.g. "Withings", "Google Fit" (shown in History)
  note?: string
  excluded: boolean          // user-flagged outlier; ignored by trend
}

Goal {
  type: 'lose' | 'gain' | 'maintain'
  targetKg?: number
  targetBandPct: number      // maintain: ± % of target that counts as on target, default 1.5
  startedAt: ISO8601
  optimalMinPct: number      // user-chosen, % BW/week (magnitude)
  optimalMaxPct: number
  flatBandPct: number        // dash zone, default 0.15
  redThresholdPct?: number   // light red → red boundary on the wrong side; unset = optimalMinPct
  aboveLimitAcknowledged: boolean // user confirmed the >1%/week warning
}

Settings {
  unit: 'kg' | 'lb'
  smoothing: { method: 'ema', alpha: number } | { method: 'sma', windowDays: number }
  slopeLookbackDays: 7 | 14 | 21 | 28
  sameDayRule: 'first' | 'last' | 'average'
  hideScaleWeight: boolean
  celebrations: boolean
  reminder: { enabled: boolean, time: 'HH:mm', onlyIfNoSync: boolean }
  health: { read: boolean, writeBack: boolean, lastSyncToken?: string }
}
```

Trend values are **derived**. They are recomputed from weigh-ins and cached, never treated as the source of truth, so any edit, delete, or settings change recomputes them correctly.

## 10. Edge Cases

| Case | Behavior |
|---|---|
| Long gap (for example, a 2-week vacation) | Time-aware EMA handles it. After a gap longer than 7 days, show a "Welcome back" message and mark the arrow low-confidence until 3 new weigh-ins |
| Back-dated entry | Insert in order and recompute the trend from that point |
| Unit switch | Display only. Stored data is unchanged |
| Goal changed mid-way | Keep history. Zones switch immediately and the chart marks the goal change |
| Target reached | Prompt: "You hit your target 🎉 Switch to maintain?" |
| Clear typo (more than 3% off trend, or physiologically implausible) | Confirm before saving. The entry can be flagged `excluded` later |
| Daylight saving or timezone travel | Group days by the local calendar date at the time of the weigh-in |
| Smart scale logs someone else's weight (shared scale) | Outlier check flags it. The user can exclude it, and can also exclude a whole source app in Settings |
| Health sample edited or deleted in another app | Mirrored on the next sync, and the trend is recomputed |

## 11. Non-Functional Requirements

- **Platforms:** iOS 16+ and Android 10+
- **Offline-first:** works fully without network
- **Privacy:** no analytics in v1 unless they are opt-in. Health data never leaves the device except through user-initiated export
- **Performance:** cold start to arrow in under 1.5 s. Full trend recompute for 5 years of daily data (about 1,800 points) in under 50 ms
- **Accessibility:** arrow states must not rely on color alone. Shape and angle differ, and each state has a text label and screen-reader description (for example, "Optimal loss, down 0.7 percent per week"). Support Dynamic Type. Use a colorblind-safe palette. Red vs. green is the classic colorblind problem, so the light and full tints must also differ in brightness, and the red arrows use a different fill (outlined, or with a ✕ badge) from the green ones
- **Localization-ready:** all strings externalized, and locale-aware number formatting (decimal comma)
- **Cost:** free to users and free to run. No servers, no third-party paid services. The only costs are store fees (Apple Developer Program, Google Play registration)
- **Open source:** the code is public on GitHub under the **MIT License** (see §13.1)

## 12. Disclaimers and Safety
- Show a clear "not medical advice" note in onboarding and on the About screen.
- Warn when the optimal pace max is above 1% BW/week in either direction (§7.5.2).
- Never show celebration visuals for the "too fast" state.

## 13. Tech Stack (decided)

| Concern | Choice | Why |
|---|---|---|
| Framework | **Expo (React Native) + TypeScript**, using **development builds** (not Expo Go) | One codebase for iOS and Android. Development builds are needed for the native HealthKit and Health Connect modules |
| Navigation | `expo-router` | File-based routing, standard for Expo |
| Storage | `expo-sqlite` | Local, reliable, easy CSV import and export |
| Arrow, charts, confetti | `@shopify/react-native-skia` + `react-native-reanimated` | GPU-drawn custom arrow, smooth angle animation, particles |
| Apple Health | `@kingstinct/react-native-healthkit` | Actively maintained, TypeScript-first, has an Expo config plugin, supports background observers |
| Health Connect | `react-native-health-connect` + `expo-health-connect` config plugin | Standard Health Connect binding for React Native |
| Notifications | `expo-notifications` | Local daily reminders, no push server needed |
| Haptics | `expo-haptics` | Celebration tap |
| Widgets (v1.1) | iOS: WidgetKit (Swift) via `expo-apple-targets`; Android: `react-native-android-widget` | Widgets have to be native on iOS |
| Testing | Jest for the trend and zone engine; Maestro for end-to-end flows | The math is the product. It must be correct |
| Builds | EAS Build (free tier) | Can build iOS apps without owning a Mac |

The **trend and arrow engine** is a pure, framework-agnostic TypeScript module (`weighIns + settings → trend series + rate + arrowState`) with no React or native imports. That makes it easy to test and to reuse in widgets.

### 13.1 Open Source
- **License: MIT.** It is simple and widely understood, and it is compatible with App Store distribution. (GPL has known conflicts with Apple's App Store terms.)
- **No secrets in the repo.** There are no API keys, because there is no backend. Signing credentials live only in EAS, never in git.
- **CI:** GitHub Actions (free for public repos) runs type checks, lint, and the engine's unit tests on every pull request.
- **Repo files:** `README.md`, `LICENSE`, `CONTRIBUTING.md`, `SECURITY.md` (how to report a vulnerability privately), and issue and pull-request templates.
- **Privacy statement:** the README and the store listing say plainly that no data leaves the device, and that anyone can check this in the code.

## 14. Roadmap

### MVP (v1.0)
- Manual logging, history edit and delete
- **Apple Health and Health Connect: read, write-back, history import, deduplication**
- EMA trend, rate, arrow with all states, hysteresis, calibrating state
- Home, Log, Chart, History, Settings, Onboarding
- User-chosen pace with the over-1% warning
- Daily reminder (with "only if no sync")
- CSV import and export

### v1.1
- Home-screen widget showing the arrow
- Streaks and milestone celebrations

### Later
- Apple Watch and Wear OS complication
- Optional encrypted cloud backup
- Body-fat % trend, if the scale provides it
- Diet-phase planning (for example, "12-week cut then 2-week diet break")

## 15. Success Metrics
The app has no analytics, so these can only be measured through opt-in feedback or store reviews. They describe what "working" means:
- Users who log 5 or more weigh-ins are still logging at day 30
- Median log time under 5 s
- Weekly-active users open the app 4 or more days per week

## 16. Decisions Log
| Date | Decision |
|---|---|
| 2026-10-21 | Stack: Expo + TypeScript with development builds |
| 2026-10-21 | Health data: Apple HealthKit + Health Connect (replaces the deprecated Google Fit APIs) in the MVP |
| 2026-10-21 | Pace: chosen by the user, no imposed default. Warn above 1% BW/week in either direction |
| 2026-10-21 | Business model: completely free, no ads or IAP, no backend |
| 2026-10-21 | Name: "Big Green Arrow" |
| 2026-10-21 | `maintain` goal: the celebrating big green arrow points sideways (→) when on target |
| 2026-10-21 | Slow movement gets light tints: light green when slow in the right direction, light red when slow in the wrong direction |
| 2026-10-21 | Open source under the MIT License |
| 2026-10-21 | Flat (dash) zone is ±0.15% BW/week by default and adjustable |
| 2026-10-21 | Red threshold (light red → red) is set by the user. Default: the optimal min, mirrored |
| 2026-10-21 | Arrow angle: optimal max at 60°, vertical at 1.5× optimal max. Time-to-target hidden while flat |
| 2026-10-21 | Storage: SQLite (`expo-sqlite`), schema versioned with `PRAGMA user_version`. Preferences stored as JSON values per key |
| 2026-10-21 | The rate is hidden while calibrating; a rate from a few points is noise |

## 17. Open Questions
1. **Optimal / On target celebration animation:** the owner wants to redesign it (deferred, 2026-10-21). The current pulse in `src/components/trend-arrow.tsx` and the confetti described in §6.5 are placeholders until then.
