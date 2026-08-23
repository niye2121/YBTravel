# TIME_LOGGING.md — Session Time Tracking Instructions

## Purpose

This file tells the agent how to track working time on a project: how long each
stretch of work took, what got done, and what a human developer would have
needed for the same work.

**Tracking is optional and per developer.** Each person on a project decides
once whether they want it and where their data goes. One developer can log to a
Google Sheet while another has it switched off entirely. Nobody's setup affects
anybody else's.

**This file contains no personal data and is safe to share.** No sheet IDs, no
credentials, no assumption about who is at the keyboard. All of that lives in
`TIME_TRACKING_USERS.json` (settings, committed with the project) and in a
credentials file on each machine (secret, never committed).

---

## A Note on the Word "Session"

This file uses "session" to mean **a stretch of work separated from the next by
a 15-minute gap**. That is a reporting unit, calculated after the fact from
timestamps. It is what gets logged.

It does **not** mean a Claude Code session — one conversation, from launching
`claude` until you exit. A single Claude Code conversation left open for a week
can contain dozens of logged sessions by the 15-minute rule.

Where this file says "at the start of every session," it means the start of a
Claude Code conversation. Everywhere else, "session" means the 15-minute unit.

---

## How to Include This in Any Project

Copy two files into the project root:

- `TIME_LOGGING.md` (this file)
- `TIME_TRACKING_USERS.json` (settings — or let the agent create it on first run)

And add this line to the project's CLAUDE.md:

```
Read TIME_LOGGING.md for session tracking and time logging instructions.
If TIME_LOGGING.md is not in this folder, skip time tracking entirely.
```

---

## Identity: Who Is At The Keyboard

**The identity is `git config user.email`.** Run it, read the result, done.

Why this and not a file on the machine: a developer's git email is already set
on every computer they work from — git will not let them commit without it. It
costs them no setup, and it is the same on their laptop, their desktop, and any
machine they buy next year. A config file stored on one machine would make the
same person look like a stranger the moment they moved computers.

**Only ever read this value. Never write to anyone's git config.**

If `git config user.email` returns nothing (a fresh machine before its first
commit), skip time tracking for this conversation and say so once, in one
sentence. Do not prompt for an address and do not set one.

---

## STEP 1 — First Run (once per project, then never again)

**Check whether `TIME_TRACKING_USERS.json` exists in the project root.**

- **If it exists → skip this entire section.** Go straight to Step 2. Do not
  re-run any of the setup below, do not re-ask anything, do not look for files
  to rename. The existence of that file means this project is already set up.
- **If it is missing → run the steps below once.**

This gate matters. A long-running conversation may re-read this file after a
compaction, and the setup must be harmless if it runs a second time. The check
above makes it harmless: one file read, then straight on to Step 2.

### First run steps

1. Get the git email.
2. Ask the one-time question below.
3. Create `TIME_TRACKING_USERS.json` with that person's entry.
4. **Migrate any existing log.** If a plain `SESSION_LOG.md` exists in the
   project, rename it to `SESSION_LOG-<handle>.md` for the person you just set
   up. Do not merge logs, do not delete anything, do not create a second log.
5. Tell the user in one or two sentences what you created and renamed.

### The one-time question

Ask this once, then wait:

> This project can track your working time — how long each stretch of work took
> and what got done. It's per developer, so it's yours alone and separate from
> anyone else on this project. Four choices:
>
> 1. **Google Sheet** — a log file in the project plus your own Google Sheet,
>    readable from any machine. About five minutes to set up; I'll walk you through it.
> 2. **Local Excel file** — a log file plus an `.xlsx` in your home folder. Same
>    columns, no accounts or credentials, works immediately.
> 3. **Log file only** — a markdown log in the project, nothing else. No setup.
> 4. **No thanks** — skip it. I won't bring it up again.

Then write their entry with `mode` set to `sheet`, `excel`, `local`, or `off`
accordingly, and ask for a short lowercase handle for their log filename
(default: the part of their email before the `@`).

**Write the entry no matter which answer you get, including "no thanks."** The
entry is what stops the question from ever being asked again — on this machine
or any other machine they use.

---

## STEP 2 — Every Session (the normal path)

1. Run `git config user.email`.
2. Read `TIME_TRACKING_USERS.json`.
3. Find the entry whose `emails` list contains that address.
4. **Not found** → this is someone new. Ask the one-time question above, add
   their entry to the file, and carry on. Do not touch anyone else's entry.
