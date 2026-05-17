import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../api.js";

const emptyPlan = {
  academic_year: "2024-2025",
  semester: "秋季",
  course_id: "",
  teacher_id: "",
  capacity: 40,
  schedule_note: "",
  room: "",
  course_start_date: "",
  course_end_date: "",
  class_ids: [],
};

function toDatetimeLocal(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function CoursePlanning() {
  const [plans, setPlans] = useState([]);
  const [courses, setCourses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [form, setForm] = useState(emptyPlan);
  const [editingId, setEditingId] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [enrollments, setEnrollments] = useState([]);
  const [enrollStudentId, setEnrollStudentId] = useState("");
  const [error, setError] = useState(null);

  const loadAll = useCallback(async () => {
    setError(null);
    const [p, c, t, s, cl] = await Promise.all([
      api.coursePlans.list(),
      api.courses.list(),
      api.teachers.list(),
      api.students.list(),
      api.classes.list(),
    ]);
    setPlans(p);
    setCourses(c);
    setTeachers(t);
    setStudents(s);
    setClasses(cl);
  }, []);

  useEffect(() => {
    loadAll().catch((e) => setError(e.message));
  }, [loadAll]);

  const selected = useMemo(() => plans.find((x) => x.id === selectedId) || null, [plans, selectedId]);

  useEffect(() => {
    if (!selectedId) {
      setEnrollments([]);
      return;
    }
    let cancelled = false;
    api.coursePlans
      .enrollments(selectedId)
      .then((rows) => {
        if (!cancelled) setEnrollments(rows);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId, plans]);

  function startEdit(row) {
    setEditingId(row.id);
    setForm({
      academic_year: row.academic_year,
      semester: row.semester,
      course_id: String(row.course_id),
      teacher_id: row.teacher_id ? String(row.teacher_id) : "",
      capacity: row.capacity,
      schedule_note: row.schedule_note || "",
      room: row.room || "",
      course_start_date: toDatetimeLocal(row.course_start_date),
      course_end_date: toDatetimeLocal(row.course_end_date),
      class_ids: (row.classes || []).map((c) => c.id),
    });
  }

  function toggleClassId(id) {
    setForm((f) => {
      const set = new Set(f.class_ids);
      if (set.has(id)) set.delete(id);
      else set.add(id);
      return { ...f, class_ids: [...set] };
    });
  }

  async function onSubmitPlan(e) {
    e.preventDefault();
    setError(null);
    try {
      const payload = {
        academic_year: form.academic_year,
        semester: form.semester,
        course_id: Number(form.course_id),
        teacher_id: form.teacher_id === "" ? null : Number(form.teacher_id),
        capacity: Number(form.capacity),
        schedule_note: form.schedule_note,
        room: form.room,
        course_start_date: form.course_start_date ? new Date(form.course_start_date).toISOString() : null,
        course_end_date: form.course_end_date ? new Date(form.course_end_date).toISOString() : null,
        class_ids: form.class_ids || [],
      };
      if (editingId) await api.coursePlans.update(editingId, payload);
      else await api.coursePlans.create(payload);
      setForm(emptyPlan);
      setEditingId(null);
      await loadAll();
    } catch (err) {
      setError(err.message);
    }
  }

  async function removePlan(id) {
    if (!confirm("确定删除该开课计划？将同时删除相关选课记录。")) return;
    setError(null);
    try {
      await api.coursePlans.remove(id);
      if (selectedId === id) setSelectedId(null);
      await loadAll();
    } catch (err) {
      setError(err.message);
    }
  }

  async function addEnrollment(e) {
    e.preventDefault();
    if (!selectedId || !enrollStudentId) return;
    setError(null);
    try {
      await api.coursePlans.enroll(selectedId, Number(enrollStudentId));
      setEnrollStudentId("");
      const rows = await api.coursePlans.enrollments(selectedId);
      setEnrollments(rows);
      await loadAll();
    } catch (err) {
      setError(err.message);
    }
  }

  async function dropEnrollment(enrollmentId) {
    if (!selectedId) return;
    setError(null);
    try {
      await api.coursePlans.dropEnrollment(selectedId, enrollmentId);
      const rows = await api.coursePlans.enrollments(selectedId);
      setEnrollments(rows);
      await loadAll();
    } catch (err) {
      setError(err.message);
    }
  }

  const enrolledCount = enrollments.length;
  const cap = selected?.capacity ?? 0;

  return (
    <>
      <h1 className="page-title">课程规划</h1>
      <p className="page-desc">按学年学期排课：指定课程、任课教师、教室、容量、关联班级，并管理学生选课。</p>
      {error && <div className="msg msg-error">{error}</div>}
      <div className="split">
        <div>
          <div className="card">
            <h2>{editingId ? "编辑开课计划" : "新增开课计划"}</h2>
            <form onSubmit={onSubmitPlan}>
              <div className="form-grid">
                <label>
                  学年
                  <input
                    required
                    value={form.academic_year}
                    onChange={(e) => setForm({ ...form, academic_year: e.target.value })}
                    placeholder="2024-2025"
                  />
                </label>
                <label>
                  学期
                  <select
                    required
                    value={form.semester}
                    onChange={(e) => setForm({ ...form, semester: e.target.value })}
                  >
                    <option value="春季">春季</option>
                    <option value="秋季">秋季</option>
                    <option value="夏季小学期">夏季小学期</option>
                  </select>
                </label>
                <label>
                  课程
                  <select
                    required
                    value={form.course_id}
                    onChange={(e) => setForm({ ...form, course_id: e.target.value })}
                  >
                    <option value="">请选择</option>
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.code} {c.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  任课教师
                  <select value={form.teacher_id} onChange={(e) => setForm({ ...form, teacher_id: e.target.value })}>
                    <option value="">未指定</option>
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                        {t.department ? `（${t.department}）` : ""}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  容量
                  <input
                    type="number"
                    min="1"
                    required
                    value={form.capacity}
                    onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                  />
                </label>
                <label>
                  教室
                  <input value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })} />
                </label>
                <label>
                  开始时间
                  <input
                    type="datetime-local"
                    value={form.course_start_date || ""}
                    onChange={(e) => setForm({ ...form, course_start_date: e.target.value })}
                  />
                </label>
                <label>
                  结束时间
                  <input
                    type="datetime-local"
                    value={form.course_end_date || ""}
                    onChange={(e) => setForm({ ...form, course_end_date: e.target.value })}
                  />
                </label>
              </div>
              {/* Class selection */}
              <div style={{ marginTop: "1rem" }}>
                <label style={{ marginBottom: "0.5rem", display: "block" }}>
                  关联班级
                </label>
                {classes.length === 0 ? (
                  <p style={{ color: "var(--muted)", fontSize: "0.85rem" }}>
                    暂无班级，请先在「班级管理」中添加。
                  </p>
                ) : (
                  <div className="class-check-grid">
                    {classes.map((cl) => (
                      <label key={cl.id} className="class-check-label">
                        <input
                          type="checkbox"
                          checked={form.class_ids.includes(cl.id)}
                          onChange={() => toggleClassId(cl.id)}
                        />
                        <span className="badge">{cl.class_code}</span>
                        <span style={{ fontSize: "0.82rem", color: "var(--muted)" }}>
                          {cl.enrollment_year}届 {cl.major} {cl.class_number}班
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
              <label style={{ marginTop: "1rem" }}>
                上课时间说明
                <input
                  placeholder="如 周一 3-4 节"
                  value={form.schedule_note}
                  onChange={(e) => setForm({ ...form, schedule_note: e.target.value })}
                />
              </label>
              <div className="btn-row" style={{ marginTop: "1rem" }}>
                <button className="btn btn-primary" type="submit">
                  {editingId ? "保存" : "创建计划"}
                </button>
                {editingId && (
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => {
                      setEditingId(null);
                      setForm(emptyPlan);
                    }}
                  >
                    取消编辑
                  </button>
                )}
              </div>
            </form>
          </div>
          <div className="card">
            <h2>开课计划列表</h2>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>学年学期</th>
                    <th>课程</th>
                    <th>教师</th>
                    <th>关联班级</th>
                    <th>教室</th>
                    <th>开始 / 结束</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {plans.map((p) => (
                    <tr
                      key={p.id}
                      onClick={() => setSelectedId(p.id)}
                      style={{
                        cursor: "pointer",
                        background: selectedId === p.id ? "rgba(61, 139, 253, 0.06)" : undefined,
                      }}
                    >
                      <td>
                        {p.academic_year} · {p.semester}
                      </td>
                      <td>
                        <span className="badge">{p.course_code}</span> {p.course_name}
                      </td>
                      <td>{p.teacher_name || "—"}</td>
                      <td style={{ fontSize: "0.82rem" }}>
                        {p.class_codes?.length > 0
                          ? p.class_codes.map((cd) => (
                              <span key={cd} className="badge" style={{ marginRight: 4 }}>
                                {cd}
                              </span>
                            ))
                          : "—"}
                      </td>
                      <td>{p.room || "—"}</td>
                      <td style={{ color: "var(--muted)", fontSize: "0.82rem" }}>
                        {p.course_start_date
                          ? new Date(p.course_start_date).toLocaleString("zh-CN", {
                              month: "2-digit",
                              day: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "—"}
                        {" ~ "}
                        {p.course_end_date
                          ? new Date(p.course_end_date).toLocaleString("zh-CN", {
                              month: "2-digit",
                              day: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "—"}
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <div className="btn-row">
                          <button type="button" className="btn btn-ghost" onClick={() => startEdit(p)}>
                            编辑
                          </button>
                          <button type="button" className="btn btn-danger" onClick={() => removePlan(p.id)}>
                            删除
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {plans.length === 0 && (
                <p style={{ color: "var(--muted)", padding: "0.5rem 0" }}>暂无开课计划，请先添加课程与教师。</p>
              )}
            </div>
            <p style={{ color: "var(--muted)", fontSize: "0.85rem", marginTop: "0.75rem" }}>
              点击表格行可选中计划，在右侧管理选课。
            </p>
          </div>
        </div>
        <div className="card" style={{ position: "sticky", top: "1rem" }}>
          <h2>选课管理</h2>
          {!selected ? (
            <p style={{ color: "var(--muted)" }}>请从左侧列表选择一条开课计划。</p>
          ) : (
            <>
              <p style={{ margin: "0 0 1rem", fontSize: "0.95rem" }}>
                <strong>{selected.course_code}</strong> {selected.course_name}
                <br />
                <span style={{ color: "var(--muted)", fontSize: "0.85rem" }}>
                  {selected.academic_year} {selected.semester}
                  {selected.teacher_name ? ` · ${selected.teacher_name}` : ""}
                </span>
              </p>
              <p style={{ margin: "0 0 0.75rem", fontSize: "0.95rem" }}>
                已选 <strong>{enrolledCount}</strong> / {cap} 人
              </p>
              <form onSubmit={addEnrollment}>
                <label>
                  添加学生选课
                  <select
                    required
                    value={enrollStudentId}
                    onChange={(e) => setEnrollStudentId(e.target.value)}
                  >
                    <option value="">请选择学生</option>
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.student_no} {s.name}
                        {s.class_code ? ` (${s.class_code})` : ""}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  className="btn btn-primary"
                  type="submit"
                  style={{ marginTop: "0.75rem", width: "100%" }}
                  disabled={enrolledCount >= cap}
                >
                  {enrolledCount >= cap ? "人数已满" : "加入选课"}
                </button>
              </form>
              <div style={{ marginTop: "1.25rem" }}>
                <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--muted)", marginBottom: "0.5rem" }}>
                  选课名单
                </div>
                <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                  {enrollments.map((e) => (
                    <li
                      key={e.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "0.45rem 0",
                        borderBottom: "1px solid var(--border)",
                        fontSize: "0.9rem",
                      }}
                    >
                      <span>
                        {e.student_no} {e.student_name}
                        {e.class_code ? (
                          <span style={{ color: "var(--muted)", fontSize: "0.8rem" }}> · {e.class_code}</span>
                        ) : null}
                      </span>
                      <button type="button" className="btn btn-danger" onClick={() => dropEnrollment(e.id)}>
                        退选
                      </button>
                    </li>
                  ))}
                </ul>
                {enrollments.length === 0 && (
                  <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>暂无选课记录。</p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
