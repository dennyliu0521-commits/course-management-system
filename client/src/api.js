function getToken() {
  return localStorage.getItem("token");
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = { "Content-Type": "application/json", ...options.headers };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`/api${path}`, { headers, ...options });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === "Failed to fetch" || msg.includes("NetworkError") || msg.includes("Load failed")) {
      throw new Error(
        "无法连接后端 API，请确认已启动 server（端口 3001）。开发：在根目录执行 npm run dev 同时启动前后端。"
      );
    }
    throw e;
  }
  if (res.status === 204) return null;
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    throw new Error("响应解析失败（可能不是 JSON，请检查是否已构建前端并访问正确地址）");
  }
  if (!res.ok) {
    throw new Error(data?.error || `请求失败 (${res.status})`);
  }
  return data;
}

export const api = {
  auth: {
    login: (username, password) => request("/auth/login", { method: "POST", body: JSON.stringify({ username, password }) }),
    me: () => request("/auth/me"),
  },
  teachers: {
    list: () => request("/teachers"),
    get: (id) => request(`/teachers/${id}`),
    create: (body) => request("/teachers", { method: "POST", body: JSON.stringify(body) }),
    update: (id, body) => request(`/teachers/${id}`, { method: "PUT", body: JSON.stringify(body) }),
    remove: (id) => request(`/teachers/${id}`, { method: "DELETE" }),
  },
  students: {
    list: () => request("/students"),
    get: (id) => request(`/students/${id}`),
    create: (body) => request("/students", { method: "POST", body: JSON.stringify(body) }),
    update: (id, body) => request(`/students/${id}`, { method: "PUT", body: JSON.stringify(body) }),
    remove: (id) => request(`/students/${id}`, { method: "DELETE" }),
  },
  courses: {
    list: () => request("/courses"),
    get: (id) => request(`/courses/${id}`),
    create: (body) => request("/courses", { method: "POST", body: JSON.stringify(body) }),
    update: (id, body) => request(`/courses/${id}`, { method: "PUT", body: JSON.stringify(body) }),
    remove: (id) => request(`/courses/${id}`, { method: "DELETE" }),
  },
  coursePlans: {
    list: () => request("/course-plans"),
    get: (id) => request(`/course-plans/${id}`),
    create: (body) => request("/course-plans", { method: "POST", body: JSON.stringify(body) }),
    update: (id, body) => request(`/course-plans/${id}`, { method: "PUT", body: JSON.stringify(body) }),
    remove: (id) => request(`/course-plans/${id}`, { method: "DELETE" }),
    enrollments: (planId) => request(`/course-plans/${planId}/enrollments`),
    enroll: (planId, student_id) =>
      request(`/course-plans/${planId}/enroll`, { method: "POST", body: JSON.stringify({ student_id }) }),
    dropEnrollment: (planId, enrollmentId) =>
      request(`/course-plans/${planId}/enrollments/${enrollmentId}`, { method: "DELETE" }),
  },
  classes: {
    list: () => request("/classes"),
    get: (id) => request(`/classes/${id}`),
    create: (body) => request("/classes", { method: "POST", body: JSON.stringify(body) }),
    update: (id, body) => request(`/classes/${id}`, { method: "PUT", body: JSON.stringify(body) }),
    remove: (id) => request(`/classes/${id}`, { method: "DELETE" }),
    students: (classId) => request(`/classes/${classId}/students`),
  },
  calendar: {
    weekly: (date) => request(`/calendar/weekly?date=${encodeURIComponent(date)}`),
  },
  teacher: {
    myPlans: () => request("/teacher/my-plans"),
    planStatus: (id, status) => request(`/teacher/plans/${id}/status`, { method: "PUT", body: JSON.stringify({ status }) }),
    planStudents: (planId) => request(`/teacher/plan/${planId}/students`),
    grades: () => request("/teacher/grades"),
    saveGrade: (body) => request("/teacher/grades", { method: "POST", body: JSON.stringify(body) }),
  },
  student: {
    mySchedule: () => request("/student/my-schedule"),
    myGrades: () => request("/student/my-grades"),
    availableElectives: () => request("/student/available-electives"),
    enroll: (course_plan_id) => request("/student/enroll", { method: "POST", body: JSON.stringify({ course_plan_id }) }),
    dropEnroll: (planId) => request(`/student/enroll/${planId}`, { method: "DELETE" }),
  },
  admin: {
    pendingEnrollments: () => request("/admin/pending-enrollments"),
    enrollmentStatus: (id, status) => request(`/admin/enrollments/${id}/status`, { method: "PUT", body: JSON.stringify({ status }) }),
    users: () => request("/admin/users"),
    createUser: (body) => request("/admin/users", { method: "POST", body: JSON.stringify(body) }),
  },
};
