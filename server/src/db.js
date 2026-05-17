import mysql from 'mysql2/promise';
import bcrypt from "bcryptjs";

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'course_management',
  socketPath: process.env.DB_SOCKET || undefined,
  waitForConnections: true,
  connectionLimit: 10,
});

export { pool };

async function migrateColumn(conn, table, col, def) {
  try { await conn.execute(`ALTER TABLE ${table} ADD COLUMN ${col} ${def}`); } catch { /* exists */ }
}

export async function initDb() {
  const conn = await pool.getConnection();
  try {
    // --- users ---
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role ENUM('admin','teacher','student') NOT NULL DEFAULT 'student',
        related_id INT,
        name VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB
    `);

    // --- teachers ---
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS teachers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name TEXT NOT NULL,
        email VARCHAR(255) UNIQUE,
        phone TEXT,
        department TEXT,
        title TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB
    `);

    // --- classes ---
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS classes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        class_code VARCHAR(100) UNIQUE NOT NULL,
        enrollment_year INT NOT NULL,
        major VARCHAR(100) NOT NULL,
        class_number VARCHAR(20) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (enrollment_year, major, class_number)
      ) ENGINE=InnoDB
    `);

    // --- students ---
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS students (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name TEXT NOT NULL,
        student_no VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(255),
        class_id INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL
      ) ENGINE=InnoDB
    `);
    await migrateColumn(conn, "students", "class_id", "INT");
    try {
      await conn.execute(
        `ALTER TABLE students ADD CONSTRAINT students_class_fk FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL`
      );
    } catch { /* exists */ }

    // --- courses (add type for 必修/选修) ---
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS courses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        code VARCHAR(50) UNIQUE NOT NULL,
        name TEXT NOT NULL,
        credits DOUBLE NOT NULL DEFAULT 2,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB
    `);
    await migrateColumn(conn, "courses", "type", "ENUM('必修','选修') NOT NULL DEFAULT '必修'");

    // --- course_plans (add status) ---
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS course_plans (
        id INT AUTO_INCREMENT PRIMARY KEY,
        academic_year TEXT NOT NULL,
        semester TEXT NOT NULL,
        course_id INT NOT NULL,
        teacher_id INT,
        capacity INT NOT NULL DEFAULT 40,
        schedule_note TEXT,
        room TEXT,
        course_start_date TIMESTAMP NULL,
        course_end_date TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (academic_year(100), semester(100), course_id),
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
        FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE SET NULL
      ) ENGINE=InnoDB
    `);
    for (const col of ["course_start_date", "course_end_date"]) {
      await migrateColumn(conn, "course_plans", col, "TIMESTAMP NULL");
    }
    await migrateColumn(conn, "course_plans", "status", "ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending'");

    // --- course_plan_classes ---
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS course_plan_classes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        course_plan_id INT NOT NULL,
        class_id INT NOT NULL,
        UNIQUE (course_plan_id, class_id),
        FOREIGN KEY (course_plan_id) REFERENCES course_plans(id) ON DELETE CASCADE,
        FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);

    // --- enrollments (add approval_status) ---
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS enrollments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        student_id INT NOT NULL,
        course_plan_id INT NOT NULL,
        enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (student_id, course_plan_id),
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
        FOREIGN KEY (course_plan_id) REFERENCES course_plans(id) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);
    await migrateColumn(conn, "enrollments", "approval_status", "ENUM('pending','approved','rejected') NOT NULL DEFAULT 'approved'");

    // --- grades ---
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS grades (
        id INT AUTO_INCREMENT PRIMARY KEY,
        student_id INT NOT NULL,
        course_plan_id INT NOT NULL,
        teacher_id INT NOT NULL,
        score DECIMAL(5,1),
        comment TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (student_id, course_plan_id, teacher_id),
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
        FOREIGN KEY (course_plan_id) REFERENCES course_plans(id) ON DELETE CASCADE,
        FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);

    // --- Seed admin user ---
    const [[admin]] = await conn.query("SELECT id FROM users WHERE username = ?", ["admin"]);
    if (!admin) {
      const hash = await bcrypt.hash("admin123", 10);
      await conn.query(
        "INSERT INTO users (username, password_hash, role, related_id, name) VALUES (?, ?, 'admin', NULL, ?)",
        ["admin", hash, "系统管理员"]
      );
      console.log("Default admin created: admin / admin123");
    }
  } finally {
    conn.release();
  }
}
