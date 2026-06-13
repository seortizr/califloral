const path = require("path");
const express = require("express");
const {
  configureStaticAssets,
  configureSessionSecurity,
} = require("./middlewares/securityMiddleware");
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

  app.get("/health", (req, res) => {
    res.status(200).json({ ok: true, service: "califloral" });
  });

  configureStaticAssets(app);

  app.use(async (req, res, next) => {
    try {
      await ensureAppReady();
      next();
    } catch (error) {
      console.error("Error al inicializar la aplicacion", error);
      const hint = String(error.message || "");
      res
        .status(503)
        .type("html")
        .send(
          `<h1>Servicio no disponible</h1><p>La base de datos no responde o faltan variables de entorno.</p><p><strong>Detalle:</strong> ${hint.replace(/</g, "&lt;")}</p><p>En Vercel revisa DB_HOST, DB_USER, DB_PASSWORD, DB_NAME. En Hostinger activa MySQL remoto.</p>`
        );
    }
  });

  configureSessionSecurity(app);

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
    console.error("Error en la solicitud", error);
    if (!res.headersSent) {
      return res.status(500).send("Ocurrio un error en el servidor.");
    }
    return next(error);
  });

  return app;
}

module.exports = { createApp };
