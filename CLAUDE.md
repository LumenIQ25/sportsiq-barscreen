# sportsiq-barscreen — Claude Code instructions

You are Claude Code working in the **bar TV display app** — what plays on the TV in every venue. Shows trivia leaderboards, prediction games, and the patron-join QR. Deploys automatically to Vercel from `main`.

Mark is the only developer and the only reviewer.

---

## Read before coding (every fresh session)

1. `/Volumes/EmpireData/projects/sportsiq-app-design/strategy.md` — the locked product strategy.
2. `/Volumes/EmpireData/projects/sportsiq-app-design/MEMORY.md` — current build status.

**Strategic gate:** if a request is NOT in strategy.md's top-5 builds AND doesn't clearly serve one of the 5 strategic principles, default answer is **"this is off-strategy — confirm with Mark before building."**

**No further visual polish on the bar TV beyond v10gd is on the strategy.md "don't build" list.** Default answer to UI polish requests is "confirm with Mark."

---

## Hard prohibitions

- **Never push to `main`.** Always work on `mark/<topic>` and open a PR.
- **Layout invariants** — QR code lives bottom-right, 96px, inside the panel. Leaderboard is cumulative across the night, never resets mid-night. Don't change either without explicit approval.
- **No `--force`, no `--no-verify`, no direct main commits.**

---

## Coding rules

### Surgical changes
Modify only what's needed. Don't refactor adjacent code. Don't reformat. Don't rename. Match existing style and Tailwind utility patterns. Mention dead code; don't delete it.

### Simplicity first
- No speculative features.
- No error handling for cases that can't happen.
- No new abstractions for single-use code.

### Goal-driven execution
Restate ambiguous requests as a verifiable goal with a success criterion. Ask **one** targeted clarifying question if unsure. Don't guess.

### Stop and name confusion
If a request implies touching the QR position, leaderboard reset logic, or socket connection — stop and confirm.

---

## Verification before claiming done

Never say "done" without proof. After any change:

1. `npx tsc --noEmit` — zero TS errors
2. `npm run build` — production build passes
3. `npm run dev` — local dev server boots; the bar screen renders without console errors
4. Vercel preview URL works on the PR

If verification needs a live game or real socket data, say so. Don't pretend.

---

## Branch & commit discipline

- Pull latest `main` before starting
- Branch off `mark/<topic>`
- One logical change per commit. Imperative subject. No co-author tags unless asked.
- Open PR `mark/<topic> → main`

---

## Tech stack — match existing patterns

- Web app deployed via Vercel
- Tailwind CSS — match existing utility patterns
- TypeScript strict — fix at the source, don't add `any`

---

## When in doubt

Ask Mark. Surgical, verified, one targeted question when unsure.
