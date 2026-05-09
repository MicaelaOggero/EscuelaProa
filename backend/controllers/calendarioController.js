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
