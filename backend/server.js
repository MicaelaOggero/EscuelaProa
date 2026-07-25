const express = require("express");
const path = require("path");
const cors = require("cors");
const morgan = require("morgan");
require("dotenv").config();

const connectDB = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const noticiaRoutes = require("./routes/noticiaRoutes");
const calendarioRoutes = require("./routes/calendarioRoutes");
const contactoRoutes = require("./routes/contactoRoutes");
const cursoRoutes = require("./routes/cursoRoutes");
const materiaCursoRoutes = require("./routes/materiaCursoRoutes");
const contenidoRoutes = require("./routes/contenidoRoutes");

const app = express();

const corsOrigin = process.env.CORS_ORIGIN;
app.use(
  cors(
    corsOrigin
      ? {
          origin: corsOrigin.split(",").map((s) => s.trim()),
          credentials: true
        }
      : undefined
  )
);
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/noticias", noticiaRoutes);
app.use("/api/calendario", calendarioRoutes);
app.use("/api/contacto", contactoRoutes);
app.use("/api/cursos", cursoRoutes);
app.use("/api/materias-curso", materiaCursoRoutes);
app.use("/api/contenidos", contenidoRoutes);

app.use((req, res) => {
  res.status(404).json({ message: "Not found" });
});

app.use((err, req, res, next) => {
  // eslint-disable-next-line no-unused-vars
  console.error(err);
  if (err && err.message === "Solo se permiten imagenes.") {
    res.status(400).json({ message: err.message });
    return;
  }
  if (err && err.code === "LIMIT_FILE_SIZE") {
    res.status(400).json({ message: "Cada imagen debe pesar menos de 5 MB." });
    return;
  }
  if (err && err.code === "LIMIT_FILE_COUNT") {
    res.status(400).json({ message: "Solo puedes subir hasta 8 imagenes por noticia." });
    return;
  }
  res.status(500).json({ message: "Server error" });
});

const PORT = process.env.PORT || 4000;

(async function bootstrap() {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`Backend listening on http://localhost:${PORT}`);
  });
})();
