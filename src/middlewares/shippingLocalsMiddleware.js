const { getShippingOptions } = require("../services/shippingService");

function shippingLocalsMiddleware(req, res, next) {
  res.locals.shippingOptions = getShippingOptions();
  next();
}

module.exports = { shippingLocalsMiddleware };
