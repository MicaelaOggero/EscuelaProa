const Anio = require("../models/Anio");

exports.list = async (req, res, next) => {
  try {
    const rows = await Anio.find().sort({ numero: 1, division: 1, turno: 1 });
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const anio = await Anio.create(req.body);
    res.status(201).json(anio);
  } catch (err) {
    if (err && err.code === 11000) return res.status(409).json({ message: "Anio already exists" });
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const anio = await Anio.findByIdAndUpdate(id, req.body, { new: true });
    if (!anio) return res.status(404).json({ message: "Not found" });
    res.json(anio);
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    const anio = await Anio.findByIdAndDelete(id);
    if (!anio) return res.status(404).json({ message: "Not found" });
    res.json({ message: "Deleted" });
  } catch (err) {
    next(err);
  }
};
