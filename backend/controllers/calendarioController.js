const Evento = require("../models/Evento");

exports.list = async (req, res, next) => {
  try {
    const eventos = await Evento.find().sort({ inicio: 1 });
    res.json(eventos);
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const evento = await Evento.create(req.body);
    res.status(201).json(evento);
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const evento = await Evento.findById(req.params.id);
    if (!evento) return res.status(404).json({ message: "Evento not found" });

    var fields = ["titulo", "descripcion", "inicio", "fin", "ubicacion", "tipo"];
    fields.forEach(function (field) {
      if (typeof req.body[field] !== "undefined") evento[field] = req.body[field];
    });

    await evento.save();
    res.json(evento);
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const evento = await Evento.findById(req.params.id);
    if (!evento) return res.status(404).json({ message: "Evento not found" });

    await Evento.deleteOne({ _id: req.params.id });
    res.json({ message: "Evento deleted" });
  } catch (err) {
    next(err);
  }
};
