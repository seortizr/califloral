require("dotenv").config();

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught exception:", error);
});

let app;

function getApp() {
  if (!app) {
    const { createApp } = require("../src/createApp");
    app = createApp();
  }
  return app;
}

module.exports = (req, res) =>
  new Promise((resolve) => {
    const done = () => resolve();

    try {
      const expressApp = getApp();
      res.once("finish", done);
      res.once("close", done);

      expressApp(req, res, (error) => {
        if (error) {
          console.error("Error Express:", error);
          if (!res.headersSent) {
            res.status(500).send("Error del servidor.");
          }
        }
        done();
      });
    } catch (error) {
      console.error("Error al cargar la app:", error);
      if (!res.headersSent) {
        res.status(500).send(`Error al iniciar: ${error.message || "desconocido"}`);
      }
      done();
    }
  });
