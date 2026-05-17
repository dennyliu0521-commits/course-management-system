import { useCallback, useEffect, useState } from "react";
import { api } from "../api.js";

export default function AdminApprovals() {
  const [tab, setTab] = useState("enrollments"); // enrollments | users
  return (
    <>
      <h1 className="page-title">审批与用户管理</h1>
      <p className="page-desc">管理选修课审批和教师/学生账号。</p>
      <div className="tab-bar" style={{ marginBottom: "1.25rem" }}>
        <button className={`tab ${tab === "enrollments" ? "tab-active" : ""}`} onClick={() => setTab("enrollments")}>
          选修课审批
        </button>
        <button className={`tab ${tab === "users" ? "tab-active" : ""}`} onClick={() => setTab("users")}>
          用户账号
        </button>
      </div>
      {tab === "enrollments" ? <EnrollmentApprovals /> : <UserManagement />}
    </>
  );
}

function EnrollmentApprovals() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setError(null);
    try { setRows(await api.admin.pendingEnrollments()); } catch (e) { setError(e.message); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleStatus(id, status) {
    try {
      await api.admin.enrollmentStatus(id, status);
      await load();
    } catch (e) { setError(e.message); }
  }

  return (
    <div className="card">
      <h2>待审批选课申请</h2>
      {error && <div className="msg msg-error">{error}</div>}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>学生</th>
              <th>课程</th>
              <th>学年学期</th>
              <th>申请时间</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{r.student_no} {r.student_name}</td>
                <td><span className="badge">{r.course_code}</span> {r.course_name}</td>
                <td>{r.academic_year} · {r.semester}</td>
                <td style={{ fontSize: "0.82rem", color: "var(--muted)" }}>
                  {r.enrolled_at ? new Date(r.enrolled_at).toLocaleString("zh-CN") : "—"}
                </td>
                <td>
                  <div className="btn-row">
                    <button className="btn btn-primary" onClick={() => handleStatus(r.id, "approved")}>通过</button>
                    <button className="btn btn-danger" onClick={() => handleStatus(r.id, "rejected")}>拒绝</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p style={{ color: "var(--muted)", padding: "0.5rem 0" }}>暂无待审批的选课申请。</p>}
      </div>
    </div>
  );
}

function UserManagement() {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({ username: "", password: "", role: "teacher", related_id: "", name: "" });

  const load = useCallback(async () => {
    setError(null);
    try { setUsers(await api.admin.users()); } catch (e) { setError(e.message); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function createUser(e) {
    e.preventDefault();
    setError(null);
    try {
      await api.admin.createUser({
        username: form.username,
        password: form.password,
        role: form.role,
        related_id: form.related_id ? Number(form.related_id) : null,
        name: form.name,
      });
      setForm({ username: "", password: "", role: "teacher", related_id: "", name: "" });
      await load();
    } catch (err) { setError(err.message); }
  }

  return (
    <div className="card">
      <h2>创建用户账号</h2>
      {error && <div className="msg msg-error">{error}</div>}
      <form onSubmit={createUser}>
        <div className="form-grid">
          <label>
            角色
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="teacher">教师</option>
              <option value="student">学生</option>
            </select>
          </label>
          <label>
            姓名
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </label>
          <label>
            用户名
            <input required value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
          </label>
          <label>
            密码
            <input required type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </label>
          <label>
            关联ID（教师/学生ID）
            <input type="number" value={form.related_id} onChange={(e) => setForm({ ...form, related_id: e.target.value })} placeholder="可选" />
          </label>
        </div>
        <button className="btn btn-primary" type="submit" style={{ marginTop: "1rem" }}>创建账号</button>
      </form>

      <h2 style={{ marginTop: "2rem" }}>现有用户</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>用户名</th><th>姓名</th><th>角色</th><th>关联ID</th><th>创建时间</th></tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.username}</td>
                <td>{u.name}</td>
                <td><span className="badge">{u.role === "admin" ? "管理员" : u.role === "teacher" ? "教师" : "学生"}</span></td>
                <td>{u.related_id ?? "—"}</td>
                <td style={{ fontSize: "0.82rem", color: "var(--muted)" }}>
                  {u.created_at ? new Date(u.created_at).toLocaleDateString("zh-CN") : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
