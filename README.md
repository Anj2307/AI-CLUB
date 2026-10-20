# Hardly Human

The official website of **Hardly Human**, the AI club of IIT Dharwad. It has a public site with ten pages, a content API, and an admin panel with accounts and roles, all shipped as a single Docker container.

| | |
|---|---|
| **Frontend** | Plain HTML, CSS and JS with no build step. Light and dark themes, responsive, accessible. |
| **Backend** | Node.js 22.13+, Express 5, SQLite (built into Node, nothing to compile), zod validation |
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

Create a new Blueprint from this repository. `render.yaml` sets up the service, a persistent disk and a generated `JWT_SECRET`. Set `ADMIN_PASSWORD` in the dashboard before the first deploy.

### Option C: static only (GitHub Pages)

Publish the `public/` folder. The site renders fully from `assets/js/data.js`. The admin panel and the contact inbox need the backend, and the contact form falls back to opening the visitor's email app. To use a backend hosted somewhere else, add `<meta name="aiclub-api" content="https://your-api">` to the pages and list the Pages origin in that server's `CORS_ORIGINS`.

## Design

The identity plays on the club's name: the line between human and machine.

- **Colour:** warm coral (human) to electric cyan (machine). The gradient between them is the brand.
- **Type:** Instrument Serif italic is the "human" voice, JetBrains Mono the "machine" voice, and Space Grotesk and Inter carry everything else.
- **Home page:** a particle portrait whose face is organic and whose back of the head is a pixel grid. It dissolves into a rotating 3D sphere and back, and visitors can push the particles with the cursor or flip the human/machine switch. The page also has a scroll-lit manifesto and a playable "Human or machine?" Turing test.
- **Motion:** every animation is switched off for visitors who set "reduce motion" on their device.

## Replacing the placeholders

Do this through **Admin → Site settings / People / Media library**. Upload real logos and photos there and they're saved on the server. The bundled placeholder files are:

- `public/assets/img/logo-placeholder.svg` and `favicon.svg` (the "HH" monogram: one hand-drawn H, one pixel H)
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
