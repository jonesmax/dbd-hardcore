# Deploy: GitHub Pages + Supabase

## 1. Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. In **SQL Editor**, run the contents of `supabase/schema.sql` to create the `sessions` table.
3. In **Settings → API**, copy the project URL and the `anon` public key.

## 2. Environment variables

Create `.env.local` (for local dev) and set in your GitHub Actions / deploy env (for GitHub Pages):

- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon key
- `BASE_PATH` — only for GitHub Pages: use `/<repo-name>` (e.g. `/dbd-killer-economy`) so assets load at `https://<user>.github.io/<repo>/`

## 3. Build

```bash
npm install
npm run build
```

Output is in `out/`. Serve that folder as static files.

## 4. GitHub Pages

- **Option A (Actions):** Use a workflow that runs `npm ci && npm run build`, then uploads `out/` to the `gh-pages` branch (or to GitHub Pages from the workflow). Add `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `BASE_PATH` as repository secrets and pass them as env to the build step.
- **Option B (branch):** Build locally with the env vars set, then push the contents of `out/` to a branch used by GitHub Pages (e.g. `gh-pages`).

Without Supabase env vars, the app falls back to **localStorage** (single device, no sync).
