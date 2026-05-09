const Consulta = require("../models/Consulta");

exports.create = async (req, res, next) => {
  try {
    const consulta = await Consulta.create(req.body);
    res.status(201).json({ message: "Consulta registrada", id: consulta._id });
  } catch (err) {
    next(err);
  }
};

exports.list = async (req, res, next) => {
  try {
    const consultas = await Consulta.find().sort({ createdAt: -1 });
    res.json(consultas);
  } catch (err) {
    next(err);
  }
};