5. **Found** → do what their `mode` says:
   - `off` → skip everything else in this file. Say nothing about time tracking,
     now or ever, in any conversation.
   - `local` → log to their session log file only.
   - `excel` → log to their session log file and their `.xlsx`.
   - `sheet` → log to their session log file and their Google Sheet.

That is the whole per-conversation cost: one command, one file read, one lookup.

---

## TIME_TRACKING_USERS.json

Lives in the project root and is committed with the project. That is what makes
it work on every machine a developer uses — they pull the repo and it already
knows them.

```json
{
  "users": [
    {
      "handle": "joe",
      "emails": ["joe@example.com"],
      "mode": "sheet",
      "sheet_id": "PUT-YOUR-OWN-SHEET-ID-HERE",
      "timezone": "America/New_York"
    },
    {
      "handle": "dave",
      "emails": ["dave@example.com", "dave@personal.com"],
      "mode": "off"
    }
  ]
}
```

| Field | Meaning |
|---|---|
| `handle` | Short lowercase name. Used for the log filename: `SESSION_LOG-<handle>.md`. |
| `emails` | Every git email this person uses. **A list**, so a work laptop and a personal machine map to one person instead of two. |
| `mode` | `sheet`, `excel`, `local`, or `off`. |
| `sheet_id` | Their own Google Sheet ID. Only for `mode: "sheet"`. |
| `excel_path` | Path to their workbook, **written relative to home** (e.g. `~/Claude Session Tracker.xlsx`) so it resolves on any of their machines. Only for `mode: "excel"`. |
| `timezone` | Optional IANA zone (e.g. `America/New_York`) for converting logged times out of UTC. |

### Rules for this file

- **Never edit another person's entry.** Add your own, leave the rest alone.
- **Never copy someone else's `sheet_id`.** Each developer logs to their own
  destination or to nothing.
- If an entry is missing a field it needs (`mode: "sheet"` with no `sheet_id`),
  fall back to `local` for this conversation and tell the user once.
- The `sheet_id` is visible to everyone on the project. It is not a secret —
  access to a Google Sheet is controlled by who it is shared with, not by
  whether the ID is known. Credentials are the secret, and they are never in here.

---

## Credentials (mode: sheet)

The service-account JSON is a real secret. It **never** goes in the repository.

**Convention: `~/claude-tracker-credentials.json`** — the home folder on
whatever machine is in use. Because the location is a convention rather than a
stored path, it works on every machine without anything being written down.

If the file is not there on this machine, log to the session log file only and
say so once. Do not go looking for it elsewhere, and do not ask for it to be
pasted anywhere.

Add `claude-tracker-credentials.json` to `.gitignore`.

---

## Setting Up a Google Sheet (walkthrough for someone choosing `sheet`)

Go one step at a time and wait for confirmation. Do not dump all six at once.

1. **Create the sheet** at sheets.google.com. Copy the sheet ID out of the URL —
   the long string between `/d/` and `/edit`.
2. **Create a Google Cloud project** at console.cloud.google.com. Any name.
3. **Enable the Google Sheets API** for that project from the API Library.
4. **Create a service account** under IAM & Admin → Service Accounts. Then
   Keys → Add Key → Create new key → JSON. A file downloads.
5. **Share the sheet with the service account.** Open the JSON, find
   `client_email` — it looks like an email address. In the Google Sheet, hit
   Share, paste it, give it **Editor**. This is the step everyone forgets;
   without it every write fails with a permission error.
6. **Save the JSON** to `~/claude-tracker-credentials.json`.

Then add the header row from *Column Layout* below, write their entry in
`TIME_TRACKING_USERS.json`, and do one test write before relying on it.

---

## Session Detection Rules

### What Counts as a Session
- A session starts with the first prompt given to the agent
- A session ends when there is a gap of **15 minutes or more** between prompts
- If the gap between two prompts is less than 15 minutes, they belong to the same session
- Multiple sessions can occur in one day

### How to Get the Real Prompt Timestamps (source of truth)

Do NOT guess timestamps, and do NOT rely on application logs, file
modified-times, or git history — those are only rough proxies and the real
prompts are far denser than them. The reliable source is the transcript log:

- **Location:** `C:\Users\<YourName>\.claude\projects\<encoded-project-path>\<session-id>.jsonl`
  - `<encoded-project-path>` is the project's full path with the drive colon
    and every slash replaced by a dash (example: `c:\Users\Sam\Code\MyApp`
    becomes `c--Users-Sam-Code-MyApp`).
  - There is one `.jsonl` per conversation, named by a UUID. Work often spans
    several — `/clear` starts a new one. Read all the relevant files and merge
    their timestamps.
