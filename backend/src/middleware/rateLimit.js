const windows = new Map();

function rateLimit({ windowMs = 60_000, max = 20 } = {}) {
  return (req, res, next) => {
    const key = req.ip || req.socket.remoteAddress || "unknown";
    const now = Date.now();
    const current = windows.get(key);
    if (!current || now - current.startedAt >= windowMs) {
      windows.set(key, { startedAt: now, count: 1 });
      return next();
    }
    if (current.count >= max) {
      res.set("Retry-After", String(Math.ceil((windowMs - (now - current.startedAt)) / 1000)));
      return res.status(429).json({ success: false, message: "Too many requests. Please try again shortly." });
    }
    current.count += 1;
    return next();
  };
}

module.exports = rateLimit;