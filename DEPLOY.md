# Deploy: GitHub Pages + Supabase

## 1. Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. **Authentication**: In **Authentication → Providers**, enable **Email**. Turn **off** "Confirm email" so users can sign in right after sign-up (no verification email).
3. In **SQL Editor**, run the contents of `supabase/schema.sql` to create the per-user `sessions` table and RLS policies.
4. In **Settings → API**, copy the project URL and the `anon` public key.

## 2. Environment variables

Create `.env.local` (for local dev) and set in your GitHub Actions / deploy env (for GitHub Pages):

- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon key
- `BASE_PATH` — only for GitHub Pages: use `/<repo-name>` (e.g. `/dbd-hardcore`) so assets load at `https://<user>.github.io/<repo>/`

## 3. Build

```bash
npm install
npm run build
```

Output is in `out/`. Serve that folder as static files.

## 4. GitHub Pages

### 4a. Add repository secrets

In your repo: **Settings → Secrets and variables → Actions → New repository secret**. Add:

- `NEXT_PUBLIC_SUPABASE_URL` — your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — your Supabase anon key

### 4b. Enable GitHub Pages from Actions

1. **Settings → Pages**
2. Under **Build and deployment**, set **Source** to **GitHub Actions**.

### 4c. Deploy

Push to `master` or `main`. The workflow (`.github/workflows/deploy-pages.yml`) will:

- Build with your Supabase env and `BASE_PATH=/<repo-name>` so the app works at `https://<username>.github.io/<repo>/`
- Deploy the static `out/` folder to GitHub Pages

Your site will be at **https://jonesmax.github.io/dbd-hardcore/** (replace with your username/repo).

To redeploy, push again or run **Actions → Deploy to GitHub Pages → Run workflow**.

### maxwelljones.ca/dbd-hardcore (subpath on your domain)

The build uses `BASE_PATH=/dbd-hardcore`, so it works at **https://maxwelljones.ca/dbd-hardcore/**.

- **To use maxwelljones.ca/dbd-hardcore:** GitHub Pages can't serve a subpath of a domain used by another site. GitHub Pages serves from the root of the site, so you’d get `maxwelljones.ca` (not `/dbd-hardcore`). To keep the app at `maxwelljones.ca/dbd-hardcore/`, host the `out/` contents on your own server under that path, or use a reverse proxy that serves the GitHub Pages site at that subpath.
- **Your own server:** Upload the `out/` folder so it’s served at `https://maxwelljones.ca/dbd-hardcore/` (the `out/` contents are the root of that URL). No code changes needed; the workflow already builds with the right base path.
