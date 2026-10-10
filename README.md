# Retell Sync for Twenty

Every [Retell AI](https://www.retellai.com) voice call and SMS chat in your Twenty workspace within seconds: summary,
transcript and recording on the record, linked to the right Person and Opportunity. Call or text a Person from a workflow
or the AI chat, and the result comes back to the same record. It talks to the two APIs directly, so there is no n8n,
Zapier or Make in between.

*An independent app by MikiDev Studio. Not affiliated with or endorsed by Retell AI or Twenty. Retell and Twenty are
trademarks of their owners, used here only to name the services this app connects.*

## ✨ What you get

- **Calls and chats as records.** Two new objects, **Retell Calls** and **Retell Chats**, with summary, transcript, recording
  link, sentiment, outcome, cost and your own post-call extraction fields.
- **Linked to your CRM.** Each call finds its **Person** by phone number and, when it can tell, its **Opportunity**. They show up
  on the Person and Opportunity pages.
- **A Summary tab.** Every call and chat page opens with the summary, a player for the recording and a clean transcript.
- **An analytics dashboard.** **Retell Analytics** appears in your Dashboards list and shows call and chat counts, duration, latency,
  cost, outcomes and sentiment of the last 30 days as native Twenty charts, on two tabs (Calls and Chats). You can edit it like any
  dashboard.
- **Do-not-call in sync.** A caller who asks not to be called again is flagged on their Person. A flag set in Twenty goes to Retell.
- **Nothing lost.** Webhooks deliver in seconds, and a scheduled sync backfills history and closes any gap a missed webhook leaves.
- **Call and text from Twenty.** Workflow steps and AI tools place a call or start an SMS chat with a Person, and a built-in
  skill teaches Twenty's AI to use them and to build workflows around them.
- **One settings tab.** Paste the key, tick the agents and press one button. No webhook URL to copy by hand.

## 🔄 How it works

1. **A call or chat ends in Retell.** Retell sends a signed webhook (`call_ended`, `call_analyzed`, `chat_ended`, `chat_analyzed`).
2. **The app checks the signature** against your Retell key and writes the record within seconds.
3. **It links the record.** It finds the Person by the primary phone number (or creates one), and the Opportunity by
   `opportunity_id` or by the Person's newest opportunity.
4. **The analysis arrives.** When Retell finishes its post-call analysis, the same record gets the summary, sentiment and outcome.
5. **The scheduled sync** re-reads Retell on your interval and fills in anything a webhook missed. It also compares do-not-call
   flags on both sides.

Re-deliveries and out-of-order events are safe: one record per call, and a filled field is never blanked.

## 🧩 What it adds to your workspace

| Where | What |
| --- | --- |
| New objects | **Retell Calls**, **Retell Chats** |
| Person | Retell calls and chats, **Retell do not call** (with *changed at* and *source*), **Retell contact ID**, **Retell last contacted at** |
| Opportunity | Retell calls and chats |
| Call and chat pages | **Summary** tab, right after Home |
| Dashboards | **Retell Analytics** dashboard with a Calls tab and a Chats tab |
| Retell Calls | **Connection** (connected, not connected, error), **Transferred**, **Latency p50**, **Duration (s)** and **Cost ($)** |
| Retell Chats | **Duration (s)** and **Cost ($)** |
| Settings > Apps | **Retell** tab: the control panel |
| Workflows | **Retell: call person**, **Retell: send SMS**, **Retell: refresh call**, **Retell: set do-not-call** actions |
| AI chat and MCP | The same four actions as tools, and the **Retell calls and SMS** skill |

Every field the app adds to People and Opportunities starts with *Retell*, so it never collides with your own fields.

## 🚀 Setup

1. **Allow logic functions on the server.** Set `LOGIC_FUNCTION_TYPE=LOCAL` (or `LAMBDA`) under **Settings > Admin Panel >
   Configuration**, or in the server environment. Production defaults to `DISABLED`, and then every route of the app answers 403.
2. **Install the app** from Settings > Applications > Marketplace: search "Retell Sync" with the "Vetted only" filter off.
3. **Paste your Retell key.** Open **Settings > Apps > Retell Sync for Twenty > Retell**, paste the key that has the *Webhook* badge
   (Retell dashboard, Settings, API Keys) and press **Save key**. You need the *Applications* permission.
4. **Connect the agents.** In **Webhook**, enter the public address of your Twenty server, tick the agents (none ticked means all)
   and press **Set webhook on agents**.

That's it. The first sync loads the last 30 days of history.

> **Use the key with the Webhook badge.** Retell signs every webhook with that one key. Any other key still works for the API,
> but every webhook fails with 401, and the tab shows **Webhook rejected**.

## 🎛️ The Retell tab

- **Retell API key**: save or replace the key. It is stored as a secret and never reaches the browser.
- **Connection**: status, last webhook received, last sync result and a **Sync now** button.
- **Resync**: re-reads every call and chat of the last N days and rewrites their records, including ones that look complete. Use it
  after deleting records in Twenty or after regenerating the analysis in Retell (Retell sends no webhook for that). It never creates
  duplicates, runs in chunks every 5 minutes and shows how many records it created and updated. Calls Retell has already deleted
  cannot come back, and a field you now exclude is not removed from existing records. Run it once after updating to a version
  that adds fields (**Connection**, **Transferred**, **Latency p50**, **Duration (s)** and **Cost ($)**): older records keep those
  empty until then, and the picked-up rate reads low because their empty **Connection** is counted as not picked up.
- **Sync schedule**: how often the pull sync runs (minimum 5 minutes). Webhooks deliver new calls within seconds; the schedule only
  closes gaps.
- **Webhook**: registers `https://<your-twenty-host>/s/retell/webhook` on the ticked agents through the Retell API. **Remove webhook**
  undoes it. An agent-level webhook replaces the account-level one for that agent; an account-level webhook set by hand in the Retell
  dashboard works too.
- **Outbound calls and SMS**: the number and agent used when a call or SMS started from Twenty names none. With no agent chosen,
  Retell uses the agent bound to the number.
- **Sync options**:
  - **Backfill days**: how far the first sync reaches (default 30).
  - **Fields not to store**: for example `transcript,dynamicVariables`. Applies to calls and chats.
  - **Create a Person when the number matches nobody** (on by default).
  - **Link new calls and chats to the Person's newest opportunity** (on by default).

You can also start a sync with an authenticated `POST https://<your-twenty-host>/s/retell/sync`.

## 📲 Calling and texting from Twenty

Four actions, each both a workflow step and an AI tool (in AI chat and over MCP as `app_retell_*`):

| Action | What it does |
| --- | --- |
| **Retell: call person** | Places a real outbound call to the Person's primary number. Optional: opportunity, from number, agent, idempotency key. |
| **Retell: send SMS** | Starts an SMS conversation with the Person through a Retell chat agent. The agent writes the first message itself. |
| **Retell: refresh call** | Re-reads one call from Retell by its call id and updates its record, including a fresh recording link. |
| **Retell: set do-not-call** | Sets or clears do-not-call on the Person and in Retell. |

- **Agent context.** Every call and SMS passes `first_name`, `last_name`, `full_name`, `email`, `company_name`, `twenty_person_id`
  and `opportunity_id` as dynamic variables, so the agent prompt can use `{{first_name}}`. The AI tool takes extra variables too.
- **Linked back.** The ids also go into `metadata`, so the finished call or chat links to the same Person and Opportunity.
- **Do-not-call is enforced twice.** The app refuses a Person flagged do-not-call, and the request asks Retell to refuse a number its
  own contacts mark do-not-call.
- **Approval in AI chat.** The tools tell Twenty's AI to propose every call and SMS for approval before it runs. That is an instruction
  to the model, not a hard lock. A workflow step runs without approval, so test a calling workflow on one record before activating it.
- **The skill.** **Retell calls and SMS** explains the objects, the tools and the rules above to Twenty's AI, with ready workflow
  recipes ("new lead, call back", "missed call, text back", follow-up tasks). Ask the AI chat, for example, "build a workflow that
  calls every new lead from the website".

Retell limits to know:
- Numbers bought in Retell call only [15 countries](https://docs.retellai.com/deploy/international-call). For others, import a
  number from your own telephony provider.
- SMS needs a US number with an approved A2P 10DLC application in Retell ([Enable SMS](https://docs.retellai.com/deploy/enable-sms)).
  Without it Retell answers `Item not found in a2p-application`.
- A call cannot go from a number to the same number.

## 📞 Do not call

- **Retell do not call** on Person mirrors the do-not-call flag of the number's contact in Retell. It is one flag for calls and SMS.
  Outbound calls, SMS and campaigns skip a contact only when they honour DNC (see Retell's do-not-call docs).
- **Retell do not call changed at** and **Retell do not call source** record the last change:
  - *Retell: asked on a call*: the call ended with `user_requested_dnc`. Turn on DNC detection on the agent.
  - *Retell: contact*: an SMS opt-out, a carrier opt-out or a change in the Retell dashboard. Retell sends no webhook for these, so
    the next sync picks them up.
  - *Twenty*: someone changed the flag in Twenty. The app sends it to Retell and creates the contact when there is none.
- Both sides are compared on every sync, and the newer change wins. A flag Retell set is cleared only after Retell confirms it.
- **Your own do-not-call field** stays as it is: the app never writes fields it does not own. To pass it to Retell, build a workflow:
  trigger **Record is updated** on People, field *your field*; action **Retell: set do-not-call** with *Person ID* = the record id and
  *Do not call* = your field. In your own automations, check both fields.

## 🎯 Linking to opportunities

- **Explicit id.** If the call's `metadata`, dynamic variables or custom attributes carry `opportunity_id` (or
  `twenty_opportunity_id`) and that opportunity exists, the call is linked to it. When the number matched nobody, the opportunity's
  contact becomes the Person. An id that points at nothing is ignored. Pass the id when you start an outbound call from a CRM opportunity.
- **Newest opportunity.** With the option on, a new call or chat without `opportunity_id` is linked to the newest opportunity whose
  *Point of contact* is its Person. It only fills an empty link: a link set by hand or by `opportunity_id` is never replaced, and a
  Resync fills links that are still empty.
- **Your own rule.** Turn the option off and build a Twenty workflow: trigger **Record is created** on Retell Calls; filter
  *Opportunity is empty* (and *Person is not empty*); **Find records** on Opportunities where *Point of contact* is the call's Person,
  with your sort and limit 1; **Update record** on the Retell Call, setting *Opportunity* to `{{<find step>.first.id}}`.

## 🧠 Using post-call analysis in workflows

Retell's post-call extraction fields are stored as one JSON object in **Custom analysis data**, so a new field in Retell needs no
app change. In a workflow triggered by **Record is created or updated** on Retell Calls, reference a key as
`{{trigger.properties.after.analysis.<key>}}` (for example `...analysis.city`). The variable picker offers only the whole object,
so type the key after it by hand.

## 📝 Good to know

- **Phone matching** uses the Person's primary phone number. Additional numbers are not searched. A number that cannot be split into
  calling code and national number stays unlinked.
- **New People** get their name from the agent's dynamic variables (such as `first_name`), or the number when there is none.
- **Chats** carry no phone field in Retell's API. The app reads the number from `metadata`, dynamic variables or custom attributes
  (`user_number`, `phone_number`, ...) when an agent sets it.
- **Recordings stay at Retell.** Twenty keeps only the link, which plays while Retell keeps the file. Agents that use signed URLs
  give links that expire after 24 hours, and agents that opt out of data storage after 10 minutes. **Retell: refresh call** fetches a
  fresh link.
- **PII scrubbing.** For agents set to "Everything except PII", Retell returns scrubbed copies, and the app stores those: the
  transcript, summary and analysis hold Retell's placeholders (for example `[person name 1]`).
- **Retell last contacted at** on Person holds the start of the newest Retell call or chat with that person. It only moves forward.
- **Retell Analytics** shows the last 30 days on every widget, duration in seconds and cost in dollars. The tab titles say the period;
  if you change a widget's date filter in the dashboard editor, rename the tab too. The dashboard record is created after install and
  removed on uninstall; if you delete it, an update of the app creates it again. The picked-up rate is the share
  of calls whose **Connection** is *Connected* among all calls of the period, empty ones included, inbound and failed calls too. The app
  derives **Connection** from Retell's disconnection reason; a reason Retell has no documented status for leaves it empty. There is no concurrency or credit
  balance chart: Retell's public API reports no balance, and concurrency is a live value without history. A role needs read access
  to Retell Calls and Retell Chats to see the charts.
- **Summary tab shows "No Data" after install.** A Twenty tab that stayed open during the install can cache the tab's widget in
  a form Twenty does not render ([twentyhq/twenty#27771](https://github.com/twentyhq/twenty/issues/27771)), and a reload keeps it.
  Open the record page layout editor and press **Reset**, or clear the site data for your Twenty domain in the browser and sign in again.

## Development

See `AGENTS.md`.
