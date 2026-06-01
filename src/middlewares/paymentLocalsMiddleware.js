const { getPaymentOptions } = require("../services/paymentService");

function paymentLocalsMiddleware(req, res, next) {
  res.locals.paymentOptions = getPaymentOptions();
  next();
}

module.exports = { paymentLocalsMiddleware };
