const path = require("path");
const express = require("express");
const { configureSecurity } = require("./middlewares/securityMiddleware");
const { catalogLocalsMiddleware } = require("./middlewares/catalogLocalsMiddleware");
const { shippingLocalsMiddleware } = require("./middlewares/shippingLocalsMiddleware");
const { paymentLocalsMiddleware } = require("./middlewares/paymentLocalsMiddleware");
const shopRoutes = require("./routes/shopRoutes");
const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const { ensureAppReady } = require("./initializeApp");

function createApp() {
  const app = express();

  app.set("trust proxy", 1);
  app.set("view engine", "ejs");
  app.set("views", path.join(__dirname, "views"));

  app.use(async (req, res, next) => {
    try {
      await ensureAppReady();
      next();
    } catch (error) {
      console.error("Error al inicializar la aplicacion", error);
      res.status(503).send("Servicio no disponible. Revisa la conexion a la base de datos.");
    }
  });

  configureSecurity(app);

  app.use(catalogLocalsMiddleware);
  app.use(shippingLocalsMiddleware);
  app.use(paymentLocalsMiddleware);

  app.use("/", shopRoutes);
  app.use("/auth", authRoutes);
  app.use("/admin", adminRoutes);

  app.use((req, res) => {
    res.status(404).send("Pagina no encontrada.");
  });

  app.use((error, req, res, next) => {
    if (error.code === "EBADCSRFTOKEN") {
      return res.status(403).send("Solicitud invalida por seguridad (CSRF).");
    }
    return next(error);
  });

  return app;
}

module.exports = { createApp };
