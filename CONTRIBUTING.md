# Contributing to Aeroline

Small, reproducible improvements are easier to review than broad retuning. Bug reports and documentation are welcome too.

## Start here

1. Follow the README setup using Node 24 or newer.
2. Read the architecture and driving-model guides before changing physics or networking.
3. Work against `dev` and target pull requests to `dev`. Do not push or merge to `main` or `stable` without the maintainer's explicit approval.
4. Describe the player-visible behavior before and after your change.

## Playtest reports

Use the bug form. Include car, map, mode, device/browser, assists, controls and reproduction steps. For lag, distinguish your own car/camera stuttering from other cars jumping around. Remove private information from recordings and logs.

## Code expectations

- Strict TypeScript; avoid `any` and unsafe casts.
- Reuse scratch vectors and buffers in physics/render loops. Dispose resources and listeners.
- Preserve keyboard, gamepad and touch access when changing UI.
- Add meaningful regression coverage for physics, race authority or state changes. Do not weaken assertions to make checks pass.
- From `source/`, run `npm run check:web`, `npm run build` and `npm --prefix server run build`. Report full-suite Android packaging failures honestly when applicable.
- Include actual screenshots for UI changes and same-input comparisons for handling changes. State assist settings.
- Keep code and player-facing text in English. Never commit credentials, signing keys or private playtest data.

## Assets

Record author, source URL, license and modifications for imports. Music labeled “no copyright” is not automatically licensed for game redistribution. Retain notices and review `docs/ASSET-LICENSING.md`.

Explain the problem, change, verification and remaining limitations in your pull request. There is no guaranteed review or release timetable.
