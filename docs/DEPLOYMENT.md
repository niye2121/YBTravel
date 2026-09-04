# Deploying to a shared server

Plain-English runbook for what happens when we deploy YB Travel to a server —
written from the first deployment, to a shared box that already ran other
projects. Reuse this next time, whether that's redeploying here or setting
up on a different server.

The core rule, every time: **treat any server you didn't build from scratch
as someone else's house.** Look before you touch anything, and build in a
way that can be removed without leaving a trace on what was already there.

---

## 1. Before touching the server — ask two questions

1. **Is anything else already running on this server?** If the answer is
   "I don't know," find out before installing anything (see step 2).
2. **How should the app be reachable** — a bare `IP:port` link for an
   internal preview, or a real domain with HTTPS? This changes the setup
   (whether nginx and a certificate are involved), so it's worth asking
   rather than guessing.

## 2. Survey the server — read-only, nothing installed yet

Connect and look around before changing anything. Every command below is
read-only — it inspects, it doesn't modify:

```bash
ssh root@<SERVER_IP> bash -s <<'REMOTE'
cat /etc/os-release | head -5          # what OS/version
uptime; free -h; df -h                 # load, memory, disk space
ss -tlnp                               # every port already listening
docker ps -a                           # every container, running or not
systemctl list-units --type=service --state=running   # background services
pm2 list                               # any Node apps managed by PM2
ls -la /etc/nginx/sites-enabled        # existing nginx sites
ls -la /var/www /opt /srv              # common places projects live
crontab -l                             # scheduled jobs
REMOTE
```

Read the output properly before deciding anything. On the first deployment
this turned up two other client projects already live on the box — two Odoo
stacks in Docker, two Node apps under PM2, nginx serving two sites, and a
list of ports already in use (22, 53, 80, 443, 3000, 3001, 8069, 8070). That
list is exactly what step 3 is designed to avoid colliding with.

## 3. Decide the isolation plan

The goal: everything we add can be deleted later with zero effect on
anything that was already there. In practice that means:

- **A dedicated directory** nothing else uses — e.g. `/srv/yb-travel`.
- **Our own Docker network** — containers on it can talk to each other, but
  it doesn't touch any other project's containers or network.
- **Our own database container** — never reuse another project's Postgres,
  even if one's already running. Each project's data stays fully separate.
- **Fresh ports** — pick host ports nothing from step 2's survey is using.
- **No edits to anything that already exists** — no changes to another
  project's nginx config, PM2 process list, Docker containers, or crontab.
  Only ever *add* a new nginx site file if a domain's involved; never touch
  an existing one.

Write this plan down and confirm it with whoever owns the server before
building anything, especially the port and access-method choices — those
are the two things most likely to need a real answer instead of a guess.

## 4. Write the deploy files, locally, in the repo

Three files, committed to the repo so they're version-controlled like
everything else:

- **`apps/api/Dockerfile`** and **`apps/web/Dockerfile`** — multi-stage
  builds. Build stage installs the full project and compiles it; the final
  stage only keeps what's needed to run, so the shipped image doesn't carry
  build tools or unrelated workspace packages.
- **`docker-compose.deploy.yml`** — a *separate* compose file from the
  local-dev one, since this one describes the real deployed stack (database
  + API + web), not just "give me a local database to develop against."
- **`.dockerignore`** — keeps `node_modules`, `.git`, build output, and any
  local secrets out of what gets sent to Docker when building.

**One gotcha worth remembering:** if the project has a root-level config
file that other config files `extend` (this project has `tsconfig.base.json`
at the repo root, which every `tsconfig.json` inside `apps/*` extends from),
make sure the Dockerfile actually copies that root file into the build
stage. The build will fail with a "cannot resolve extends" error if it's
missing — that's exactly what happened on the first attempt here, fixed by
adding it to the `COPY` list in both Dockerfiles.

## 5. Copy the code to the server

```bash
rsync -az --delete \
  --exclude 'node_modules' --exclude '**/node_modules' \
  --exclude '.git' --exclude 'dist' --exclude '**/dist' \
  --exclude '.tanstack' --exclude '.baileys-auth' \
  ./ root@<SERVER_IP>:/srv/yb-travel/
```

`--delete` keeps the server copy matching the local one exactly, so stale
files from a previous version don't linger.

## 6. Secrets go on the server only, never in the repo

Generate fresh credentials, then write them straight to a file on the
server — never through a file that gets rsynced from the local repo, and
never committed to git:

```bash
PASSWORD=$(openssl rand -hex 20)
ssh root@<SERVER_IP> "cat > /srv/yb-travel/.env.deploy" <<EOF
POSTGRES_PASSWORD=${PASSWORD}
DATABASE_URL=postgres://yb:${PASSWORD}@postgres:5432/yb_travel
EOF
```

`docker-compose.deploy.yml` references this file via `env_file:` — the
compose file itself stays safe to commit, since it never contains the
actual password.

## 7. Build and start

```bash
ssh root@<SERVER_IP> "cd /srv/yb-travel && \
  docker compose -f docker-compose.deploy.yml --env-file .env.deploy build && \
  docker compose -f docker-compose.deploy.yml --env-file .env.deploy up -d"
```

## 8. Verify — both that it works, and that nothing else broke

```bash
curl http://<SERVER_IP>:<API_PORT>/health     # should return {"status":"ok",...}
curl -o /dev/null -w "%{http_code}\n" http://<SERVER_IP>:<WEB_PORT>/   # should be 200

# then re-run the same survey commands from step 2 and confirm every
# container and process that was already there is still there:
ssh root@<SERVER_IP> "docker ps --format '{{.Names}}: {{.Status}}' && pm2 list"
```

Don't skip the second half. Confirming *our* thing works isn't the same as
confirming we didn't break anyone else's — check both.

## 9. Log it

Add an entry to `CHANGELOG.md` — what got deployed, why the isolation
choices were made, anything that went wrong and how it got fixed (like the
`tsconfig.base.json` gotcha above), and what was explicitly verified. That
way the next deploy — or the next person reading this — knows it actually
happened and what it looked like at the time, not just that a runbook
exists.

## Redeploying later (a new version of the same app)

Repeat steps 5, 7, and 8 — rsync the new code over, rebuild, restart, then
verify both halves again. Steps 1–3 (survey and isolation plan) don't need
repeating unless it's been a long time or the server's changed hands —
worth a quick re-check, not a full redo.

## Tearing down

Because nothing here touches anything outside its own directory and Docker
network:

```bash
ssh root@<SERVER_IP> "cd /srv/yb-travel && docker compose -f docker-compose.deploy.yml down -v"
ssh root@<SERVER_IP> "rm -rf /srv/yb-travel"
```

`-v` also removes the named volumes (database data, WhatsApp session) —
leave it off if you want to keep that data around after stopping.
