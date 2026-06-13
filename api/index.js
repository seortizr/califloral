require("dotenv").config();

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection:", reason);
});

let handler;

try {
  const serverless = require("serverless-http");
  const { createApp } = require("../src/createApp");
  const app = createApp();
  handler = serverless(app, {
    binary: ["image/*", "application/octet-stream", "multipart/form-data"],
  });
} catch (error) {
  console.error("No se pudo cargar la aplicacion", error);
  handler = async (req, res) => {
    res
      .status(500)
      .send(`Error al iniciar la aplicacion: ${error.message || "desconocido"}`);
  };
}

module.exports = handler;
