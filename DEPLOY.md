# Deploy: GitHub Pages + Supabase

## 1. Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. **Authentication**: **Authentication → Providers** → enable **Email**. Turn **off** "Confirm email" so users can sign in without verification.
3. **Database**: Run the right SQL in **SQL Editor** (see below).
4. **Settings → API**: copy the project **URL** and the **anon** public key for env vars.

---

## 2. Database: which SQL to run

The app uses **normalized tables** (`user_state`, `user_settings`, `user_killers`, `match_history`, `session_log`). It can still read from the old `sessions` table if a user has no row in `user_state` yet (e.g. after migration for users who haven’t logged in again).

### A. Brand‑new project (no existing users/data)

1. In **SQL Editor**, run **`supabase/schema-v2.sql`**.
2. (Optional) If you want the legacy `sessions` table as well (e.g. for backup or a different app), run **`supabase/schema.sql`** before or after. The app does not require it for new users.

Result: New sign‑ups get data only in the new tables.

---

### B. You already have the old `sessions` table and want to migrate

1. **Create the new tables**  
   In **SQL Editor**, run **`supabase/schema-v2.sql`**.

2. **Copy data into the new tables**  
   In **SQL Editor**, run **`supabase/migrate-from-sessions.sql`**.  
   This script:
   - Reads from `public.sessions` (columns `user_id`, `data` jsonb).
   - Inserts/updates: `user_state`, `user_settings`, `user_killers`, `match_history`, and `session_log` (dead events only; unlocks aren’t in old data).

3. **Optional**  
   Keep `sessions` as a backup or drop it later. The app loads from the new tables first; if no `user_state` row exists for a user, it falls back to `sessions.data`.

---

### C. You never ran the old schema

1. Run **`supabase/schema.sql`** (creates `sessions`).
2. Run **`supabase/schema-v2.sql`** (creates normalized tables).
3. If you have existing rows in `sessions` to migrate, run **`supabase/migrate-from-sessions.sql`**.

---

## 3. Environment variables

Create **`.env.local`** for local dev. For GitHub Pages (or any deploy), set the same in your deploy environment (e.g. Actions secrets):

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `BASE_PATH` | **Only for GitHub Pages:** `/<repo-name>` (e.g. `/dbd-killer-economy`) so the app and assets load under that path |

See **`.env.example`** for a template.

---

## 4. Build

```bash
npm install
npm run build
```

Static output is in **`out/`**. Serve that folder as static files (or use it in your host’s deploy step).

---

## 5. GitHub Pages

### 5a. Repository secrets

**Settings → Secrets and variables → Actions → New repository secret.** Add:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 5b. Pages source

**Settings → Pages** → **Build and deployment** → set **Source** to **GitHub Actions**.

### 5c. Deploy

Push to `main` (or the branch your workflow uses). The workflow (e.g. `.github/workflows/deploy-pages.yml`) should:

- Build with the Supabase env and `BASE_PATH=/<repo-name>`
- Deploy the contents of `out/` to GitHub Pages

Site URL will be **`https://<username>.github.io/<repo>/`**.

To redeploy: push again or run **Actions → [your workflow] → Run workflow**.

### 5d. Custom domain subpath (e.g. `maxwelljones.ca/dbd-hardcore`)

The build uses `BASE_PATH=/dbd-hardcore` (or your repo name). GitHub Pages serves from the root of the site, so for a subpath on your own domain you must either:

- Serve the **`out/`** folder on your own server at that path, or  
- Use a reverse proxy that serves the built app at that subpath.

No code change needed if the build already uses the correct `BASE_PATH`.

---

## Quick reference

| Goal | Steps |
|------|--------|
| New Supabase, no old data | Run **schema-v2.sql** |
| Migrate from old `sessions` | Run **schema-v2.sql**, then **migrate-from-sessions.sql** |
| Old schema never applied | Run **schema.sql**, then **schema-v2.sql**; optionally **migrate-from-sessions.sql** |

After any of these, set env vars, run `npm run build`, and deploy the `out/` folder.
