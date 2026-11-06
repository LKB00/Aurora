# Aurora · prototype

A clickable prototype of Aurora: you ask for something, Aurora searches and phones businesses, and you land on a result with the evidence behind it.

**Live prototype:** https://lkb00.github.io/Aurora/

## How to use it

Open it, tap the first suggestion (or the message bar), and press send. Aurora searches, calls and lands on a result. Open any business for the evidence, ask for a follow-up call, or compare businesses. The **DEMO** tag at the top right switches to other journeys: no exact match, conflicting answers, follow-up outcomes, and failure states.

Built on the Tattva design system (`@tattva/ui`). Best viewed in the phone frame it opens in.

## What is simulated

Nothing here calls a real business. Searches, calls and answers are scripted or recorded fixtures, and the prototype says so. Distances are straight-line estimates, business photos are unrelated stock images, and the scenario dates (3 November 2026) belong to a recorded test, not current availability. Commitments Aurora might make for a person (appointments, promised visits) are out of scope.

## Run it locally

```
npm install
npm run dev     # http://localhost:5190/
npm test
```

Image and data sources are listed in `src/assets/`.
