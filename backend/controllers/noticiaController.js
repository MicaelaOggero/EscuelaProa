const Noticia = require("../models/Noticia");

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
    const noticia = await Noticia.create(req.body);
    res.status(201).json(noticia);
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const noticia = await Noticia.findById(req.params.id);
    if (!noticia) return res.status(404).json({ message: "Noticia not found" });

    var fields = ["titulo", "categoria", "resumen", "contenido", "fecha", "destacada"];
    fields.forEach(function (field) {
      if (typeof req.body[field] !== "undefined") noticia[field] = req.body[field];
    });

    await noticia.save();
    res.json(noticia);
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const noticia = await Noticia.findById(req.params.id);
    if (!noticia) return res.status(404).json({ message: "Noticia not found" });

    await Noticia.deleteOne({ _id: req.params.id });
    res.json({ message: "Noticia deleted" });
  } catch (err) {
    next(err);
  }
};
