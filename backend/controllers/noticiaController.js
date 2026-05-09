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
