# AI Club IIT Dharwad

The official website of the AI Club, IIT Dharwad. It has a public site with ten pages, a content API, and an admin panel with accounts and roles, all shipped as a single Docker container.

| | |
|---|---|
| **Frontend** | Plain HTML, CSS and JS with no build step. Light and dark themes, responsive, accessible. |
| **Backend** | Node.js 22.13+, Express 5, SQLite (built into Node) or Postgres/Supabase via `DATABASE_URL`, zod validation |
| **Auth** | bcrypt passwords, JWT in an HttpOnly cookie, `admin` and `editor` roles |
| **Ops** | Dockerfile, docker compose with automatic HTTPS (Caddy), a Render blueprint, GitHub Actions CI, a backup script |

See **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** for the design and security model, and **[docs/API.md](docs/API.md)** for the API.

## Pages

| Public | Admin (`/admin`) |
|---|---|
| Home, Dashboard, People, Projects, Events, Gallery, News, Contact, 404 | Overview, Inbox (contact form), People, Projects, Events, Gallery, News, Partners, Media library, Site settings, Users, Activity log, Backup & restore, My account |

## Run locally

```bash
npm install
npm run dev            # http://localhost:3000, restarts on file changes
```

On first start the server creates the database, fills it with the placeholder content in `public/assets/js/data.js`, and creates an admin account. The admin password is printed in the terminal. To choose your own instead:

```bash
ADMIN_EMAIL=you@iitdh.ac.in ADMIN_PASSWORD='a-long-password' npm run dev
```

Then open http://localhost:3000/admin.

Run the tests with:

```bash
npm test               # API test suite (node:test + supertest)
```

## Deploy

### Option A: any Linux server with Docker (recommended)

```bash
git clone <this repo> aiclub && cd aiclub
cp .env.example .env
# edit .env: set JWT_SECRET (openssl rand -hex 32), ADMIN_EMAIL, ADMIN_PASSWORD, DOMAIN
docker compose --profile https up -d --build
```

Point your domain's DNS at the server. Caddy then gets an HTTPS certificate on its own. All data lives in the `aiclub-data` volume.

For nightly backups, add `deploy/backup.sh` to cron (see the comment at the top of the script).

### Option B: Render (managed, no server to maintain)

Render's free plan has no persistent disk: every restart, redeploy or wake-from-sleep starts with an empty filesystem. So on Render, keep the data in **Supabase** (free Postgres + file storage) instead of the local SQLite file.

1. Create a project at [supabase.com](https://supabase.com).
2. **Storage** → New bucket → name it `uploads` and tick **Public bucket**.
3. **Connect** (top bar) → copy the **Session pooler** connection string and put your database password in it.
4. **Project Settings → API** → copy the **Project URL** and the **service_role** key.
5. On Render, create a Blueprint from this repository (`render.yaml`), or a Docker web service, and set:
   - `DATABASE_URL` = the Session pooler string
   - `SUPABASE_URL` = the Project URL
   - `SUPABASE_SERVICE_KEY` = the service_role key (secret, never put it in frontend code)
   - `ADMIN_PASSWORD` = the first admin's password
   - `JWT_SECRET` = a long random string (the Blueprint generates one)

On first start the app creates its tables in Supabase and fills them from `data.js`. After that, admin edits are stored in Supabase and survive restarts. Without `DATABASE_URL` the app keeps using SQLite under `DATA_DIR`, which still suits local development or a server with a real disk.

### Option C: static only (GitHub Pages)

Publish the `public/` folder. The site renders fully from `assets/js/data.js`. The admin panel and the contact inbox need the backend, and the contact form falls back to opening the visitor's email app. To use a backend hosted somewhere else, add `<meta name="aiclub-api" content="https://your-api">` to the pages and list the Pages origin in that server's `CORS_ORIGINS`.

## Replacing the placeholders

Do this through **Admin → Site settings / People / Media library**. Upload real logos and photos there and they're saved on the server. The bundled placeholder files are:

- `public/assets/img/logo-placeholder.svg` and `favicon.svg` (club logo)
- `public/assets/img/iitdh-logo-placeholder.svg` (institute logo)
- `public/assets/img/placeholders/*` (event, project, gallery and news images)

`public/assets/js/data.js` is the seed content for new installations and the fallback for static hosting. Run `npm run seed -- --force` to reset a database to it.

## Useful commands

| Command | What it does |
|---|---|
| `npm start` | Run in production mode |
| `npm run dev` | Run with auto-restart |
| `npm test` | Run the API tests |
| `npm run seed` | Seed an empty database (`-- --force` to overwrite) |
| `npm run create-admin -- you@iitdh.ac.in "Name"` | Create an admin or reset their password (account recovery) |

## Configuration

All settings are environment variables. They're documented in [`.env.example`](.env.example). `JWT_SECRET` is required in production, and the server won't start without it.
