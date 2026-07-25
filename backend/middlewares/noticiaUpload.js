const fs = require("fs");
const path = require("path");
const multer = require("multer");

const uploadDir = path.join(__dirname, "..", "uploads", "noticias");
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, uploadDir);
  },
  filename(req, file, cb) {
    const ext = path.extname(file.originalname || "").toLowerCase();
    const base = path
      .basename(file.originalname || "imagen", ext)
      .replace(/[^a-zA-Z0-9-_]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40) || "imagen";
    cb(null, Date.now() + "-" + base + ext);
  }
});

function fileFilter(req, file, cb) {
  if (!file.mimetype || file.mimetype.indexOf("image/") !== 0) {
    cb(new Error("Solo se permiten imagenes."));
    return;
  }
  cb(null, true);
}

module.exports = multer({
  storage,
  fileFilter,
  limits: {
    files: 8,
    fileSize: 5 * 1024 * 1024
  }
});
