import { useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";

export default function Login() {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("admin");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const user = await login(username, password);
      if (user.role !== role) {
        throw new Error(`该账号角色为"${user.role === "admin" ? "管理员" : user.role === "teacher" ? "教师" : "学生"}"，与所选角色"${role === "admin" ? "管理员" : role === "teacher" ? "教师" : "学生"}"不匹配`);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <h1 className="login-title">课程管理系统</h1>
        <p className="login-desc">选择角色并输入账号密码登录</p>
        {error && <div className="msg msg-error">{error}</div>}
        <form onSubmit={onSubmit}>
          <label>
            登录角色
            <select value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="admin">管理员</option>
              <option value="teacher">教师</option>
              <option value="student">学生</option>
            </select>
          </label>
          <label style={{ marginTop: "1rem" }}>
            用户名
            <input
              required
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={role === "admin" ? "admin" : "请输入用户名"}
            />
          </label>
          <label style={{ marginTop: "1rem" }}>
            密码
            <input
              required
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入密码"
            />
          </label>
          <button
            className="btn btn-primary"
            type="submit"
            disabled={loading}
            style={{ marginTop: "1.5rem", width: "100%" }}
          >
            {loading ? "登录中..." : "登录"}
          </button>
        </form>
        <p className="login-help">
          默认管理员：admin / admin123<br />
          教师和学生账号由管理员在「审批与用户」中创建
        </p>
      </div>
    </div>
  );
}
