const { getPaymentOptions } = require("../services/paymentService");
const { getPaymentConfig, buildAdminView } = require("../services/paymentConfigService");

async function paymentLocalsMiddleware(req, res, next) {
  try {
    res.locals.paymentOptions = await getPaymentOptions();
    res.locals.paymentConfig = buildAdminView(await getPaymentConfig());
  } catch {
    res.locals.paymentOptions = [];
    res.locals.paymentConfig = null;
  }
  next();
}

module.exports = { paymentLocalsMiddleware };
