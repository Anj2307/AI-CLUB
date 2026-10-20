# AI Club IIT Dharwad - Website

A fast, multi-page static website for the AI Club of IIT Dharwad. Plain HTML, CSS and JavaScript: no build step and no framework, so it can be hosted for free on GitHub Pages.

## Pages

| Page | File | What's on it |
|---|---|---|
| Home | `index.html` | Animated neural-network hero, stats, focus areas, featured projects, upcoming events, latest news, partners, join CTA |
| Dashboard | `dashboard.html` | KPIs, events-per-month chart, project status, projects by domain, team composition, upcoming events, news, activity timeline |
| People | `people.html` | Faculty advisors plus team members, with team filters and search |
| Projects | `projects.html` | Project cards with domain/status filters and detail pop-ups |
| Events | `events.html` | Next event with a live countdown, upcoming and past events, type filters |
| Gallery | `gallery.html` | Masonry photo grid with albums and a keyboard-navigable lightbox |
| News | `news.html` | Featured story, category filters, search and full-article pop-ups |
| Contact | `contact.html` | Contact details, map, message form (opens email) and FAQ |
| Admin | `admin.html` | Add, edit, delete and reorder all content, edit site settings, export and import data |
| 404 | `404.html` | Not-found page |

Light and dark themes are both supported (toggle in the header). Every page is responsive.

## Run locally

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

Opening `index.html` directly also works.

## Replacing the placeholders

All content lives in **one file**: `assets/js/data.js`. Every name, photo and number in it is a placeholder.

- **Club logo:** replace `assets/img/logo-placeholder.svg` (and `assets/img/favicon.svg`), or point `settings.logo` at your own file.
- **IIT Dharwad logo:** replace `assets/img/iitdh-logo-placeholder.svg`.
- **Photos:** put real images in `assets/img/` (for example `assets/img/people/name.jpg`) and update the paths in `data.js`. People without a photo get a coloured initials avatar automatically.
- **Partner logos:** `assets/img/placeholders/sponsor.svg`.
- **Social links, email, join form:** under `settings` in `data.js`.

## Using the admin panel

1. Open `admin.html`. The default password is `aiclub@admin`. Change it under **Site settings** as soon as you sign in.
2. Edit any content. Changes are saved in *your browser* and show up right away on every page, for you only.
3. To publish, go to **Backup & publish**, click **Export data.js**, replace `assets/js/data.js` in the repository with the downloaded file, then commit and push.

> **Security note:** this is a static site, so the admin password check runs in the browser. It only stops casual edits; it is not real security. Nobody can change the live site without pushing to this repository, so the real protection is who has write access to the repo. If you later need real multi-user editing, connect a backend such as Firebase or Supabase.

## Deploy on GitHub Pages

Go to Settings → Pages, choose "Deploy from a branch", pick the branch and the `/ (root)` folder. The `.nojekyll` file is already included.

## Structure

```
assets/
  css/style.css        design system (tokens, components, light and dark themes)
  js/data.js           ALL site content - edit this
  js/core.js           shared header/footer, theme, data store, helpers
  js/pages/*.js        page-specific scripts
  img/                 logos and placeholder images
*.html                 one file per page
```
