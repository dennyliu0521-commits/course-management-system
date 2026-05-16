# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

From the project root:

```
npm run install:all   # Install dependencies in both server/ and client/
npm run dev           # Start both server (3001) and client (5173) concurrently
npm run build         # Build client for production
npm run start         # Build client, then serve everything from Express on :3001
npm run start:api     # Start only the Express API on :3001
```

There is no linter or test runner configured.

## Architecture

Monorepo with two sub-projects: an Express API server and a React SPA client. The root `package.json` orchestrates them via `concurrently`.

### Server (`server/`)

- Entry point: `server/src/index.js` — creates Express app, mounts route modules under `/api/*`, serves built client from `client/dist/` in production.
- Database: SQLite via `better-sqlite3` (synchronous API). Schema and connection in `server/src/db.js`. Database file auto-created at `server/data/cms.sqlite` on first run. WAL mode, foreign keys enabled.
- Routes are plain Express `Router` objects in `server/src/routes/` — one file per resource:
  - `teachers.js`, `students.js`, `courses.js`, `coursePlans.js`
  - All follow the same CRUD pattern: `GET /`, `GET /:id`, `POST /`, `PUT /:id`, `DELETE /:id`
  - `coursePlans.js` additionally has `GET /:id/enrollments`, `POST /:id/enroll`, `DELETE /:planId/enrollments/:enrollmentId`
  - Error messages are in Chinese.
- **Dead code:** `server/src/store.js` is a JSON-file-based persistence layer that was abandoned. It is imported and initialized in `index.js` (`initStore()`) but no route actually uses it — all routes import `db` from `db.js` directly. It is safe to remove.

### Client (`client/`)

- Entry point: `client/src/main.jsx` — mounts `<App />` inside `<React.StrictMode>` and `<BrowserRouter>`.
- `App.jsx` renders a sidebar layout with `NavLink` links and a `<Routes>` block. Six routes: `/` (Dashboard), `/courses`, `/students`, `/teachers`, `/planning`, `*` (redirect to `/`).
- API layer: `client/src/api.js` exports a thin `fetch` wrapper that prepends `/api` to all paths. Every resource (teachers, students, courses, coursePlans) has `.list()`, `.get()`, `.create()`, `.update()`, `.remove()` methods.
- During development, Vite proxies `/api` to `http://127.0.0.1:3001` (configured in `vite.config.js`).
- Page components live in `client/src/pages/`. Each CRUD page (Teachers, Students, Courses) follows an identical pattern: inline form at top, data table below, edit/delete actions call `api.*` methods and refresh local state.
- `CoursePlanning.jsx` is the most complex page — split into a left panel (plan CRUD) and right panel (enrollment management).
- No state management library — all components use local `useState`/`useEffect`, fetching fresh data on mount and after mutations.
- All styles in a single `client/src/styles.css` using CSS variables (dark theme).

### Database schema (6 tables)

- `teachers` — id, name (required), email (unique), phone, department, title
- `students` — id, name (required), student_no (unique, required), email, major, enrollment_year
- `courses` — id, code (unique, required), name (required), credits (default 2), description
- `course_plans` — id, academic_year, semester, course_id (FK), teacher_id (FK nullable), capacity (default 40), schedule_note, room. Unique constraint on (academic_year, semester, course_id).
- `enrollments` — id, student_id (FK), course_plan_id (FK). Unique constraint on (student_id, course_plan_id).
- Foreign keys cascade on delete (course_plans → enrollments, students → enrollments), except teacher_id which sets null.
