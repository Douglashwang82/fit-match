Deploy the fit-match (SyncMotion) project to Railway. Follow these steps exactly.

---

## 0. Pre-flight checks

Check Railway CLI is installed and the user is logged in:
```bash
railway --version
railway whoami
```

If not installed, run: `npm install -g @railway/cli`
If not logged in, run: `railway login --browserless`

---

## 1. Link to the existing Railway project

The project already exists on Railway. Link to it:
```bash
railway link --project 1a377f6b-89a0-4bdc-a7eb-3aefa0c11b3c
```

If the user is deploying a brand new project instead, run:
```bash
railway init --name fit-match --workspace "Douglas Hwang's Projects"
railway add --database postgres
```
Then create both services:
```bash
printf '\n' | railway add --service backend
printf '\n' | railway add --service frontend
```

---

## 2. Verify required env vars are set on the backend

```bash
railway variables --service backend
```

The backend needs all three of these — if any are missing, set them:

| Variable | How to set |
|---|---|
| `GOOGLE_API_KEY` | `railway variables set GOOGLE_API_KEY=xxx --service backend` |
| `DATABASE_URL` | `railway variables set 'DATABASE_URL=${{Postgres.DATABASE_URL}}' --service backend` |
| `ALLOWED_ORIGINS` | Set after you know the frontend URL (see step 5) |

**Important:** Never commit `GOOGLE_API_KEY` to the repo. Always set it via CLI or dashboard.

---

## 3. Deploy the backend

Must be deployed from the `backend/` subdirectory using `--path-as-root`:
```bash
railway up backend --path-as-root --service backend --ci
```

Verify it's healthy:
```bash
curl https://backend-production-9c36.up.railway.app/health
# Expected: {"status":"ok"}
```

If the health check fails, check logs:
```bash
railway logs --service backend
```

Common backend failures:
- `GOOGLE_API_KEY` not set → set it via `railway variables set`
- `DATABASE_URL` not linked → use `${{Postgres.DATABASE_URL}}` reference
- Deployed from wrong directory → always use `--path-as-root` with path `backend`

---

## 4. Get the backend URL and set VITE_API_URL on the frontend

```bash
railway domain --service backend
railway variables set VITE_API_URL=https://<backend-domain> --service frontend
```

**VITE_API_URL is baked in at build time.** If you change the backend URL, you must redeploy the frontend too.

---

## 5. Deploy the frontend

Must be deployed from the `frontend/` subdirectory using `--path-as-root`:
```bash
railway up frontend --path-as-root --service frontend --ci
```

The frontend Dockerfile does a multi-stage build (Node → Nginx) and uses `envsubst` to inject `$PORT` at runtime. Do not change the CMD in the Dockerfile.

Get the frontend URL and update CORS on the backend:
```bash
railway domain --service frontend
railway variables set ALLOWED_ORIGINS=https://<frontend-domain> --service frontend
```

---

## 6. Verify everything is working

```bash
# Backend health
curl https://backend-production-9c36.up.railway.app/health

# Frontend responds
curl -o /dev/null -w "%{http_code}" https://frontend-production-0bcb8.up.railway.app
# Expected: 200
```

Test the LLM is reachable (catches missing GOOGLE_API_KEY):
```bash
curl -s -X POST https://backend-production-9c36.up.railway.app/api/pillar-plan \
  -H "Content-Type: application/json" \
  -d '{"profile":{"age":25,"gender":"male","weight":70,"height":175,"fitness_level":"beginner","injuries":[],"current_frequency":2,"preferred_exercises":["running"],"sleep_hours":7,"work_schedule":"morning","diet_type":"standard","goal":"lose weight","target_days_per_week":3}}'
```
If you get `No API_KEY or ADC found`, the `GOOGLE_API_KEY` is missing or wrong.

---

## Known gotchas

- **`railway add --database postgresql`** fails — use `postgres` not `postgresql`
- **`railway login --token`** flag doesn't exist in v4 — use `RAILWAY_TOKEN=xxx railway <command>` or `railway login --browserless`
- **Frontend 502** after deploy — nginx needs `$PORT` injected via `envsubst`. The Dockerfile handles this; don't revert it.
- **TypeScript build errors** — stale components (`Dashboard.tsx`, `Step2-4`, `WorkoutView.tsx`) were deleted. If they reappear, delete them again — they're dead code from the old fake-door MVP.
- **`railway variables`** hides nothing — if `GOOGLE_API_KEY` doesn't appear in the list, it genuinely isn't set on that service.

---

## Current live URLs

| Service | URL |
|---|---|
| Frontend | https://frontend-production-0bcb8.up.railway.app |
| Backend | https://backend-production-9c36.up.railway.app |
| Railway project | https://railway.com/project/1a377f6b-89a0-4bdc-a7eb-3aefa0c11b3c |
