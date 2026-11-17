# Turnaround Rehearsal

**Rehearse plant maintenance before the shutdown begins.**

A hands-on VR planning prototype for process-plant maintenance. Enter a process-unit section, approach the pump bay, and rehearse one supported pump-removal task. Discover where equipment, scaffolding and job timing conflict, then decide **Repair, Retain or Hold** using the recorded evidence.

**[Try the app](https://turnaround-rehearsal-start26.ijidai916269.chatgpt.site)** · **[Watch the 2:45 demo](https://www.youtube.com/watch?v=567y9deXW2o)** · **[Devpost](https://devpost.com/software/turnaround-rehearsal)**

## The problem

A maintenance plan can look workable on a schedule while leaving too little room to withdraw a pump assembly or carry out another job nearby. Discovering those clashes during a shutdown leaves crews making decisions under time pressure.

Turnaround Rehearsal makes one planning problem spatial and interactive: try the movement, inspect the contact or clearance, change the schedule, and review the consequences before confirming a handoff.

## What you can do

- Explore an authored process-unit section and follow an eye-level approach to the pump bay.
- Grasp the removal handle and pull the supported assembly until the evaluated contact point.
- Compare spatial clearance and schedule dependencies across eight planning starts.
- Confirm Repair, Retain or Hold, then inspect the saved, read-only evidence.
- Hear contextual guidance through server-side OpenAI speech when configured.

The application supports desktop interaction and an immersive WebXR workflow. The demo shows actual IWER Quest 3 simulator capture with scripted hand input.

## Run locally

Use **Node.js 24** and npm.

```sh
git clone https://github.com/ruhu-inc/turnaround-rehearsal.git
cd turnaround-rehearsal
npm ci
npm run dev
```

Open the local URL printed by Vite. The planning workflow runs without an API key. For optional local spoken guidance, set `OPENAI_API_KEY` in an ignored `.env.local` file and restart the development server. Keep it server-side; never put a key in a `VITE_` variable or commit it.

```sh
npm test
npm run build
npm run preview
```

`preview` serves the built client. Hosted live speech also requires the Worker endpoint, a server-side API secret and the `VOICE_BUDGET` D1 binding. Owner-specific hosting configuration is excluded from this repository.

Normal development startup and builds preserve the committed, reviewed GLB and material maps. Run `npm run assets` only when intentionally regenerating model assets, then review and validate the result.

## Code layout

| Path | Purpose |
| --- | --- |
| `src/` | Desktop/VR application, planning logic, interaction and development harnesses |
| `server/` | Speech endpoint and bounded usage handling |
| `scenarios.json` | Task geometry and schedule fixtures |
| `public/assets/`, `assets/materials/` | Reviewed plant model and original material maps |
| `tests/` | Planning, session, interaction, model and server tests |
| `scripts/` | Build, model export and validation tools |
| `drizzle/` | Voice-budget database schema |
| `public/licenses/` | Required dependency license notices |

Built with TypeScript, Vite, Meta Immersive Web SDK and its compatible Three runtime. IWER supplies the development simulator.

## Validation and scope

The published source passes **78 automated tests**, the production build, secret scanning and a publication check. GitHub Actions repeats those checks.

Physical Quest testing, independent first-use observation and practitioner review remain outstanding. This is a planning rehearsal prototype; its geometry and outcomes are not a substitute for site engineering, permits or operational authorization.

Internal specifications, submission documents, production transcripts, recordings and credentials are excluded from this public repository and its original publication history. Only this root README is approved as public project documentation.

To check publication boundaries and secrets locally, install [Gitleaks](https://github.com/gitleaks/gitleaks), then run:

```sh
npm run publication:check
npm run security:scan
```
