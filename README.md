# Portfolio Express.js

My responsive portfolio website with Express.js backend and MongoDB support.

Admin UI & API
- `GET /admin.html` — Admin page to add/delete projects and edit site settings.
- `GET /api/projects` — List projects
- `POST /api/projects` — Create project (JSON body)
- `DELETE /api/projects/:id` — Delete project
- `GET /api/settings` — Get site settings
- `POST /api/settings` — Save site settings

Setup
1. Create a `.env` with `MONGO_URI`, `EMAIL_USER`, `EMAIL_PASS`.
2. npm install
3. npm start

Notes
- Projects stored in MongoDB via `models/project.js`.
- Admin page is minimal and responsive for quick demos.

