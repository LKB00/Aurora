# Aurora · prototype

**Live:** https://lkb00.github.io/Aurora/

A clickable prototype of Aurora: you ask for something, Aurora searches and phones businesses, and you land on a result with the evidence behind it. Built on the **Tattva** design system (`@tattva/ui`).
It starts on a new conversation with the request already written. Tap the iPhone suggestion, send it, and watch Aurora search, then land on the result: 5 confirmed stores. Everything is simulated: nothing here calls a real business, and the UI says so. Other journeys (no exact match, conflicting answers, follow-up calls, failures) are in the settings button, top right.

Run it: `npm install`, `npm run dev` → http://localhost:5190/. Tests: `npm test`. It deploys to GitHub Pages on every push to `main`.

---

# Aurora · design-system experiment

The same product (Aurora's results, evidence and follow-up flow) rebuilt on **Tattva** (`@tattva/ui` 0.29.1, https://lkb00.github.io/tattva/).
Nothing here calls a real business. All answers are scripted or recorded fixtures, and the UI says so.

Run it: `npm run dev` → http://localhost:5190/ (open at phone width). Tests: `npm test`.

## What is kept from the earlier app, and what is not
- **Kept (no visuals in it):** `src/types`, `src/logic` (evidence rules, wording), `src/data` (the three scenarios), `src/state` (one store) and their 89 tests.
- **Not kept:** every component, colour, size and layout. All screens are new and use only Tattva parts and tokens.

## Where each part of the product lives in Tattva
| Product need | Tattva part(s) |
|---|---|
| Conversation, request, "ask about this search" | `ThreadTemplate`, `MessageList`, `Message`, `Composer`, `SuggestionChips`, `AIDisclosure` |
| Search stages (discover → call → compare) | `StepTimeline`, `ShimmerText`, `Callout` (paused / failed / stopped) |
| Activity log, findings | `ActivityTrace`, `ChecklistRow`, `SectionLabel` |
| Outcome, "needs your decision" | `KeyTakeaway`, `Callout`, `EmptyState` |
| A business against the must-haves | `ResultCard` (facts + `Badge`), `Checkbox` (compare) |
| Evidence per requirement, call history | `Collapsible`, `CallRecord` (transcript), `ClaimCheck` (Aurora's unsourced claims) |
| Simulated / out-of-date marks | `DataFreshness` (`simulated`, `stale`) |
| Follow-up: choose, approve, wait, result | `Checkbox`, `FactList`, `ApprovalPrompt`, `StepTimeline`, `Receipt`, `BackgroundRunChip` |
| Compare | `ComparisonTable`, `Callout` |
| Change budget / importance | `Sheet`, `NumberField`, `SegmentedControl` |
| Prototype controls | `Sheet`, `TrayRow`, `SegmentedControl` |

**Colour roles follow Tattva's rules:** success = said by the business · unsure = partly known (conditional, awaiting, conflicting, out of date) · danger = evidence says not met · neutral = nothing known · info = another source reports it · celebrate = "meets your must-haves" (the one goal reached).

## Where Tattva did not fit (stand-ins and gaps)
1. **No plain card or surface.** `ResultCard` is used for businesses; no stand-in container was built.
2. **`ComparisonTable` becomes stacked cards below 600px.** On a phone you do not see two businesses side by side, so you scroll between them.
3. **`CallRecord` is made for people who run voice agents.** Used only for the transcript, without verdict, cost or consent fields, which would claim things we do not know.
4. **`ApprovalPrompt` has fixed labels (Approve / Deny).** "Deny" returns to choosing questions.
5. **`ConfidenceIndicator` was deliberately not used.** It would show a measured-looking level; the brief forbids invented confidence.
6. **A screen-title bar with a Back button is not a part.** `src/ui/Screen.tsx` builds it from `IconButton` and Tattva tokens only. It is a stand-in.
7. **Tattva has no "partly known" suitability tag beyond `Badge` tones**, so the wording does the work (Possible option, Not enough information).

## Not done
- Follow-up flows for the Dentist and Plumbing scenarios were not exercised.
- Not tested: real devices, screen readers, Safari or Firefox, dark mode, other colour themes.
- No desktop layout: wider windows show the same phone-width column.

## iPhone mockup frame

On a wide screen the app is shown inside an iPhone mockup (`src/device/`): bezel, Dynamic Island, iOS status bar, home indicator, side buttons. The app runs in an iframe of exactly 390×844, so it gets a real phone viewport and Tattva's sheets stay inside the screen. The frame reserves 54px at the top and 34px at the bottom through `--safe-top` / `--safe-bottom`. On a real phone or a narrow window (under 600px) the frame disappears and the app is full-screen. The frame is stand-in hardware, not part of Tattva; its device colours live only in `src/device/device.css`. Open `?embed=ios` to see the framed-size app without the frame.

## iOS behaviour

Beyond the look, the app moves like an iOS app (`src/ui/StackNavigator.tsx`, `src/ui/Screen.tsx`):

- **Push / pop:** a new screen slides in from the right on iOS's own easing curve while the screen below shifts a third of the way left and dims; going back reverses it. Every screen in the stack stays mounted, so scroll position is kept.
- **Edge swipe back:** drag from the left edge; the screen follows the finger and commits past a third of the width or a quick flick, otherwise it springs back.
- **Navigation bar:** 44pt, "‹ Previous screen" back button, large title that collapses into a small centred title as you scroll, hairline that appears only once content scrolls under the bar.
- **Sheets:** bottom sheets with a grabber and drag-to-dismiss (Tattva's Sheet), contained inside the device screen.
- **System details:** San Francisco system font, no tap flash, no double-tap zoom, no hover cursor, no page bounce.

Not done: on-screen keyboard that pushes the composer up, tab bar, pull-to-refresh, haptics, swipe actions on rows, Dynamic Type. The San Francisco font only renders on Apple devices.

## Scope notes

- **Commitments are out of scope.** Aurora sometimes arranges things on a person's behalf (an appointment, a promised visit). This prototype does not model that or any cancellation; it is a future opportunity, not something the research here could support.
- **Recorded scenarios.** The dates in the scenarios (3 November 2026) are a recording of an observed test, not current availability. Distances are straight-line estimates, business photos are unrelated stock images, and every call and answer is simulated.
