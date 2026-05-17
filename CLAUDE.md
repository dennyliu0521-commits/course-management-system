# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

From the project root:

```
npm run install:all   # Install dependencies in both server/ and client/
npm run dev           # Start both server (3001) and client (5173) concurrently
DB_SOCKET=/path/to/mysql.sock npm run dev   # If using Unix socket for MySQL
npm run build         # Build client for production
npm run start         # Build client, then serve everything from Express on :3001
npm run start:api     # Start only the Express API on :3001
```

There is no linter or test runner configured.

## Architecture

Monorepo with two sub-projects: an Express API server and a React SPA client. The root `package.json` orchestrates them via `concurrently`.

### Server (`server/`)

- Entry point: `server/src/index.js` — calls `await initDb()` to auto-create tables, then starts Express. Mounts route modules under `/api/*`, serves built client from `client/dist/` in production.
- Database: MySQL via `mysql2/promise` (async API with connection pool). Connection config via env vars: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_SOCKET`. Schema and pool in `server/src/db.js`. Tables are auto-created on startup.
- Route handlers are async and use `pool.query()` with positional `?` parameters. All errors propagate to the global error handler via `next(e)`.
- Routes are plain Express `Router` objects in `server/src/routes/` — one file per resource:
  - `teachers.js`, `students.js`, `courses.js`, `coursePlans.js`, `calendar.js`
  - All follow the same CRUD pattern: `GET /`, `GET /:id`, `POST /`, `PUT /:id`, `DELETE /:id`
  - `coursePlans.js` additionally has `GET /:id/enrollments`, `POST /:id/enroll`, `DELETE /:planId/enrollments/:enrollmentId`
  - `calendar.js` has `GET /weekly?date=YYYY-MM-DD` — returns all course plans overlapping the week containing the given date, with enrollments joined
  - Error messages are in Chinese.
  - Duplicate key errors are caught via `e.code === "ER_DUP_ENTRY"` (MySQL error code).
  - `toMysqlDatetime(isoStr)` helper converts ISO 8601 strings to MySQL `YYYY-MM-DD HH:MM:SS` format.

### Client (`client/`)

- Entry point: `client/src/main.jsx` — mounts `<App />` inside `<React.StrictMode>` and `<BrowserRouter>`.
- `App.jsx` renders a sidebar layout with `NavLink` links and a `<Routes>` block. Routes: `/` (Dashboard), `/courses`, `/students`, `/teachers`, `/planning`, `/calendar` (weekly calendar view), `*` (redirect to `/`).
- API layer: `client/src/api.js` exports a thin `fetch` wrapper that prepends `/api` to all paths. Every resource (teachers, students, courses, coursePlans) has `.list()`, `.get()`, `.create()`, `.update()`, `.remove()` methods.
- During development, Vite proxies `/api` to `http://127.0.0.1:3001` (configured in `vite.config.js`).
- Page components live in `client/src/pages/`. Each CRUD page (Teachers, Students, Courses) follows an identical pattern: inline form at top, data table below, edit/delete actions call `api.*` methods and refresh local state.
- `CoursePlanning.jsx` is the most complex CRUD page — split into a left panel (plan CRUD with datetime-local inputs for `course_start_date`/`course_end_date`) and right panel (enrollment management).
- `CalendarView.jsx` provides a weekly calendar with prev/next week navigation, three view tabs (by teacher / by course / by student), and a 7-day grid showing course cards with time, room, and enrollment counts.
- No state management library — all components use local `useState`/`useEffect`, fetching fresh data on mount and after mutations.
- All styles in a single `client/src/styles.css` using CSS variables (dark theme).

### Database schema (5 tables, InnoDB)

- `teachers` — id (INT AUTO_INCREMENT PK), name (required), email (VARCHAR unique), phone, department, title
- `students` — id (INT AUTO_INCREMENT PK), name (required), student_no (VARCHAR unique, required), email, major, enrollment_year
- `courses` — id (INT AUTO_INCREMENT PK), code (VARCHAR unique, required), name (required), credits (DOUBLE, default 2), description
- `course_plans` — id (INT AUTO_INCREMENT PK), academic_year, semester, course_id (FK→courses), teacher_id (FK→teachers, nullable), capacity (default 40), schedule_note, room, course_start_date (TIMESTAMP NULL), course_end_date (TIMESTAMP NULL). Unique on (academic_year, semester, course_id).
- `enrollments` — id (INT AUTO_INCREMENT PK), student_id (FK→students), course_plan_id (FK→course_plans). Unique on (student_id, course_plan_id).
- Foreign keys cascade on delete, except teacher_id which SET NULL.
- All tables use `ENGINE=InnoDB`, timestamps via `CURRENT_TIMESTAMP`.
