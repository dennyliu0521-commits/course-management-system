import { useCallback, useEffect, useState } from "react";
import { api } from "../api.js";

const empty = { code: "", name: "", credits: 3, description: "" };

export default function Courses() {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setError(null);
    const data = await api.courses.list();
    setRows(data);
  }, []);

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [load]);

  function startEdit(row) {
    setEditingId(row.id);
    setForm({
      code: row.code,
      name: row.name,
      credits: row.credits,
      description: row.description || "",
    });
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError(null);
    try {
      if (editingId) {
        await api.courses.update(editingId, form);
      } else {
        await api.courses.create(form);
      }
      setForm(empty);
      setEditingId(null);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function remove(id) {
    if (!confirm("确定删除该课程？若已用于开课计划将无法删除。")) return;
    setError(null);
    try {
      await api.courses.remove(id);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
      <h1 className="page-title">课程管理</h1>
      <p className="page-desc">维护课程代码、名称、学分与简介。</p>
      {error && <div className="msg msg-error">{error}</div>}
      <div className="card">
        <h2>{editingId ? "编辑课程" : "新增课程"}</h2>
        <form onSubmit={onSubmit}>
          <div className="form-grid">
            <label>
              课程代码
              <input
                required
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                placeholder="如 CS101"
              />
            </label>
            <label>
              课程名称
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </label>
            <label>
              学分
              <input
                type="number"
                min="0.5"
                step="0.5"
                required
                value={form.credits}
                onChange={(e) => setForm({ ...form, credits: e.target.value })}
              />
            </label>
          </div>
          <label style={{ marginTop: "1rem" }}>
            简介
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </label>
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
        <h2>课程列表</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>代码</th>
                <th>名称</th>
                <th>学分</th>
                <th>简介</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>
                    <span className="badge">{r.code}</span>
                  </td>
                  <td>{r.name}</td>
                  <td>{r.credits}</td>
                  <td style={{ maxWidth: 280, color: "var(--muted)" }}>
                    {r.description || "—"}
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
            <p style={{ color: "var(--muted)", padding: "0.5rem 0" }}>暂无课程，请在上方添加。</p>
          )}
        </div>
      </div>
    </>
  );
}
