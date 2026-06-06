# Railpen Technical Challenge

## Overview

Single page with a multistep form, following the [provided spec](docs/Railpen_Technical_Interview_Test.pdf).

As per instructions, no AI coding tools used (unless the AI responses when Googling for examples and docs count).

## Setup

Initial decision:

1. Only HTML/CSS, served from a set of discrete endpoints that returned HTML for each stage.
2. HTML/CSS/JS, purely client-side, single index.html with some JS sprinkled in.
3. HTML/CSS/JS, purely client-side, but used a JS UI framework (SPA).
4. Combination of either 1 & 2 or 1 & 3

Landed on 2, easy setup and deploy, fewest moving parts (no server, no UI framework).

Wanted a robust development environment, so Vite + Vitest + Playwright + Typescript + Oxfmt + Oxlint.

> [!NOTE]
> ES2024 has been set as the target in the tsconfig, and when deciding whether to use web platform features, I have used [baseline compatibility](https://developer.mozilla.org/en-US/docs/Glossary/Baseline/Compatibility) up to "newly available" as a rough guide, which may potentially harm functionality in some older browsers. I have not used anything with limited availability.
