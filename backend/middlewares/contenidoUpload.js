const multer = require("multer");

function fileFilter(req, file, cb) {
  const allowed = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "text/plain",
    "image/png",
    "image/jpeg",
    "image/webp",
    "application/zip",
    "application/x-zip-compressed"
  ];

  if (!file.mimetype || allowed.indexOf(file.mimetype) === -1) {
    cb(new Error("Solo se permiten archivos PDF, Office, imágenes o ZIP."));
    return;
  }

  cb(null, true);
}

module.exports = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: {
    files: 4,
    fileSize: 10 * 1024 * 1024
  }
});
