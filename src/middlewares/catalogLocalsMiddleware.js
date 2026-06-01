const { Category } = require("../models");

async function catalogLocalsMiddleware(req, res, next) {
  try {
    res.locals.categories = await Category.findAll({
      where: { isActive: true },
      order: [["sortOrder", "ASC"], ["name", "ASC"]],
    });
  } catch {
    res.locals.categories = [];
  }
  next();
}

module.exports = { catalogLocalsMiddleware };
