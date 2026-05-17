import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "course-management-secret-key-2026";

export function createToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "24h" });
}

// Verify JWT, attach user to req
export function authenticate(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) {
    return res.status(401).json({ error: "请先登录" });
  }
  try {
    const payload = jwt.verify(auth.slice(7), JWT_SECRET);
    req.user = payload; // { id, username, role, relatedId, name }
    next();
  } catch {
    return res.status(401).json({ error: "登录已过期，请重新登录" });
  }
}

// Role guard: only allow listed roles
export function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: "请先登录" });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "权限不足" });
    }
    next();
  };
}
