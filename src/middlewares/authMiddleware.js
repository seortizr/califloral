function isAuthenticated(req, res, next) {
  if (!req.session.userId) {
    req.session.returnTo = req.method === "GET" ? req.originalUrl : "/";
    return res.redirect("/auth/login");
  }
  return next();
}

function isGuest(req, res, next) {
  if (req.session.userId) {
    return res.redirect("/");
  }
  return next();
}

function isAdmin(req, res, next) {
  if (!req.session.userId || req.session.role !== "admin") {
    return res.status(403).send("No autorizado.");
  }
  return next();
}

module.exports = { isAuthenticated, isGuest, isAdmin };
