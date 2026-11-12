# ask-ai-widget

A Grist custom widget: a chatbot that answers questions about the selected
table, with streamed answers (markdown, code, math, mermaid diagrams). It
talks to an AI gateway you configure in the widget: OpenAI's API, or any
OpenAI-compatible endpoint. The gateway URL and key stay in your browser's
`localStorage`, never in the Grist document.

<!-- install-url:start -->
**Install URL**, to paste into a Grist custom widget's URL field: <https://arthurblanchon.github.io/ask-ai-widget/latest/>
<!-- install-url:end -->

**Try it:** <https://arthurblanchon.github.io/ask-ai-widget/latest/demo/>, Grist running in your browser with sample data (nothing is saved).

## In Grist

Add a custom widget, paste the install URL, and set its access level to
**Read selected table**.

It has no columns to map: it reads the whole table the widget section shows.

## Code

The widget's own code is in `src/`:

- `src/app/App.tsx` exports `GRIST_OPTIONS` (no mapped columns: it reads the
  whole selected table) and renders `src/components/ai-chatbot.tsx`.
- The chat UI is built from `src/components/ai-elements/`, with the
  [`ai`](https://www.npmjs.com/package/ai) SDK and
  [`streamdown`](https://www.npmjs.com/package/streamdown).

## Develop

Develop on the `dev` branch; every push deploys `/dev/`
(<https://arthurblanchon.github.io/ask-ai-widget/dev/>), which reloads itself in an
open Grist document a few seconds later.

| | |
| --- | --- |
| Install | `pnpm install` |
| Test (emulated Grist, no browser) | `pnpm test` |
| Lint, type-check, build | `pnpm lint`, `pnpm typecheck`, `pnpm build` |
| The widget in a real local Grist (Docker) | `pnpm demo` |
| Regenerate the demo page | `pnpm demo --save` |

`src/main.tsx` is one `mountGristWidget()` call from `grist-widget-sdk/app`:
inside Grist it renders the widget behind the SDK's connection and
column-mapping screens, with its alerts, in Grist's light or dark theme.
Opened anywhere else, it shows which build this is and the URL to paste into
Grist. The widget's code reads Grist only through `grist-widget-sdk`
([docs](https://gristwidgets.com/docs)), never the `grist` global.

`src/main.tsx`, the workflows and the build config are the template's: they
come from `create-grist-widget`, and `pnpm exec create-grist-widget upgrade`
(run on `dev` after Dependabot updates it) rewrites them
([Upgrading a widget](https://gristwidgets.com/docs/cli/upgrading)).
`AGENTS.md` says which files are which.

## Release

1. On `dev`, bump `package.json`'s `version`.
2. Open a pull request from `dev` into `main`, and merge it once its checks
   are green.

Merging builds `/v<version>/` and updates `/latest/` and their demo pages.
Without a version bump, nothing is published. The deploy workflow and its
one-time repository settings are described in the
[template's README](https://github.com/ArthurBlanchon/grist-widget-template#deployment).
