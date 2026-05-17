import { useCallback, useEffect, useState } from "react";
import { api } from "../api.js";

const empty = { name: "", student_no: "", email: "", class_id: "" };

export default function Students() {
  const [rows, setRows] = useState([]);
  const [classes, setClasses] = useState([]);
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setError(null);
    const [data, cls] = await Promise.all([api.students.list(), api.classes.list()]);
    setRows(data);
    setClasses(cls);
  }, []);

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [load]);

  function startEdit(row) {
    setEditingId(row.id);
    setForm({
      name: row.name,
      student_no: row.student_no,
      email: row.email || "",
      class_id: row.class_id ? String(row.class_id) : "",
    });
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError(null);
    try {
      const payload = {
        name: form.name,
        student_no: form.student_no,
        email: form.email,
        class_id: form.class_id ? Number(form.class_id) : null,
      };
      if (editingId) await api.students.update(editingId, payload);
      else await api.students.create(payload);
      setForm(empty);
      setEditingId(null);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function remove(id) {
    if (!confirm("确定删除该学生？")) return;
    setError(null);
    try {
      await api.students.remove(id);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
      <h1 className="page-title">学生管理</h1>
      <p className="page-desc">维护学号、姓名、邮箱与班级归属。班级需先在「班级管理」中创建。</p>
      {error && <div className="msg msg-error">{error}</div>}
      <div className="card">
        <h2>{editingId ? "编辑学生" : "新增学生"}</h2>
        <form onSubmit={onSubmit}>
          <div className="form-grid">
            <label>
              姓名
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </label>
            <label>
              学号
              <input required value={form.student_no} onChange={(e) => setForm({ ...form, student_no: e.target.value })} />
            </label>
            <label>
              邮箱
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </label>
            <label>
              班级
              <select value={form.class_id} onChange={(e) => setForm({ ...form, class_id: e.target.value })}>
                <option value="">未分配</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.class_code}（{c.enrollment_year}届 {c.major} {c.class_number}班）
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="btn-row" style={{ marginTop: "1rem" }}>
            <button className="btn btn-primary" type="submit">
              {editingId ? "保存" : "添加"}
            </button>
            {editingId && (
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  setEditingId(null);
                  setForm(empty);
                }}
              >
                取消编辑
              </button>
            )}
          </div>
        </form>
      </div>
      <div className="card">
        <h2>学生列表</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>学号</th>
                <th>姓名</th>
                <th>班级</th>
                <th>邮箱</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.student_no}</td>
                  <td>{r.name}</td>
                  <td>
                    {r.class_code ? (
                      <span className="badge">{r.class_code}</span>
                    ) : (
                      <span style={{ color: "var(--muted)" }}>—</span>
                    )}
                  </td>
                  <td style={{ color: "var(--muted)" }}>{r.email || "—"}</td>
                  <td>
                    <div className="btn-row">
                      <button type="button" className="btn btn-ghost" onClick={() => startEdit(r)}>
                        编辑
                      </button>
                      <button type="button" className="btn btn-danger" onClick={() => remove(r.id)}>
                        删除
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && (
            <p style={{ color: "var(--muted)", padding: "0.5rem 0" }}>暂无学生。</p>
          )}
        </div>
      </div>
    </>
  );
}