- Each line is one JSON message; use its `timestamp` field.
- Count a line as a REAL human prompt only when ALL of these hold:
  - `type` is `"user"`, AND
  - `message.content` is a plain string, OR a list that contains a `text`
    block and NO `tool_result` block (tool results are also role "user" — skip
    them), AND
  - it is not marked `isMeta`.
- Collect those timestamps, sort them, and apply the 15-minute gap rule to split
  them into sessions.
- Session start = first human prompt of the session; session end = last human
  prompt of the session; duration = end − start.

**Only ever read your own transcript folder.** It sits on your own machine and
holds only your own conversations. Never try to reconstruct a teammate's hours.

### Time Zone and Format
- Transcript timestamps are **UTC**. Convert to the developer's own local zone
  from their `timezone` field, accounting for daylight saving on the session's
  own date. If no `timezone` is set and the local zone is unclear, ask once and
  store the answer in their entry.
- Write times in **12-hour format with AM/PM** (e.g. `12:15 AM`, `3:17 AM`).
- **Include the date** — a session can cross midnight — e.g. `2026-06-22 12:15 AM`.

### When Starting a New Conversation
- Read this developer's own `SESSION_LOG-<handle>.md` if it exists
- Find the last recorded prompt timestamp
- If the gap between then and now is ≥ 15 minutes, the previous session ended
- Log that previous session before starting new work

---

## What to Log Per Session

1. **Date** — Date of the session
2. **Session Start** — Timestamp of first prompt in session
3. **Session End** — Timestamp of last prompt in session
4. **Duration** — Session end minus session start
5. **Project** — Name of the project folder
6. **What Was Done** — Plain English summary of what was built or changed
7. **Files Modified** — Files created or changed
8. **Claude Time** — Actual session duration in minutes
9. **Human Time Estimate** — What a human developer would have needed
10. **Time Saved** — Human estimate minus Claude time

---

## Human Time Estimation Rules

| Task Type | Human Time Estimate |
|---|---|
| New function created (simple) | 30–60 minutes |
| New function created (complex) | 1–3 hours |
| Bug fix (simple) | 15–30 minutes |
| Bug fix (complex) | 1–2 hours |
| New feature (small) | 2–4 hours |
| New feature (large) | 4–8 hours |
| Code refactoring | 2–4 hours |
| Documentation written | 1–2 hours |
| Testing and validation | 1–3 hours |
| Database/schema changes | 1–3 hours |
| UI/design work | 2–6 hours |

**Always add 20% buffer** for debugging, testing, and unexpected issues.
**Round up** — be conservative, not optimistic.
**Stack estimates** — if multiple tasks were done, add them together.

---

## The Session Log File

### Filename — one per developer

```
SESSION_LOG-<handle>.md
```

For example `SESSION_LOG-joe.md`, `SESSION_LOG-dave.md`. Each developer reads
and writes only their own file.

**Why every developer gets a suffix, with no exceptions:** the log is committed
with the project. If two people wrote to one shared `SESSION_LOG.md`, every
commit would touch the same file in the same place and produce merge conflicts
over a plain record of hours. Separate files make that impossible. And a bare
`SESSION_LOG.md` sitting beside named ones would read as "the shared one,"
which it is not — so nobody keeps the unsuffixed name.

### Format

```markdown
# Session Log — [Project Name] — [Developer]

**Billable:** Yes / No

## Session [Number] — [Date]
- **Status:** COMPLETE / IN PROGRESS
- **Start:** [Date + local time, 12-hour AM/PM, e.g. 2026-06-22 12:15 AM]
- **End:** [Date + local time, 12-hour AM/PM, e.g. 2026-06-22 3:17 AM]
- **Duration:** [X minutes]
- **Files modified:** [List of files]
- **What was done:** [Plain English summary]
- **Claude time:** [X minutes]
- **Human time estimate:** [X–Y hours]
- **Time saved:** [X–Y hours]
- **Notes:** [Any observations]

---
```

---

## Spreadsheet Output

Two destinations, one layout: a Google Sheet (`mode: "sheet"`) or a local Excel
workbook (`mode: "excel"`). **The columns are identical**, so a developer can
start on Excel and move to a Sheet later by pasting the rows across and changing
one line in their entry.

### Column Layout

