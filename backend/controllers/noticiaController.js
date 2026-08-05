const Noticia = require("../models/Noticia");
const path = require("path");
const jwt = require("jsonwebtoken");
const { normalizeRoles } = require("../utils/roles");
const { storeUploadedFile, deleteStoredFile } = require("../utils/storage");

const ROLES_VISIBLES = ["directivo", "docente", "estudiante"];

function toBoolean(value) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value === "true" || value === "1";
  return false;
}

function parseVisibleRoles(value) {
  let roles = value;
  if (typeof roles === "string") {
    try {
      roles = JSON.parse(roles);
    } catch (err) {
      roles = roles.split(",");
    }
  }
  return normalizeRoles(roles).filter((role) => ROLES_VISIBLES.indexOf(role) !== -1);
}

function parseOptionalUser(req) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return null;

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) return null;
    const payload = jwt.verify(token, secret);
    const roles = normalizeRoles(payload.roles && payload.roles.length ? payload.roles : payload.role);
    return { id: payload.id, roles };
  } catch (err) {
    return null;
  }
}

async function removeImageByUrl(url) {
  if (!url) return;
  try {
    await deleteStoredFile(url);
  } catch (err) {
    console.error(err);
  }
}

async function removeTrackedUploads(req) {
  const urls = Array.isArray(req && req._storedUploadUrls) ? req._storedUploadUrls.slice() : [];
  req._storedUploadUrls = [];
  for (const url of urls) {
    await removeImageByUrl(url);
  }
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

async function mapUploadedImages(req, files, fallbackAlt, startIndex) {
  const rows = [];
  const list = files || [];
  for (let index = 0; index < list.length; index += 1) {
    const file = list[index];
    const stored = await storeUploadedFile(req, file, {
      folder: "noticias",
      fallbackName: "imagen",
      maxBaseLength: 40
    });
    rows.push({
      url: stored.url,
      alt: fallbackAlt || path.basename(file.originalname || "imagen", path.extname(file.originalname || "")),
      orden: startIndex + index
    });
    req._storedUploadUrls = (req._storedUploadUrls || []).concat(stored.url);
  }
  return rows;
}

async function normalizeImages(req, noticia) {
  const fallbackAlt = String((noticia && noticia.titulo) || "Noticia institucional").trim();
  const existingImages = parseExistingImages(req.body.imagenesExistentes, fallbackAlt);
  const uploadedImages = await mapUploadedImages(req, req.files, fallbackAlt, existingImages.length);
  return existingImages.concat(uploadedImages).map((image, index) => ({
    url: image.url,
    alt: String(image.alt || fallbackAlt).trim(),
    orden: index
  }));
}

async function removeMissingImages(previousImages, nextImages) {
  const nextUrls = new Set((nextImages || []).map((image) => image && image.url).filter(Boolean));
  for (const image of previousImages || []) {
    if (image && image.url && !nextUrls.has(image.url)) await removeImageByUrl(image.url);
  }
}

async function payloadFromRequest(req) {
  const titulo = String(req.body.titulo || "").trim();
  const tipo = String(req.body.tipo || "publica").trim() === "privada" ? "privada" : "publica";
  const visibleParaRoles = tipo === "privada" ? parseVisibleRoles(req.body.visibleParaRoles) : [];
  return {
    titulo,
    categoria: String(req.body.categoria || "Institucional").trim() || "Institucional",
    resumen: String(req.body.resumen || "").trim(),
    contenido: String(req.body.contenido || "").trim(),
    fecha: req.body.fecha ? new Date(req.body.fecha) : new Date(),
    destacada: toBoolean(req.body.destacada),
    imagenes: await normalizeImages(req, { titulo }),
    tipo,
    visibleParaRoles
  };
}

exports.list = async (req, res, next) => {
  try {
    const user = req.user || parseOptionalUser(req);
    let query;

    if (!user || !Array.isArray(user.roles) || !user.roles.length) {
      query = { tipo: "publica" };
    } else if (user.roles.indexOf("superadmin") !== -1 || user.roles.indexOf("directivo") !== -1) {
      query = {};
    } else {
      query = {
        $or: [
          { tipo: "publica" },
          { tipo: "privada", visibleParaRoles: { $in: user.roles } }
        ]
      };
    }

    const noticias = await Noticia.find(query).sort({ fecha: -1, createdAt: -1 });
    res.json(noticias);
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const payload = await payloadFromRequest(req);
    if (payload.tipo === "privada" && !payload.visibleParaRoles.length) {
      await removeTrackedUploads(req);
      return res.status(400).json({ message: "Debes seleccionar al menos un rol para una noticia privada." });
    }
    const noticia = await Noticia.create(payload);
    req._storedUploadUrls = [];
    res.status(201).json(noticia);
  } catch (err) {
    await removeTrackedUploads(req);
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const noticia = await Noticia.findById(req.params.id);
    if (!noticia) {
        return res.status(404).json({ message: "Noticia not found" });
      }

      const previousImages = Array.isArray(noticia.imagenes) ? noticia.imagenes.slice() : [];
      const payload = await payloadFromRequest(req);
      if (payload.tipo === "privada" && !payload.visibleParaRoles.length) {
        await removeTrackedUploads(req);
        return res.status(400).json({ message: "Debes seleccionar al menos un rol para una noticia privada." });
      }
    noticia.titulo = payload.titulo;
    noticia.categoria = payload.categoria;
    noticia.resumen = payload.resumen;
    noticia.contenido = payload.contenido;
    noticia.fecha = payload.fecha;
    noticia.destacada = payload.destacada;
    noticia.imagenes = payload.imagenes;
    noticia.tipo = payload.tipo;
    noticia.visibleParaRoles = payload.visibleParaRoles;

      await noticia.save();
      req._storedUploadUrls = [];
      await removeMissingImages(previousImages, noticia.imagenes);
      res.json(noticia);
  } catch (err) {
    await removeTrackedUploads(req);
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const noticia = await Noticia.findById(req.params.id);
    if (!noticia) return res.status(404).json({ message: "Noticia not found" });

    for (const image of noticia.imagenes || []) {
      await removeImageByUrl(image.url);
    }
    await Noticia.deleteOne({ _id: req.params.id });
    res.json({ message: "Noticia deleted" });
  } catch (err) {
    next(err);
  }
};
