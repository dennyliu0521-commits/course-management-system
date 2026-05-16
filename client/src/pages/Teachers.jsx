import { useCallback, useEffect, useState } from "react";
import { api } from "../api.js";

const empty = { name: "", email: "", phone: "", department: "", title: "" };

export default function Teachers() {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setError(null);
    const data = await api.teachers.list();
    setRows(data);
  }, []);

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [load]);

  function startEdit(row) {
    setEditingId(row.id);
    setForm({
      name: row.name,
      email: row.email || "",
      phone: row.phone || "",
      department: row.department || "",
      title: row.title || "",
    });
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError(null);
    try {
      if (editingId) await api.teachers.update(editingId, form);
      else await api.teachers.create(form);
      setForm(empty);
      setEditingId(null);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function remove(id) {
    if (!confirm("确定删除该教师？")) return;
    setError(null);
    try {
      await api.teachers.remove(id);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
      <h1 className="page-title">教师管理</h1>
      <p className="page-desc">维护教师基本信息与院系职称。</p>
      {error && <div className="msg msg-error">{error}</div>}
      <div className="card">
        <h2>{editingId ? "编辑教师" : "新增教师"}</h2>
        <form onSubmit={onSubmit}>
          <div className="form-grid">
            <label>
              姓名
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </label>
            <label>
              邮箱
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </label>
            <label>
              电话
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </label>
            <label>
              院系
              <input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
            </label>
            <label>
              职称
              <input
                placeholder="如 副教授"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
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
        <h2>教师列表</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>姓名</th>
                <th>院系</th>
                <th>职称</th>
                <th>联系方式</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.name}</td>
                  <td>{r.department || "—"}</td>
                  <td>{r.title || "—"}</td>
                  <td style={{ color: "var(--muted)", fontSize: "0.85rem" }}>
                    {[r.email, r.phone].filter(Boolean).join(" · ") || "—"}
                  </td>
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
            <p style={{ color: "var(--muted)", padding: "0.5rem 0" }}>暂无教师。</p>
          )}
        </div>
      </div>
    </>
  );
}
