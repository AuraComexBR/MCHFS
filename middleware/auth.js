function requireLogin(req, res, next) {
  if (!req.user) return res.redirect(`/login?lang=${req.lang}`);
  next();
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).send('Acesso restrito à administradora do programa.');
  }
  next();
}

module.exports = { requireLogin, requireAdmin };
