require("dotenv").config();
const { createApp } = require("./createApp");
const { ensureAppReady } = require("./initializeApp");

const PORT = process.env.PORT || 3000;
const app = createApp();

async function bootstrap() {
  try {
    await ensureAppReady();
    app.listen(PORT, () => {
      console.log(`Servidor iniciado en http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("No se pudo iniciar el servidor", error);
    process.exit(1);
  }
}

bootstrap();
