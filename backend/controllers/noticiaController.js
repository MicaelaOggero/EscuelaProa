const Noticia = require("../models/Noticia");
const fs = require("fs");
const path = require("path");

function toBoolean(value) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value === "true" || value === "1";
  return false;
}

function buildImageUrl(req, fileName) {
  return req.protocol + "://" + req.get("host") + "/uploads/noticias/" + fileName;
}

function removeImageByUrl(url) {
  if (!url) return;
  try {
    const fileName = String(url).split("/uploads/noticias/")[1];
    if (!fileName) return;
    const filePath = path.join(__dirname, "..", "uploads", "noticias", fileName);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch (err) {
    console.error(err);
  }
}

function removeUploadedFiles(files) {
  (files || []).forEach((file) => {
    if (file && file.filename) {
      removeImageByUrl("/uploads/noticias/" + file.filename);
    }
  });
}

function parseExistingImages(raw, fallbackAlt) {
  if (!raw) return [];
  try {
    const rows = JSON.parse(raw);
    if (!Array.isArray(rows)) return [];
    return rows
      .filter((row) => row && row.url)
      .map((row, index) => ({
        url: String(row.url).trim(),
        alt: String(row.alt || fallbackAlt || "").trim(),
        orden: typeof row.orden === "number" ? row.orden : index
      }));
  } catch (err) {
    return [];
  }
}

function mapUploadedImages(req, files, fallbackAlt, startIndex) {
  return (files || []).map((file, index) => ({
    url: buildImageUrl(req, file.filename),
    alt: fallbackAlt || path.basename(file.originalname || "imagen", path.extname(file.originalname || "")),
    orden: startIndex + index
  }));
}

function normalizeImages(req, noticia) {
  const fallbackAlt = String((noticia && noticia.titulo) || "Noticia institucional").trim();
  const existingImages = parseExistingImages(req.body.imagenesExistentes, fallbackAlt);
  const uploadedImages = mapUploadedImages(req, req.files, fallbackAlt, existingImages.length);
  return existingImages.concat(uploadedImages).map((image, index) => ({
    url: image.url,
    alt: String(image.alt || fallbackAlt).trim(),
    orden: index
  }));
}

function removeMissingImages(previousImages, nextImages) {
  const nextUrls = new Set((nextImages || []).map((image) => image && image.url).filter(Boolean));
  (previousImages || []).forEach((image) => {
    if (image && image.url && !nextUrls.has(image.url)) removeImageByUrl(image.url);
  });
}

function payloadFromRequest(req) {
  const titulo = String(req.body.titulo || "").trim();
  return {
    titulo,
    categoria: String(req.body.categoria || "Institucional").trim() || "Institucional",
    resumen: String(req.body.resumen || "").trim(),
    contenido: String(req.body.contenido || "").trim(),
    fecha: req.body.fecha ? new Date(req.body.fecha) : new Date(),
    destacada: toBoolean(req.body.destacada),
    imagenes: normalizeImages(req, { titulo })
  };
}

exports.list = async (req, res, next) => {
  try {
    const noticias = await Noticia.find().sort({ fecha: -1, createdAt: -1 });
    res.json(noticias);
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const noticia = await Noticia.create(payloadFromRequest(req));
    res.status(201).json(noticia);
  } catch (err) {
    removeUploadedFiles(req.files);
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const noticia = await Noticia.findById(req.params.id);
    if (!noticia) {
      removeUploadedFiles(req.files);
      return res.status(404).json({ message: "Noticia not found" });
    }

    const previousImages = Array.isArray(noticia.imagenes) ? noticia.imagenes.slice() : [];
    const payload = payloadFromRequest(req);
    noticia.titulo = payload.titulo;
    noticia.categoria = payload.categoria;
    noticia.resumen = payload.resumen;
    noticia.contenido = payload.contenido;
    noticia.fecha = payload.fecha;
    noticia.destacada = payload.destacada;
    noticia.imagenes = payload.imagenes;

    await noticia.save();
    removeMissingImages(previousImages, noticia.imagenes);
    res.json(noticia);
  } catch (err) {
    removeUploadedFiles(req.files);
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const noticia = await Noticia.findById(req.params.id);
    if (!noticia) return res.status(404).json({ message: "Noticia not found" });

    (noticia.imagenes || []).forEach((image) => removeImageByUrl(image.url));
    await Noticia.deleteOne({ _id: req.params.id });
    res.json({ message: "Noticia deleted" });
  } catch (err) {
    next(err);
  }
};
