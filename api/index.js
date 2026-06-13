require("dotenv").config();

let app;

try {
  const { createApp } = require("../src/createApp");
  app = createApp();
} catch (error) {
  console.error("No se pudo cargar la aplicacion", error);
  module.exports = (req, res) => {
    res
      .status(500)
      .send(`Error al iniciar la aplicacion: ${error.message || "desconocido"}`);
  };
  return;
}

module.exports = app;
