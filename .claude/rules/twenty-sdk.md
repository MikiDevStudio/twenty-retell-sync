Lessons from building on twenty-sdk 2.45.0. Each line says why; delete one only after re-testing the cause.

- Windows: `yarn twenty apply` fails with "Resource path must not contain backslashes" because the SDK builds paths with
  `path.relative()`. `scripts/patch-twenty-sdk-windows.mjs` (postinstall) fixes the bundled files. After an SDK upgrade, re-test
  without the patch; if apply works, delete the script and its postinstall entry.
- `package.json` is uploaded and installed on the Twenty server. A lifecycle script that needs a local file breaks every logic
  function at run time ("couldn't be built successfully"). Keep scripts tolerant (`|| true`) and add no `resolutions`/`patch:` entries.
- Integration tests (`yarn test`) uninstall the app and its data before reinstalling it. `global-setup.ts` refuses any host but
  localhost; never weaken that, and never export `TWENTY_API_URL` pointing at a real workspace.
- `yarn twenty dev:function:exec` returns "Authentication failed" on the local remote while `apply` works. Trigger functions through their HTTP route instead.
- A Twenty update must not blank filled fields: Retell events can arrive out of order (retried `call_ended` after `call_analyzed`), so `store.ts` drops null values on update.
- Twenty rejects a `null` RICH_TEXT value on create ("Cannot read properties of null (reading 'blocknote')", HTTP 500); `store.ts` drops nulls on create too. A call with no transcript hit this.
- Retell `list-agents` omits `webhook_url`; read it with `get-agent` / `get-chat-agent`. A set that looks successful in the list is invisible there.
- Retell signs webhooks only with the API key that carries the webhook badge. A different key still calls the API (status "Connected") but every real webhook gets 401 (seen in the call's public log: "Error triggering webhook ... status code 401"). The tab shows "Webhook rejected" for this.
- A `defineSettingsMenuItem` tab replaces the generated Variables page, so a secret variable has no input anywhere else: the tab must offer one (`MetadataApiClient` `updateOneApplicationVariable`, needs `SystemPermissionFlag.APPLICATIONS` on the app role). Found when an install on a real server showed no place to paste the Retell key.
- The Retell tab (front component) cannot see secret application variables, so anything that needs the Retell key goes through a logic-function route.
- The SDK finds entities by parsing every file as plain TypeScript, not TSX. A big JSX body in a `*.front-component.tsx` makes that parse swallow `export default defineFrontComponent`, and the component silently leaves the build (the Retell tab vanished after a deploy, `retell-settings` missing from the server). Keep entry files JSX-free and put the UI in `src/components/`; `src/__tests__/entities.test.ts` checks it.
- After an install where the front component was missing, the settings menu item was not recreated by later installs with an unchanged manifest entry (`findOneApplication.settingsMenuItems` stayed empty). Giving the menu item a new universal identifier forced it. Check `settingsMenuItems` and `frontComponents` on the server after every deploy.
- A field the app adds to a standard object (Person, Opportunity) must carry a `retell` prefix. A workspace that already has a custom field of the same name (a customer's own `doNotCall`) makes the whole sync fail with `IDX_FIELD_METADATA_NAME_OBJECT_METADATA_ID_WORKSPACE_ID_UNIQUE`, so nothing installs. Seen on local with a probe field.
- A `person.updated` trigger with `updatedFields: ['retellDoNotCall']` still fired on a save that did not change the flag (an old row, empty to false), and stamped a real Person as changed in Twenty. Handlers compare `before` and `after` themselves (`flagChanged` in `src/lib/dnc.ts`).
- A server where the app was deployed as a tarball (`app:publish --private`) never lists the npm version: the registration is
  unique per `universalIdentifier`, and catalog sync left the TARBALL one untouched (seen 2026-10-10). Moving that server to npm
  means uninstall, delete the tarball registration, Synchronize catalog, install from the marketplace.
- npm 12 put the very first publish of a new package into staging (placeholder `0.0.0-stage`) until the owner approved it on
  npmjs.com; later publishes through trusted publishing went live directly. `publish.yml` uses Node 24 latest because npm@latest
  refuses Node 24.5 from `.nvmrc`.
- A `BAR_CHART` widget needs `layout: 'VERTICAL'` (or horizontal); without it apply fails the whole sync with "Layout is required for bar
  chart widget", though the type marks the key optional. Seen applying the analytics page probe.
- A widget filter in the manifest is `{ fieldMetadataUniversalIdentifier, operand, value, type }` with no `id`; a relative date is
  `operand: 'IS_RELATIVE', value: 'PAST_7_DAY'` (`<DIRECTION>_<N>_<UNIT>`), checked on local 2026-10-10.
