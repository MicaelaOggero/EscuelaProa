const Curso = require("../models/Curso");

exports.list = async (req, res, next) => {
  try {
    const rows = await Curso.find().sort({ numero: 1, division: 1, turno: 1 });
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const curso = await Curso.create(req.body);
    res.status(201).json(curso);
  } catch (err) {
    if (err && err.code === 11000) return res.status(409).json({ message: "Curso already exists" });
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const curso = await Curso.findByIdAndUpdate(id, req.body, { new: true });
    if (!curso) return res.status(404).json({ message: "Not found" });
    res.json(curso);
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    const curso = await Curso.findByIdAndDelete(id);
    if (!curso) return res.status(404).json({ message: "Not found" });
    res.json({ message: "Deleted" });
  } catch (err) {
    next(err);
  }
};