| Column | Field |
|---|---|
| A | Date |
| B | Project |
| C | Session Start |
| D | Session End |
| E | Duration (minutes) |
| F | What Was Done |
| G | Files Modified |
| H | Claude Time (minutes) |
| I | Human Time Estimate (minutes) |
| J | Time Saved (minutes) |
| K | Notes |
| L | Billable |

### Writing to a Google Sheet (`mode: "sheet"`)

Use `gspread` with the credentials file. Open the sheet by the entry's
`sheet_id` and append one row per session in the column order above.

### Writing to a local Excel file (`mode: "excel"`)

- Use `openpyxl` (`pip install openpyxl`). Open the workbook at the entry's
  `excel_path`, resolving `~` to the current machine's home folder. Append one
  row per session, save.
- If the workbook does not exist, create it and write the header row first.
- If the file is open in Excel the save fails with a permission error. Ask the
  user to close it and retry. Never write to a different filename to work
  around it — that splits their history across two files.
- Keep the workbook **outside the project folder** so it is never committed.

### Troubleshooting the Google Sheets connection

- **SSL error — "certificate verify failed: unable to get local issuer
  certificate":** the machine verifies TLS through the operating-system
  certificate store (common on managed or corporate networks). Install
  `truststore` (`pip install truststore`) and run
  `import truststore; truststore.inject_into_ssl()` **before** importing
  `gspread`. Never disable certificate verification.
- **Permission error:** the sheet was almost certainly never shared with the
  service account's `client_email`. See step 5 of the walkthrough.

---

## Automatic Behavior Rules

All of these are gated on Step 2. If the mode is `off`, none of it runs.

### At the Start of Every Conversation
1. Resolve Step 1 (gate check) and Step 2 (identity lookup)
2. If the mode is `off`, stop here and say nothing further about it
3. Read this developer's `SESSION_LOG-<handle>.md` if it exists
4. If the gap since the last recorded prompt is ≥ 15 minutes, log that session
   as COMPLETE
5. Start a new session entry marked IN PROGRESS
6. Write to their spreadsheet if the mode is `sheet` or `excel`

### During Work
- Note timestamps of prompts silently
- Track which files are being modified
- Build a running summary of what is being accomplished

### At End of Session (when the user says "end of session")
1. Record the end timestamp
2. Calculate total duration
3. Summarize what was accomplished
4. Estimate human developer time and time saved
5. Update `SESSION_LOG-<handle>.md`
6. Write to their spreadsheet if the mode is `sheet` or `excel`
7. Confirm that logging is complete

### If the User Forgets to Say "End of Session"
- The next conversation detects the gap automatically
- Log the previous session retroactively
- No action needed from the user

---

## Billable Project Rules

- Billable status is **per developer, per project** — one person's work on a
  project can be billable while another's is not.
- The first time a developer's `SESSION_LOG-<handle>.md` is created, ask once:
  "Is this a billable project?"
- Save it at the top of that file as `**Billable:** Yes / No`
- Never ask again — read it from their log file every time after that
- Write the value to column L with every entry

---

## Privacy and Access

- `TIME_TRACKING_USERS.json` holds settings only. No secrets.
- Credentials stay at `~/claude-tracker-credentials.json` on each machine and
  are never committed
- Each developer's log file and spreadsheet are their own
- A developer whose mode is `off` leaves no trace of tracking in the project
- Add `claude-tracker-credentials.json` to `.gitignore`

---

## Example Session Log Entry

```markdown
## Session 1 — June 23, 2026
- **Status:** COMPLETE
- **Start:** 2026-06-23 2:00 PM
- **End:** 2026-06-23 3:30 PM
- **Duration:** 90 minutes
- **Project:** AccessBridge
- **Files modified:** accessbridge.py, CLAUDE.md
- **What was done:** Built the export modules function, added error handling,
  created the GUI layout with three action buttons
- **Claude time:** 90 minutes
- **Human time estimate:** 4–6 hours
- **Time saved:** 3–5 hours
- **Notes:** First session on this project. Core functionality working.
```

---

## Notes for the Agent

- **Step 1's gate check comes first, always.** If `TIME_TRACKING_USERS.json`
  exists, the setup section is skipped entirely — never re-run, never re-asked.
- Identity comes from `git config user.email` and nowhere else. Never guess it
  from the Windows username, the folder path, or the git commit author.
- Never ask the user to log time — do it automatically
- Never skip logging because a session was short (unless the mode is `off`)
- Never nag someone whose mode is `off`, in any conversation, for any reason
- Always estimate human time conservatively (round up)
- The 15-minute gap rule is the single most important rule — apply it consistently
