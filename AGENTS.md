# twenty-retell-sync: "Retell Sync for Twenty", a Twenty App that keeps Retell AI and Twenty CRM in sync through their APIs alone

Generic and customer-agnostic. Goal: replace third-party glue (n8n, Zapier, Make) with one installable
Twenty App. Install it, set the Retell key, and calls and SMS chats flow into Twenty and stay in sync.
Usage: `README.md`. Design notes (`docs/`) and saved vendor docs (`reference/`) are kept locally and are not in the public repo.

## Commands

- local Twenty: `yarn twenty docker:start` (needs Docker), then `yarn twenty apply` to sync the app
- unit tests: `yarn test:unit`. Integration tests: `yarn test` (hits the local server, see rules)
- typecheck / lint: `yarn typecheck` / `yarn lint`
- run the pull sync by hand: `POST http://localhost:2020/s/retell/sync` with the local dev API key
  (`dev:function:exec` fails auth on this setup)
- release: raise `version` in `package.json`, commit, push tag `vX.Y.Z`. `.github/workflows/publish.yml` publishes to npm
  (trusted publishing, provenance) and creates the GitHub release; servers pick it up from the marketplace catalog (hourly sync
  or Admin Panel > Apps > Synchronize catalog). A private deploy to one server without npm is still
  `yarn twenty app:publish --private -r server` + `app:install -r server`.
- GitHub page: `.github/README.md` (images allowed). The root `README.md` is the marketplace About tab and npm readme (text only).
- new entity: `yarn twenty dev:add <type>` (generates ids); all uuids must be v4

## Code map

- `src/logic-functions/retell-webhook.ts`: push path. `sync-retell-cron.ts` (5-minute tick, honours the interval from settings)
  and `sync-retell.ts` (manual route): pull path.
- `retell-resync.ts`: the Resync button. `run-sync.ts` holds the job (`startResync`, `stepResync`): forced re-read of the last N days with its
  own cursor in `kv`, one 50-item chunk per kind per cron tick, state in `resync:job`.
- `retell-status.ts`, `retell-settings.ts`, `retell-connect.ts`: routes behind the Retell settings tab. The Retell key never
  reaches a front component, so the tab only calls these.
- `src/front-components/retell-settings.front-component.tsx` + `src/settings-menu-items/`: the Retell tab. Settings
  (interval, public URL, agents) live in `kv` (`src/lib/settings-store.ts`).
- `src/front-components/transcript.front-component.tsx` (UI in `src/components/transcript-view.tsx`) + `src/page-layout-tabs/`:
  the Summary tab (summary, then recording player and transcript) on the call and chat record pages, at position 15 between
  Home (10) and Timeline (20). A tab added to the page layout Twenty generates for our objects. It reads the record with `CoreApiClient`.
- `src/lib/dnc.ts` (pure decisions) + `dnc-sync.ts`: do-not-call mirror on Person (`retellDoNotCall*`, `retellContactId`) and
  `retellLastContactedAt`. Retell side: call `disconnection_reason`, `list-contacts` reconcile on every sync. Twenty side:
  `retell-dnc-changed.ts` (`person.updated` trigger) and `retell-set-dnc.ts` (workflow step). App writes always carry
  `retellDoNotCallAt`; the trigger skips those, which is what stops the echo.
- `src/lib/call-outcome.ts` (pure): `connection`, `transferred` and `latencyP50Ms` on a call, derived from `disconnection_reason` and
  `latency.e2e.p50`; a reason without a documented status maps to null. `src/page-layouts/retell-analytics.page-layout.ts` +
  `src/navigation-menu-items/retell-analytics.navigation-menu-item.ts`: the Retell Analytics page (Calls and Chats tabs, native chart
  widgets, `STANDALONE_PAGE` + `PAGE_LAYOUT` sidebar item, every widget limited to the last 30 days by `PERIOD_DAYS`). No front component.
- Actions for Twenty's AI and workflows (#17): one logic function carries both `toolTriggerSettings` (AI chat, MCP, shown as
  `app_<name>`) and `workflowActionTriggerSettings`. `retell-get-call` (refresh one call), `retell-set-dnc`,
  `retell-call-person` and `retell-send-sms` (real call / SMS chat: request built in `src/lib/outbound.ts`, defaults for number and
  agent on the Retell tab). `src/skills/retell.ts`: the skill that teaches Twenty's AI these tools and workflow recipes.
  Twenty has no app-side "needs approval" flag; the model asks via `propose_tool_call` when the tool description says so.
- `src/lib/`: pure logic (signature, phone matching, mapping, sync loop) plus `store.ts`, the only file that writes to Twenty.
- Marketplace listing: `README.md` is the About tab (markdown only, images do not render there). Logo and gallery live in
  `public/` and are rendered from `design/` (`node design/gallery/render.mjs`, needs Chrome): edit the HTML pages or
  `design/source/*.png`, re-run, and keep gallery images 1600x1000 (the 8:5 box Twenty shows).
- `scripts/patch-twenty-sdk-windows.mjs`: postinstall patch for a twenty-sdk bug, see `.claude/rules/twenty-sdk.md`.

## Rules

- Keep it simple: Retell API + Twenty Apps SDK only, no external automation service in the runtime path
  (the whole point is to remove them). Anything beyond sync (outbound dispatcher, contact mirror) is a later, separate stage.
- Nothing customer-specific in the repo: no customer names, real phone numbers, transcripts or PII in code, docs or tests.
  Deployment policy (which fields to store, retention) is app configuration, not code.
- Retell and Twenty facts come from `reference/` or fresh docs (append `.md` to a docs URL), not from memory
  (both ship every 3-7 days). Mark anything unchecked "not verified".
- Use only stable Twenty Apps parts: objects and logic functions. No alpha (`defineAgent`, `runAgent`) or beta
  (messaging channels) (breaking changes come without a deprecation period). Exception: `defineSkill` (alpha, checked
  working by the owner) is allowed for skills that teach Twenty's AI to use the app's tools; a skill is plain text, so a
  breaking change costs little.
- Never copy call audio into Twenty; store only the `recording_url` link (field `recording`, plus a player on top of the rich
  transcript). Retell serves the file while it retains it (the link is unsigned and long-lived by default, checked 2026-10-09).
  It expires after 24 hours when the agent has `opt_in_signed_url`, and after 10 minutes when the agent opts out of data
  storage; a fresh link then needs Get Call (not built yet).
- Verify Retell webhook signatures on the raw body (HMAC per Retell docs, `src/lib/signature.ts`). Never log or store the Retell key.

## Further reading

- `reference/retell/FINDINGS.md`, `reference/twenty/FINDINGS.md`: current state, deprecations, what changed. Raw pages in `reference/*/raw/`.
- `.mcp.json` (copy `.mcp.json.example`, set your server) gives the `twenty` and `retell` MCP servers (keys from `.env` via `scripts/mcp_headers.py`); `.env.example` lists the variables.
