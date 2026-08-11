# TIME_LOGGING.md — Session Time Tracking Instructions

## Purpose

This file contains instructions for Claude Code to automatically track all working sessions across any project. It logs actual working time, estimates equivalent human developer time, and records what was accomplished. All data is stored in a global Google Sheet accessible from any machine.

---

## How to Include This in Any Project

Add this single line to your project's CLAUDE.md file:

```
Read TIME_LOGGING.md for session tracking and time logging instructions.
If TIME_LOGGING.md is not in this folder, ask the user to provide it.
```

That's the only setup needed per project.

---

## Session Detection Rules

### What Counts as a Session
- A session starts with the first prompt given to Claude Code
- A session ends when there is a gap of **15 minutes or more** between prompts
- If the gap between two prompts is less than 15 minutes, they belong to the same session
- Multiple sessions can occur in one day

### How to Detect Session Boundaries
- Every prompt has a timestamp
- Compare timestamp of current prompt to timestamp of previous prompt
- Gap ≥ 15 minutes = new session boundary
- Gap < 15 minutes = same session continues

### How to Get the Real Prompt Timestamps (source of truth)

Do NOT guess timestamps, and do NOT rely on application logs, file
modified-times, or git history — those are only rough proxies and the real
prompts are far denser than them. The reliable source is the Claude Code
transcript log for the conversation:

- **Location:** `C:\Users\<YourName>\.claude\projects\<encoded-project-path>\<session-id>.jsonl`
  - `<encoded-project-path>` is the project's full path with the drive colon
    and every slash replaced by a dash (example: `c:\Users\Sam\Code\MyApp`
    becomes `c--Users-Sam-Code-MyApp`).
  - There is one `.jsonl` per chat session, named by a UUID. If the work spans
    more than one transcript file, read all the relevant files and merge their
    timestamps.
- Each line is one JSON message; use its `timestamp` field.
- Count a line as a REAL human prompt only when ALL of these hold:
  - `type` is `"user"`, AND
  - `message.content` is a plain string, OR a list that contains a `text`
    block and NO `tool_result` block (tool results are also role "user" — skip
    them), AND
  - it is not marked `isMeta`.
- Collect those human-prompt timestamps, sort them, and apply the 15-minute
  gap rule above to split them into sessions.
- Session start = first human prompt of the session; session end = last human
  prompt of the session; duration = end − start.

### Time Zone and Format (apply to every logged time)
- The transcript timestamps are in **UTC**. Convert every logged time to
  **US Eastern time** (America/New_York): UTC−4 during daylight saving
  (about mid-March to early November), UTC−5 the rest of the year. Use the
  rule that applies to the session's own date.
- Write times in **12-hour format with AM/PM** (e.g. `12:15 AM`, `3:17 AM`).
- **Include the date** in the Start and End fields — a session can cross
  midnight — e.g. `2026-06-22 12:15 AM`.

### When Starting a New Chat
- Read SESSION_LOG.md if it exists
- Find the last recorded prompt timestamp
- Calculate the gap between then and now
- If gap ≥ 15 minutes, the previous session has ended
- Automatically log the previous session before starting new work

---

## What to Log Per Session

For each completed session, record:

1. **Date** — Date of the session
2. **Session Start** — Timestamp of first prompt in session
3. **Session End** — Timestamp of last prompt in session
4. **Duration** — Actual working time (session end minus session start)
5. **Project** — Name of the project folder being worked on
6. **What Was Done** — Plain English summary of what was built or changed
7. **Files Modified** — List of files that were created or changed
8. **Claude Time** — Actual session duration in minutes
9. **Human Time Estimate** — Estimated time a human developer would need for the same work
10. **Time Saved** — Human estimate minus Claude time

---

## Human Time Estimation Rules

When estimating how long a human developer would take, use these guidelines:

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

## SESSION_LOG.md Format

Maintain a file called SESSION_LOG.md in each project folder with this format:

```markdown
# Session Log — [Project Name]

**Billable:** Yes / No

## Session [Number] — [Date]
- **Status:** COMPLETE / IN PROGRESS
- **Start:** [Date + time in Eastern, 12-hour AM/PM, e.g. 2026-06-22 12:15 AM]
- **End:** [Date + time in Eastern, 12-hour AM/PM, e.g. 2026-06-22 3:17 AM]
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

## Google Sheets Integration

### Setup (One Time Only)

1. Create a Google Sheet called "Claude Session Tracker"
2. Create a Google Service Account at console.cloud.google.com
3. Share the Google Sheet with the service account email
4. Save the credentials JSON file at: `C:\Users\[YourName]\claude-tracker-credentials.json`
5. Note the Google Sheet ID from the URL

### Sheet Structure

The Google Sheet should have these columns:

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

### Credentials Location

```
Credentials file: C:\Users\Joe\claude-tracker-credentials.json
Sheet name: Claude Session Tracker
Sheet ID: 1uSvzNlHFAZ5aYAuGIm1JiUTSNluzmWhT4FfuIHFZzbo
```

### Writing to the Sheet

- Use the `gspread` library with the service-account credentials file. Open
  the sheet by its ID and append one row per session in the column order above.

### Troubleshooting the connection

- If the write fails with an SSL error such as "certificate verify failed:
  unable to get local issuer certificate", the machine verifies TLS through the
  operating-system certificate store (common on managed or corporate networks).
  Fix it by using the OS trust store: install `truststore`
  (`pip install truststore`) and run `import truststore;
  truststore.inject_into_ssl()` **before** importing `gspread`.
  Never disable certificate verification.

---

## Automatic Behavior Rules

Claude Code must follow these rules automatically without being asked:

### At the Start of Every Chat
1. Check if SESSION_LOG.md exists in the project folder
2. If it exists, read the last entry and its timestamp
3. Calculate the gap between the last prompt and now
4. If gap ≥ 15 minutes, log the previous session as COMPLETE
5. Start a new session entry marked IN PROGRESS
6. Log to Google Sheet automatically

### During Work
- Note timestamps of prompts silently
- Track which files are being modified
- Build a running summary of what is being accomplished

### At End of Session (When User Says "End of Session")
1. Record the end timestamp
2. Calculate total session duration
3. Summarize what was accomplished
4. Estimate human developer time
5. Calculate time saved
6. Update SESSION_LOG.md
7. Log to Google Sheet
8. Confirm to user that logging is complete

### If User Forgets to Say "End of Session"
- Next chat will detect the gap automatically
- Retroactively log the previous session
- No action needed from the user

---

## Privacy and Access

- SESSION_LOG.md is stored locally in each project folder
- Google Sheet is accessible from any machine with internet access
- Credentials file stays on local machine — never commit to GitHub
- Add `claude-tracker-credentials.json` to your .gitignore file

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

## Billable Project Rules

- At the start of the very first session (when SESSION_LOG.md does not exist), ask the user once: "Is this a billable project?"
- Save the answer at the top of SESSION_LOG.md as `**Billable:** Yes / No`
- Never ask again — read it from SESSION_LOG.md on every future session
- Log the billable value (Yes or No) to column L of the Google Sheet with every session entry

---

## Notes for Claude Code

- Never ask the user to log time — do it automatically
- Never skip logging even if the session was short
- Always estimate human time conservatively (round up)
- If Google Sheets credentials are not found, log to SESSION_LOG.md only and notify the user once
- The 15-minute gap rule is the single most important rule — apply it consistently
