# API reference

Base URL: `/api/v1`. All bodies are JSON. Errors look like this:

```json
{ "error": { "message": "Validation failed", "details": { "email": "Invalid email address" } } }
```

Auth uses the `aiclub_session` cookie, set by `POST /auth/login`. Scripts can send `Authorization: Bearer <token>` instead, using the same JWT.

## Public

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Liveness check plus a database check |
| GET | `/site` | Settings and every collection in one payload (ETag-cached) |
| GET | `/settings` | Site settings |
| GET | `/{collection}` | `{ items: [...] }` for `people`, `projects`, `events`, `gallery`, `news` or `sponsors` |
| GET | `/{collection}/{id}` | One item |
| POST | `/messages` | Contact form `{ name, email, topic, body }`. Rate-limited. |

## Auth

| Method | Path | Description |
|---|---|---|
| POST | `/auth/login` | `{ email, password }`. Sets the session cookie. |
| POST | `/auth/logout` | Clears the session cookie |
| GET | `/auth/me` | `{ user }`, or `{ user: null }` when not signed in |
| POST | `/auth/password` | `{ currentPassword, newPassword }`. Signs out your other sessions. |

## Content (editor or admin)

| Method | Path | Description |
|---|---|---|
| POST | `/{collection}` | Create an item. Returns `201` with the new item. |
| PATCH | `/{collection}/{id}` | Partial update |
| DELETE | `/{collection}/{id}` | Delete an item |
| POST | `/{collection}/reorder` | `{ ids: [...] }` sets the display order |
| PUT | `/settings` | Partial settings update |
| POST | `/uploads` | Multipart field `file` (an image). Returns `{ url }`. |
| GET | `/uploads` | Media library |
| DELETE | `/uploads/{id}` | Delete an upload |
| GET | `/messages?status=new\|read\|archived` | Inbox |
| PATCH | `/messages/{id}` | `{ status }` |
| DELETE | `/messages/{id}` | Delete a message |
| GET | `/admin/overview` | Counts, unread messages and recent activity |
| GET | `/admin/export` | Full JSON backup |

## Admin only

| Method | Path | Description |
|---|---|---|
| GET | `/users` | List accounts |
| POST | `/users` | `{ email, name, role, password }` |
| PATCH | `/users/{id}` | `{ name?, role?, password? }` |
| DELETE | `/users/{id}` | Remove an account (you can't remove yourself or the last admin) |
| GET | `/admin/audit?limit=100` | Activity log |
| POST | `/admin/import` | Replace all content with a backup. The whole file is validated first. |

## Collection fields

| Collection | Fields (* = required) |
|---|---|
| people | name*, role*, team*, year, photo, bio, linkedin, github, email |
| projects | title*, status (Ongoing, Completed or Planned), domain, image, description, tech[], team[], github, demo, year |
| events | title*, date* (YYYY-MM-DD), type, time (HH:MM), venue, image, description, registerLink |
| gallery | src*, caption, album |
| news | title*, date*, category, image, summary, content |
| sponsors | name*, logo, url |
