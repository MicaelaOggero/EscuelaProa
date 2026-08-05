const fs = require("fs");
const path = require("path");
const { v2: cloudinary } = require("cloudinary");

const uploadsRoot = path.join(__dirname, "..", "uploads");

function cloudinaryEnabled() {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
  );
}

if (cloudinaryEnabled()) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
  });
}

function sanitizeBaseName(originalName, fallback, maxLength) {
  const ext = path.extname(originalName || "").toLowerCase();
  const base = path
    .basename(originalName || fallback, ext)
    .replace(/[^a-zA-Z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, maxLength || 50);
  return (base || fallback) + ext;
}

function localDir(folder) {
  return path.join(uploadsRoot, folder);
}

function ensureLocalDir(folder) {
  fs.mkdirSync(localDir(folder), { recursive: true });
}

function localUrl(folder, fileName) {
  return "/uploads/" + folder + "/" + fileName;
}

function buildAbsoluteUrl(req, url) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  return req.protocol + "://" + req.get("host") + url;
}

function extractLocalPath(url) {
  const text = String(url || "");
  const marker = "/uploads/";
  const idx = text.indexOf(marker);
  if (idx === -1) return null;
  const relative = text.slice(idx + marker.length).split("?")[0];
  return path.join(uploadsRoot, relative.replace(/\//g, path.sep));
}

function cloudinaryPublicId(url) {
  const text = String(url || "");
  const match = text.match(/\/upload\/(?:v\d+\/)?(.+)\.[a-z0-9]+(?:\?|$)/i);
  return match ? match[1] : "";
}

async function uploadStream(options, buffer) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
    stream.end(buffer);
  });
}

async function storeUploadedFile(req, file, options) {
  const folder = options.folder;
  const fallbackName = options.fallbackName || "archivo";
  const maxBaseLength = options.maxBaseLength || 50;
  const safeName = sanitizeBaseName(file.originalname, fallbackName, maxBaseLength);
  const stampedName = Date.now() + "-" + safeName;

  if (cloudinaryEnabled()) {
    const result = await uploadStream(
      {
        folder: (process.env.CLOUDINARY_FOLDER || "eep") + "/" + folder,
        public_id: path.basename(stampedName, path.extname(stampedName)),
        resource_type: "auto"
      },
      file.buffer
    );

    return {
      url: result.secure_url,
      name: file.originalname || safeName,
      mime: file.mimetype || "",
      size: file.size || 0
    };
  }

  ensureLocalDir(folder);
  const fullPath = path.join(localDir(folder), stampedName);
  fs.writeFileSync(fullPath, file.buffer);
  return {
    url: buildAbsoluteUrl(req, localUrl(folder, stampedName)),
    name: file.originalname || safeName,
    mime: file.mimetype || "",
    size: file.size || 0
  };
}

async function deleteStoredFile(url) {
  if (!url) return;
  if (/res\.cloudinary\.com/i.test(String(url))) {
    if (!cloudinaryEnabled()) return;
    const publicId = cloudinaryPublicId(url);
    if (!publicId) return;
    await cloudinary.uploader.destroy(publicId, { resource_type: "image" }).catch(async function () {
      await cloudinary.uploader.destroy(publicId, { resource_type: "raw" }).catch(function () {
        return null;
      });
    });
    return;
  }

  const localPathValue = extractLocalPath(url);
  if (localPathValue && fs.existsSync(localPathValue)) {
    fs.unlinkSync(localPathValue);
  }
}

module.exports = {
  cloudinaryEnabled,
  storeUploadedFile,
  deleteStoredFile,
  buildAbsoluteUrl
};
