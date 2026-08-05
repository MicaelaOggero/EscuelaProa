const multer = require("multer");

function fileFilter(req, file, cb) {
  if (!file.mimetype || file.mimetype.indexOf("image/") !== 0) {
    cb(new Error("Solo se permiten imagenes."));
    return;
  }
  cb(null, true);
}

module.exports = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: {
    files: 8,
    fileSize: 5 * 1024 * 1024
  }
});
