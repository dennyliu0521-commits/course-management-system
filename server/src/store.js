import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "..", "data");
const dataPath = path.join(dataDir, "cms.json");

/** @type {{ teachers: object[], students: object[], courses: object[], course_plans: object[], enrollments: object[] }} */
let data = {
  teachers: [],
  students: [],
  courses: [],
  course_plans: [],
  enrollments: [],
};

function nowIso() {
  return new Date().toISOString();
}

function nextId(arr) {
  const m = arr.reduce((max, r) => (r.id > max ? r.id : max), 0);
  return m + 1;
}

function load() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(dataPath)) {
    save();
    return;
  }
  try {
    const raw = JSON.parse(fs.readFileSync(dataPath, "utf8"));
    data = {
      teachers: Array.isArray(raw.teachers) ? raw.teachers : [],
      students: Array.isArray(raw.students) ? raw.students : [],
      courses: Array.isArray(raw.courses) ? raw.courses : [],
      course_plans: Array.isArray(raw.course_plans) ? raw.course_plans : [],
      enrollments: Array.isArray(raw.enrollments) ? raw.enrollments : [],
    };
  } catch {
    data = { teachers: [], students: [], courses: [], course_plans: [], enrollments: [] };
    save();
  }
}

function save() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  const tmp = `${dataPath}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), "utf8");
  fs.renameSync(tmp, dataPath);
}

export function initStore() {
  load();
}

function sortDescById(rows) {
  return [...rows].sort((a, b) => b.id - a.id);
}

// --- Teachers ---

export function listTeachers() {
  return sortDescById(data.teachers);
}

export function getTeacher(id) {
  return data.teachers.find((t) => t.id === Number(id)) || null;
}

export function createTeacher(body) {
  const email = body.email?.trim() || null;
  if (email && data.teachers.some((t) => t.email === email)) {
    const e = new Error("UNIQUE");
    throw e;
  }
  const row = {
    id: nextId(data.teachers),
    name: body.name.trim(),
    email,
    phone: body.phone?.trim() || null,
    department: body.department?.trim() || null,
    title: body.title?.trim() || null,
    created_at: nowIso(),
  };
  data.teachers.push(row);
  save();
  return row;
}

export function updateTeacher(id, body) {
  const idx = data.teachers.findIndex((t) => t.id === Number(id));
  if (idx === -1) return null;
  const email = body.email?.trim() || null;
  if (email && data.teachers.some((t) => t.email === email && t.id !== Number(id))) {
    const e = new Error("UNIQUE");
    throw e;
  }
  data.teachers[idx] = {
    ...data.teachers[idx],
    name: body.name.trim(),
    email,
    phone: body.phone?.trim() || null,
    department: body.department?.trim() || null,
    title: body.title?.trim() || null,
  };
  save();
  return data.teachers[idx];
}

export function deleteTeacher(id) {
  const n = Number(id);
  const before = data.teachers.length;
  data.teachers = data.teachers.filter((t) => t.id !== n);
  data.course_plans.forEach((cp) => {
    if (cp.teacher_id === n) cp.teacher_id = null;
  });
  save();
  return data.teachers.length < before;
}

// --- Students ---

export function listStudents() {
  return sortDescById(data.students);
}

export function getStudent(id) {
  return data.students.find((s) => s.id === Number(id)) || null;
}

export function createStudent(body) {
  const student_no = body.student_no.trim();
  if (data.students.some((s) => s.student_no === student_no)) {
    throw new Error("UNIQUE");
  }
  const row = {
    id: nextId(data.students),
    name: body.name.trim(),
    student_no,
    email: body.email?.trim() || null,
    major: body.major?.trim() || null,
    enrollment_year: body.enrollment_year != null ? Number(body.enrollment_year) : null,
    created_at: nowIso(),
  };
  data.students.push(row);
  save();
  return row;
}

export function updateStudent(id, body) {
  const idx = data.students.findIndex((s) => s.id === Number(id));
  if (idx === -1) return null;
  const student_no = body.student_no.trim();
  if (data.students.some((s) => s.student_no === student_no && s.id !== Number(id))) {
    throw new Error("UNIQUE");
  }
  data.students[idx] = {
    ...data.students[idx],
    name: body.name.trim(),
    student_no,
    email: body.email?.trim() || null,
    major: body.major?.trim() || null,
    enrollment_year: body.enrollment_year != null ? Number(body.enrollment_year) : null,
  };
  save();
  return data.students[idx];
}

export function deleteStudent(id) {
  const n = Number(id);
  const before = data.students.length;
  data.students = data.students.filter((s) => s.id !== n);
  data.enrollments = data.enrollments.filter((e) => e.student_id !== n);
  save();
  return data.students.length < before;
}

// --- Courses ---

export function listCourses() {
  return sortDescById(data.courses);
}

export function getCourse(id) {
  return data.courses.find((c) => c.id === Number(id)) || null;
}

export function createCourse(body) {
  const code = body.code.trim();
  if (data.courses.some((c) => c.code === code)) throw new Error("UNIQUE");
  const row = {
    id: nextId(data.courses),
    code,
    name: body.name.trim(),
    credits: Number(body.credits),
    description: body.description?.trim() || null,
    created_at: nowIso(),
  };
  data.courses.push(row);
  save();
  return row;
}

export function updateCourse(id, body) {
  const idx = data.courses.findIndex((c) => c.id === Number(id));
  if (idx === -1) return null;
  const code = body.code.trim();
  if (data.courses.some((c) => c.code === code && c.id !== Number(id))) throw new Error("UNIQUE");
  data.courses[idx] = {
    ...data.courses[idx],
    code,
    name: body.name.trim(),
    credits: Number(body.credits),
    description: body.description?.trim() || null,
  };
  save();
  return data.courses[idx];
}

export function deleteCourse(id) {
  const n = Number(id);
  const before = data.courses.length;
  const planIds = data.course_plans.filter((cp) => cp.course_id === n).map((cp) => cp.id);
  data.enrollments = data.enrollments.filter((e) => !planIds.includes(e.course_plan_id));
  data.course_plans = data.course_plans.filter((cp) => cp.course_id !== n);
  data.courses = data.courses.filter((c) => c.id !== n);
  save();
  return data.courses.length < before;
}

// --- Course plans + enrollments ---

function joinPlan(cp) {
  const c = data.courses.find((x) => x.id === cp.course_id);
  const t = cp.teacher_id != null ? data.teachers.find((x) => x.id === cp.teacher_id) : null;
  return {
    ...cp,
    course_code: c?.code ?? null,
    course_name: c?.name ?? null,
    credits: c?.credits ?? null,
    teacher_name: t?.name ?? null,
    teacher_department: t?.department ?? null,
  };
}

export function listCoursePlansWithJoins() {
  const rows = data.course_plans.map(joinPlan);
  rows.sort((a, b) => {
    if (a.academic_year !== b.academic_year) return String(b.academic_year).localeCompare(String(a.academic_year));
    if (a.semester !== b.semester) return String(a.semester).localeCompare(String(b.semester));
    return String(a.course_code || "").localeCompare(String(b.course_code || ""));
  });
  return rows;
}

export function getCoursePlanWithJoins(id) {
  const cp = data.course_plans.find((x) => x.id === Number(id));
  if (!cp) return null;
  return joinPlan(cp);
}

function planKey(ay, sem, cid) {
  return `${ay}||${sem}||${cid}`;
}

export function createCoursePlan(body) {
  const academic_year = body.academic_year.trim();
  const semester = body.semester.trim();
  const course_id = Number(body.course_id);
  const capacity = Number(body.capacity);
  let teacher_id = body.teacher_id != null && body.teacher_id !== "" ? Number(body.teacher_id) : null;
  if (!data.courses.some((c) => c.id === course_id)) throw new Error("BAD_COURSE");
  if (teacher_id && !data.teachers.some((t) => t.id === teacher_id)) throw new Error("BAD_TEACHER");
  const key = planKey(academic_year, semester, course_id);
  if (
    data.course_plans.some((p) => planKey(p.academic_year, p.semester, p.course_id) === key)
  ) {
    throw new Error("UNIQUE_PLAN");
  }
  const row = {
    id: nextId(data.course_plans),
    academic_year,
    semester,
    course_id,
    teacher_id,
    capacity,
    schedule_note: body.schedule_note?.trim() || null,
    room: body.room?.trim() || null,
    created_at: nowIso(),
  };
  data.course_plans.push(row);
  save();
  return getCoursePlanWithJoins(row.id);
}

export function updateCoursePlan(id, body) {
  const idx = data.course_plans.findIndex((p) => p.id === Number(id));
  if (idx === -1) return null;
  const academic_year = body.academic_year.trim();
  const semester = body.semester.trim();
  const course_id = Number(body.course_id);
  let teacher_id = body.teacher_id != null && body.teacher_id !== "" ? Number(body.teacher_id) : null;
  if (!data.courses.some((c) => c.id === course_id)) throw new Error("BAD_COURSE");
  if (teacher_id && !data.teachers.some((t) => t.id === teacher_id)) throw new Error("BAD_TEACHER");
  const key = planKey(academic_year, semester, course_id);
  if (
    data.course_plans.some(
      (p) =>
        p.id !== Number(id) && planKey(p.academic_year, p.semester, p.course_id) === key
    )
  ) {
    throw new Error("UNIQUE_PLAN");
  }
  data.course_plans[idx] = {
    ...data.course_plans[idx],
    academic_year,
    semester,
    course_id,
    teacher_id,
    capacity: Number(body.capacity),
    schedule_note: body.schedule_note?.trim() || null,
    room: body.room?.trim() || null,
  };
  save();
  return getCoursePlanWithJoins(id);
}

export function deleteCoursePlan(id) {
  const n = Number(id);
  const before = data.course_plans.length;
  data.enrollments = data.enrollments.filter((e) => e.course_plan_id !== n);
  data.course_plans = data.course_plans.filter((p) => p.id !== n);
  save();
  return data.course_plans.length < before;
}

export function listEnrollmentsForPlan(planId) {
  const pid = Number(planId);
  const rows = data.enrollments
    .filter((e) => e.course_plan_id === pid)
    .map((e) => {
      const s = data.students.find((x) => x.id === e.student_id);
      return {
        id: e.id,
        enrolled_at: e.enrolled_at,
        student_id: s?.id ?? e.student_id,
        student_name: s?.name ?? "",
        student_no: s?.student_no ?? "",
        major: s?.major ?? null,
      };
    });
  rows.sort((a, b) => String(a.student_no).localeCompare(String(b.student_no)));
  return rows;
}

export function enrollInPlan(planId, studentId) {
  const pid = Number(planId);
  const sid = Number(studentId);
  const plan = data.course_plans.find((p) => p.id === pid);
  if (!plan) throw new Error("NO_PLAN");
  if (!data.students.some((s) => s.id === sid)) throw new Error("NO_STUDENT");
  const count = data.enrollments.filter((e) => e.course_plan_id === pid).length;
  if (count >= plan.capacity) throw new Error("FULL");
  if (data.enrollments.some((e) => e.course_plan_id === pid && e.student_id === sid)) {
    throw new Error("UNIQUE_ENROLL");
  }
  const row = {
    id: nextId(data.enrollments),
    student_id: sid,
    course_plan_id: pid,
    enrolled_at: nowIso(),
  };
  data.enrollments.push(row);
  save();
  const s = data.students.find((x) => x.id === sid);
  return {
    id: row.id,
    enrolled_at: row.enrolled_at,
    student_id: sid,
    student_name: s?.name ?? "",
    student_no: s?.student_no ?? "",
    major: s?.major ?? null,
  };
}

export function deleteEnrollment(planId, enrollmentId) {
  const pid = Number(planId);
  const eid = Number(enrollmentId);
  const before = data.enrollments.length;
  data.enrollments = data.enrollments.filter((e) => !(e.id === eid && e.course_plan_id === pid));
  save();
  return data.enrollments.length < before;
}
