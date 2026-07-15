# ask-ai

A Grist custom widget built with `grist-widget-sdk`: an **AI chatbot** for
asking questions about your Grist data in natural language. It streams
answers with a rich chat UI (markdown, code blocks with syntax highlighting,
math, mermaid diagrams, reasoning traces, tool calls, and more) built on the
bundled `src/components/ai-elements/` library.

`src/App.tsx` declares `GRIST_OPTIONS` (`requiredAccess: "read table"`) and
renders `AiChatbot` (`src/components/ai-chatbot.tsx`) plus a `sonner`
`Toaster`. `AiChatbot` reads the selected table through the SDK, lets the
user point the widget at an AI gateway (OpenAI-compatible, or a Genial /
Artemis endpoint — detected from the API URL), stores that config in
`localStorage` under the `ask-ai:` namespace, and streams the model's
response with the [`ai`](https://www.npmjs.com/package/ai) SDK +
[`streamdown`](https://www.npmjs.com/package/streamdown).

`src/main.tsx` wraps the app with `GristWidgetProvider`, `GristBoundary`
(with a 4s unavailable grace so a slow handshake doesn't flash an error),
`GristSdkAlerts`, and a `TooltipProvider`. `GristSdkAlerts` maps
`getGristSdkAlertDescriptors()` from the SDK to shadcn `Alert`
(`src/components/grist-sdk-alerts.tsx` + `src/components/ui/alert.tsx`).

Opened outside a Grist iframe, `main.tsx` picks between two components purely
by URL shape (`src/lib/showcase-routing.ts`, no router needed): a bare path
with no recognized channel suffix renders `TemplateLanding` (its own hero,
onboarding, and released-version index); `/latest/`, `/dev/`, or
`/v<version>/` renders `ChannelNotice` instead — a distinct hero explaining
which build this is, chips to jump to any other version/channel
(`src/lib/showcase-versions.ts`), and a copy-this-URL helper for pasting into
Grist's custom widget field.

When actually embedded, `GristStatusChip` (`src/components/grist-status-chip.tsx`)
shows a small pill with live handshake status — connecting, retrying with a
countdown, connected, or unavailable — using `useAmbientGristHandshake()`
from `grist-widget-sdk/advanced`. It must be mounted *inside*
`GristWidgetProvider` (see `src/main.tsx`): it only observes that provider's
own handshake manager and never mounts a second one, so it's purely
observational and can never duplicate or race the real handshake.

- **ESLint** blocks direct `grist` global usage in `src/` — use the SDK only.
- `GRIST_OPTIONS` requests `read table` access with no required column
  mapping (the chatbot reads whatever table the widget is linked to), so
  `main.tsx` gates `GristBoundary` on `"ready"`. Handshake/link alerts use
  `GristSdkAlerts`.

To add widget tests later, see [Testing](https://github.com/ArthurBlanchon/grist-widget-sdk/blob/main/apps/docs/guide/testing.md) (`renderWithGrist` from `grist-widget-sdk/emulator/testing`).

## Deployment

A bundled GitHub Actions workflow (`.github/workflows/deploy.yml` +
`scripts/deploy.mjs`) publishes this widget to **your own** GitHub Pages.

### The workflow: always develop on `dev`, release by merging to `main`

1. Commit and push to the `dev` branch (created for you at scaffold time).
   Every push auto-deploys a live preview at `/dev/` that self-reloads
   inside an open Grist document a few seconds later — paste that URL into
   a Grist doc once, then just keep pushing while you iterate.
2. Ready to publish a release? **Bump `package.json`'s `version`** as part
   of your `dev` branch changes, then open a PR from `dev` into `main`.
3. **Merge the PR.** This is the step that actually publishes — merging to
   `main` builds immutable `/v<version>/` and updates mutable `/latest/`.

> ⚠️ **Merging without bumping the version publishes nothing.** The release
> build is idempotent — it skips whenever `package.json`'s version already
> has a matching `v<version>/` directory published, which is always true if
> you forgot to bump it (it'll match whatever's already live). The PR merges
> cleanly and CI runs "successfully," but `/latest/` silently stays exactly
> as it was. Bump the version *before* merging, not after.

After merging, keep committing to the same `dev` branch for your next round
of changes — it's the permanent working/preview branch for this widget, not
a one-off feature branch to delete and recreate. Deleting it retires `/dev/`
automatically.

> ⚠️ **Used GitHub's "Use this template" button instead of `npm create
> grist-widget`?** That path copies this repo's default branch verbatim —
> it doesn't run any of the CLI's own setup (renaming `package.json`,
> titles, etc.), and whatever version happens to be checked into the
> source repo's `package.json` (which can be well past `0.0.1`) comes along
> with it. **The moment the repo is created, GitHub's own initial push to
> `main` fires this workflow and publishes a clean `v0.0.1`** — your first
> release always resolves to `v0.0.1` regardless of what `package.json`
> says, so `/`, `/latest/`, and `/v0.0.1/` all go live right away (once
> you've done the one-time Pages setup below). You don't reset the version
> by hand: on that first release the pipeline also **rewrites
> `package.json`'s version back to `0.0.1` in the repo itself** (a commit it
> pushes to `main`/`dev`), so your *next* release naturally bumps to
> `0.0.2` instead of jumping to whatever inherited number you started with.
> If you also checked **"Include all branches"** (to get `gh-pages`/Pages
> already set up, no manual Settings step), that first release also clears
> out every leftover bit of inherited content it finds — stray
> `v<version>/` dirs, and a root/`latest/` still pointing at the *source*
> repo's own path — before writing its own. A `v<version>/` only counts as
> a genuine prior release once it carries a `showcase-meta.json` naming
> *this* repo, so on a repo with no genuine releases yet, everything else is
> provably inherited noise and gets safely replaced. On that same first
> release, every branch except `main`, `dev`, and `gh-pages` is pruned and
> `dev` is force-reset to match `main`'s tip — a fresh widget always starts
> from `main == dev`, whether it came from the CLI (already true) or a
> template copy (may have inherited a stray branch, or a `dev` full of the
> source template's own unrelated preview history). All of this only ever
> applies before your *first* genuine release — once one exists, it's
> permanently a no-op, so it's still safest to never manually re-seed
> `gh-pages` again after that point.

**One-time setup** (the workflow can't do this part for you):

1. **Settings → Pages** → Source: "Deploy from a branch" → branch `gh-pages`
   → `/ (root)`. The workflow creates the `gh-pages` branch itself the first
   time it runs (if it doesn't exist yet), but Pages needs to be pointed at
   it once.
   > ⚠️ **Not `main`.** If Pages is left on (or accidentally set to) `main`,
   > it serves this repo's raw, unbuilt source — including a script tag
   > pointing at `/src/main.tsx` — instead of the built site. The symptom is
   > a blank/black page with a 404 for `/src/main.tsx` in the browser
   > console, even though the workflow itself reports success (it pushed the
   > right build to `gh-pages`; Pages is just reading from the wrong place).
2. **Settings → Actions → General → Workflow permissions** → "Read and write
   permissions". New repos sometimes default the workflow's token to
   read-only, which would fail the push to `gh-pages` with a 403.
3. If the repo is private, set **Pages visibility to Public** — a widget
   embeds inside a Grist iframe, which needs a publicly reachable URL.

No manifest/widget-catalog file is generated — that's a multi-widget,
Grist-widget-repository concept this single-widget template doesn't need.
Paste your `/latest/` or `/v<version>/` URL directly into Grist's custom
widget URL field.
