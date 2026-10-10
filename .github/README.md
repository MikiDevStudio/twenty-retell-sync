<div align="center">
  <img src="./assets/logo.png" alt="Retell Sync for Twenty logo" width="88" />
  <h1>Retell Sync for Twenty</h1>
  <p><strong>Every Retell AI call and SMS chat in your Twenty CRM within seconds. Call or text a Person from a workflow or the AI chat.</strong></p>
  <p>
    <a href="#installation"><img src="./assets/download.svg" width="12" height="12"/> Install</a> ·
    <a href="../README.md"><img src="./assets/book.svg" width="12" height="12"/> Full guide</a> ·
    <a href="https://github.com/MikiDevStudio/twenty-retell-sync/issues"><img src="./assets/bug.svg" width="12" height="12"/> Issues</a> ·
    <a href="../LICENSE"><img src="./assets/scale.svg" width="12" height="12"/> MIT license</a>
  </p>
  <p>
    <a href="../package.json"><img src="https://img.shields.io/github/package-json/v/MikiDevStudio/twenty-retell-sync?label=version" alt="Version" /></a>
    <a href="../LICENSE"><img src="https://img.shields.io/github/license/MikiDevStudio/twenty-retell-sync" alt="MIT license" /></a>
    <a href="https://twenty.com"><img src="https://img.shields.io/badge/Twenty-app-141414" alt="Twenty app" /></a>
    <a href="https://www.retellai.com"><img src="https://img.shields.io/badge/Retell_AI-voice_%26_SMS-2f6bff" alt="Retell AI" /></a>
  </p>
</div>

<p align="center">
  <img src="./assets/demo.webp" alt="Demo: a Retell call ends, the webhook lands, the call appears on the Person linked to her opportunity, and the Summary tab shows the summary and transcript" />
</p>

<details>
<summary><strong>Overview</strong> · the whole flow on one picture</summary>
<br/>

<p align="center">
  <img src="./assets/01-cover.webp" alt="Retell Sync for Twenty: a call or chat goes from Retell through a signed webhook to a transcript, a summary and a CRM record" />
</p>

</details>

<br />

# Why Retell Sync

Teams that run voice and SMS agents on [Retell AI](https://www.retellai.com) and keep customers in [Twenty](https://twenty.com) usually
glue the two together with an automation service: one more account, one more bill, and one more place where a call gets lost.
Retell Sync is a Twenty app that talks to both APIs directly. Install it, paste your Retell key, and calls and chats arrive in
Twenty as records, linked to the right Person and Opportunity.

<br />

# Everything you need

| Sync | Act | Control |
| :--- | :--- | :--- |
| Calls and chats as Twenty records | Call a Person from a workflow | One settings tab, no URLs to copy |
| Summary, transcript, recording | Start an SMS chat with a Person | Resync any period on demand |
| Linked to Person and Opportunity | AI chat tools and a Retell skill | Do-not-call in sync both ways |

<table align="center">
  <tr>
    <td width="50%">
      <img src="./assets/02-how-it-works.webp" alt="How it works: webhooks for speed, a scheduled sync for completeness, do-not-call both ways" />
      <p align="center"><img src="./assets/zap.svg" width="16" height="16"/> Webhooks in seconds, a scheduled sync for every gap</p>
    </td>
    <td width="50%">
      <img src="./assets/03-summary-tab.webp" alt="The Summary tab on a call: summary, recording player and transcript" />
      <p align="center"><img src="./assets/book.svg" width="16" height="16"/> A Summary tab on every call and chat</p>
    </td>
  </tr>
  <tr>
    <td width="50%">
      <img src="./assets/05-call-and-text.webp" alt="A workflow step that calls a Person, and the AI chat building that workflow" />
      <p align="center"><img src="./assets/phone.svg" width="16" height="16"/> Call and text from workflows and the AI chat</p>
    </td>
    <td width="50%">
      <img src="./assets/04-setup.webp" alt="The Retell settings tab: API key, connection status, resync and webhook" />
      <p align="center"><img src="./assets/rocket.svg" width="16" height="16"/> Set up in one settings tab</p>
    </td>
  </tr>
</table>

- **Calls and chats as records:** summary, transcript, recording link, sentiment, outcome, cost and your own post-call fields.
- **Linked to your CRM:** each call finds its Person by phone number and, when it can tell, its Opportunity.
- **Call and text from Twenty:** four actions (call person, send SMS, refresh call, set do-not-call), each a workflow step and an
  AI tool, plus a skill that teaches Twenty's AI to use them.
- **Do-not-call in sync:** a caller who asks not to be called again is flagged on their Person; a flag set in Twenty goes to Retell.
- **Nothing lost:** retries and out-of-order events are safe, one record per call, a filled field is never blanked.

<br />

# How it works

```mermaid
sequenceDiagram
    participant R as Retell AI
    participant A as Retell Sync (Twenty app)
    participant T as Twenty CRM
    R->>A: Signed webhook: call_ended / call_analyzed
    A->>A: Verify signature with your Retell key
    A->>T: Upsert Retell Call (summary, transcript, recording)
    A->>T: Link Person by phone, Opportunity by id or newest deal
    loop Every few minutes
        A->>R: List calls, chats and do-not-call contacts
        A->>T: Fill gaps, reconcile do-not-call
    end
    T->>A: Workflow or AI chat: "Retell: call person"
    A->>R: Create phone call with the Person's context
```

<br />

# Installation

1. **Allow logic functions** on your Twenty server (`LOGIC_FUNCTION_TYPE=LOCAL` or `LAMBDA`; production defaults to `DISABLED`).
2. **Install the app** in your workspace. Until it is listed on the Twenty marketplace, deploy it from source:
   ```bash
   yarn install
   yarn twenty remote:add --url https://your-twenty-server --api-key <key> --as server
   yarn twenty app:publish --private -r server && yarn twenty app:install -r server
   ```
3. **Paste your Retell key** in Settings > Apps > Retell Sync for Twenty > Retell. Use the key with the *Webhook* badge.
4. **Tick your agents** and press **Set webhook on agents**. The first sync loads the last 30 days.

Everything else (the Retell tab, do-not-call rules, opportunity linking, workflow recipes, limits) is in the [full guide](../README.md).

<br />

# Good to know

- Audio stays at Retell: Twenty stores only the recording link.
- SMS needs a US number with an approved A2P registration in Retell. Numbers bought in Retell call 15 countries.
- The AI chat is told to propose every call and SMS for approval. That is an instruction to the model, not a hard lock, so test
  calling workflows on one record first.

<br />

# Development

Requires Node 24 and Yarn 4. `yarn twenty docker:start` runs a local Twenty, `yarn twenty apply` syncs the app, `yarn test:unit`
runs the unit tests. The code map and project rules are in [AGENTS.md](../AGENTS.md).

<br />

<sub>An independent app by MikiDev Studio, released under the MIT license. Not affiliated with or endorsed by Retell AI or Twenty.
Retell and Twenty are trademarks of their owners, used here only to name the services this app connects.</sub>
