import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "..", "data");
const dbPath = path.join(dataDir, "cms.sqlite");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

export const db = new Database(dbPath);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

export function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS teachers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE,
      phone TEXT,
      department TEXT,
      title TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      student_no TEXT UNIQUE NOT NULL,
      email TEXT,
      major TEXT,
      enrollment_year INTEGER,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS courses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      credits REAL NOT NULL DEFAULT 2,
      description TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS course_plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      academic_year TEXT NOT NULL,
      semester TEXT NOT NULL,
      course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      teacher_id INTEGER REFERENCES teachers(id) ON DELETE SET NULL,
      capacity INTEGER NOT NULL DEFAULT 40,
      schedule_note TEXT,
      room TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE (academic_year, semester, course_id)
    );

    CREATE TABLE IF NOT EXISTS enrollments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      course_plan_id INTEGER NOT NULL REFERENCES course_plans(id) ON DELETE CASCADE,
      enrolled_at TEXT DEFAULT (datetime('now')),
      UNIQUE (student_id, course_plan_id)
    );
  `);
}
