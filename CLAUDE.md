# CLAUDE.md

Permanent project instructions. Read this file at the start of every session.

This file is the **shared standard** — it is identical across all my projects and is
kept up to date automatically. Do **not** put anything project-specific here; it would
be overwritten on the next update. Project-specific instructions go in
`CLAUDE-specific.md` (see the next section).

## Project-Specific Instructions (`CLAUDE-specific.md`)

Every project has its own quirks — tech stack, folder layout, gotchas, links. Those
never go in this file. They live in a separate file next to it: **`CLAUDE-specific.md`**.

- **At the start of every session, read `CLAUDE-specific.md` if it exists**, and follow
  it together with this file.
- **If `CLAUDE-specific.md` does not exist, create it** (a stub with just a heading is
  fine). It must always sit in the project so there is a clear, known home for
  project-specific notes.
- From then on, put **every** project-specific instruction in `CLAUDE-specific.md` —
  never in this file.

## Coding Style

- Every function must have a plain English comment block above it explaining:
  - **What** it does
  - **Why** it exists
  - **How** it works, step by step
- Never write code without commenting it in plain English.

## Permanent Files to Maintain

### 1. DEVLOG.md

Keep updated after every session. It must include:

- Everything we built or changed
- Every approach we considered and why we rejected it
- Current state of the system
- What still needs to be done
- Any errors we hit and how we fixed them
- Written so any AI or developer can pick up exactly where we left off

### 2. USER_MANUAL.md

Keep updated as features are built. It must include:

- Plain English instructions for end users
- How to use each feature
- No technical jargon
- Updated every time a new feature is added or changed

## How the User Works

- Always discuss first, then write. Explain the plan in plain English and wait for approval before changing code.
- Use short sentences when asking the user questions or explaining what happened. No long, run-on sentences.

## General Rules

- Always read `CLAUDE.md`, `CLAUDE-specific.md`, `DEVLOG.md`, and `USER_MANUAL.md` before starting work.
- At the start of a session, make sure the standard files exist. If `CLAUDE-specific.md`, `DEVLOG.md`, or `USER_MANUAL.md` is missing, create it as a stub (heading only) so there is always a place to record things.
- When the user says "end of session", always update `DEVLOG.md` and `USER_MANUAL.md` before stopping.
- Always update `DEVLOG.md` and `USER_MANUAL.md` at the end of every session.
- Never write code without commenting it in plain English.
- When unsure about something, ask before proceeding.
- When you finish your response and are waiting for my input, follow the alert steps in C:\Users\Joe\Documents\GitHub\smallProjects\AIAgentNotifier\AI_AGENT_NOTIFIER_INSTRUCTIONS.md (drop one marker file so I get a pop-up).


## Session Time Tracking

- Always check for `TIME_LOGGING.md` at the start of every session and read it for all session tracking instructions.
- If `TIME_LOGGING.md` does not exist in the project folder, ask the user to provide it before starting work.
- If `SESSION_LOG.md` does not exist yet (first session on this project), ask the user once: "Is this a billable project?" Save the answer in `SESSION_LOG.md` and never ask again.

## Road Brief (on-the-go brainstorming)

Some projects have a portable **brief in OneDrive** so a mobile agent (e.g. Claude
Cowork) can get full context and brainstorm while I'm away from my computer, then write
ideas back for the desktop agent to pick up. **A project has a road brief only if its
`CLAUDE-specific.md` gives the brief's path.** When it does, follow this:

- **Structure of the brief folder:**
  - **`BRIEF.md`** — short entry point + map: what the project is, a **Terms & spelling**
    section if the project has jargon (canonical word + the variant spellings that show
    up in voice dictation), a "Where to look" table pointing into `reference/`, current
    state, open threads, how I work, and an idea-capture template.
  - **`reference/`** — the deep files (data model, subsystems, coded schemes — whatever
    the project needs). Drill into the one relevant section, not the whole file.
  - **`ideas/`** (+ `done/`) — inbox where the road agent drops `YYYY-MM-DD-topic.md`.
- Everything in the brief is **derived from the repo — the repo stays the source of truth.**
- **Session START:** check the `ideas/` inbox; surface any new files to me; act on them /
  fold them into the backlog; then move them to `ideas/done/`.
- **Session END:** refresh `BRIEF.md` (always — it's cheap). Refresh a `reference/` file
  **only when that area changed** this session.
