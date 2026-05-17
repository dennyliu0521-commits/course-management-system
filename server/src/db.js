import mysql from 'mysql2/promise';

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

export async function initDb() {
  const conn = await pool.getConnection();
  try {
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

    // Migrate: add class_id if it doesn't exist on existing students table
    for (const col of ["class_id"]) {
      try {
        await conn.execute(`ALTER TABLE students ADD COLUMN ${col} INT`);
      } catch { /* column already exists */ }
    }
    try {
      await conn.execute(
        `ALTER TABLE students ADD CONSTRAINT students_class_fk FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL`
      );
    } catch { /* constraint already exists */ }

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
      try {
        await conn.execute(`ALTER TABLE course_plans ADD COLUMN ${col} TIMESTAMP NULL`);
      } catch { /* column already exists */ }
    }

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
  } finally {
    conn.release();
  }
}
