import { useCallback, useEffect, useState } from "react";
import { api } from "../api.js";

const MAJORS = [
  "计算机科学",
  "软件工程",
  "人工智能",
  "数据科学",
  "信息管理",
  "网络工程",
  "电子信息工程",
  "数学与应用数学",
];

const currentYear = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 21 }, (_, i) => currentYear - 10 + i); // 10 years ago to 10 years ahead
const CLASS_NUMBERS = Array.from({ length: 20 }, (_, i) => String(i + 1).padStart(2, "0"));

const empty = { enrollment_year: "", major: "", class_number: "" };

export default function Classes() {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setError(null);
    const data = await api.classes.list();
    setRows(data);
  }, []);

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [load]);

  function startEdit(row) {
    setEditingId(row.id);
    setForm({
      enrollment_year: String(row.enrollment_year),
      major: row.major,
      class_number: row.class_number,
    });
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError(null);
    try {
      const payload = {
        enrollment_year: Number(form.enrollment_year),
        major: form.major,
        class_number: form.class_number,
      };
      if (editingId) await api.classes.update(editingId, payload);
      else await api.classes.create(payload);
      setForm(empty);
      setEditingId(null);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function remove(id) {
    if (!confirm("确定删除该班级？班级下的学生将失去班级归属。")) return;
    setError(null);
    try {
      await api.classes.remove(id);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
      <h1 className="page-title">班级管理</h1>
      <p className="page-desc">班级由入学年份、专业和班级序号唯一确定，班级号码格式为：年份_专业_班级序号。</p>
      {error && <div className="msg msg-error">{error}</div>}
      <div className="card">
        <h2>{editingId ? "编辑班级" : "新增班级"}</h2>
        <form onSubmit={onSubmit}>
          <div className="form-grid">
            <label>
              入学年份
              <select
                required
                value={form.enrollment_year}
                onChange={(e) => setForm({ ...form, enrollment_year: e.target.value })}
              >
                <option value="">请选择</option>
                {YEAR_OPTIONS.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </label>
            <label>
              专业
              <select
                required
                value={form.major}
                onChange={(e) => setForm({ ...form, major: e.target.value })}
              >
                <option value="">请选择</option>
                {MAJORS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </label>
            <label>
              班级序号
              <select
                required
                value={form.class_number}
                onChange={(e) => setForm({ ...form, class_number: e.target.value })}
              >
                <option value="">请选择</option>
                {CLASS_NUMBERS.map((cn) => (
                  <option key={cn} value={cn}>{cn}班</option>
                ))}
              </select>
            </label>
          </div>
          <div style={{ marginTop: "0.75rem", color: "var(--muted)", fontSize: "0.85rem" }}>
            班级号码预览：
            <strong style={{ color: "var(--accent)", fontFamily: "monospace" }}>
              {form.enrollment_year && form.major && form.class_number
                ? `${form.enrollment_year}_${form.major}_${form.class_number}`
                : "—"}
            </strong>
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
        <h2>班级列表</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>班级号码</th>
                <th>入学年份</th>
                <th>专业</th>
                <th>班级序号</th>
                <th>学生人数</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>
                    <span className="badge">{r.class_code}</span>
                  </td>
                  <td>{r.enrollment_year}</td>
                  <td>{r.major}</td>
                  <td>{r.class_number}班</td>
                  <td>{r.student_count ?? 0}</td>
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
            <p style={{ color: "var(--muted)", padding: "0.5rem 0" }}>暂无班级，请先添加。</p>
          )}
        </div>
      </div>
    </>
  );
}
