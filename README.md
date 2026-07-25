# Quorum — Fintech Design Challenge

Quorum is a working product concept for planning group experiences without
forcing friends to disclose their individual financial limits.

The project combines two connected experiences:

- `/` — an interactive case study with a scroll-driven Macintosh entrance and
  horizontal presentation sequence.
- `/prototype` — a responsive mobile product prototype for creating a group,
  choosing its visual identity, inviting friends, joining through a link, and
  reviewing a shared plan.

## Product premise

Group plans often begin with a socially difficult question: “What can everyone
afford?” Quorum collects personal constraints privately and surfaces only the
options that work for the group.

This prototype focuses on the first moments of that experience:

1. Create or join a group.
2. Name the occasion and choose a visual vibe.
3. Invite friends through a shareable link.
4. Continue into a private group-planning flow.

## Run locally

Requires Node.js `>=22.13.0`.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) for the case study or
[http://localhost:3000/prototype](http://localhost:3000/prototype) for the
working prototype.

## Validation

```bash
npm run lint
npm run build
```

## Stack

- React 19
- Next.js 16
- Vinext and Vite
- TypeScript
- CSS Modules
- GSAP for the CRT text treatment

## Repository guide

- `app/page.tsx` — case-study experience and scroll choreography
- `app/prototype/page.tsx` — interactive Quorum product flow
- `app/prototype/prototype.module.css` — responsive product styling
- `public/` — project fonts and visual assets
- `design-qa.md` — visual, responsive, interaction, and regression checks

The repository also includes captured comparison images used during visual QA.
