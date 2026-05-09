const express = require("express");
const calendarioController = require("../controllers/calendarioController");
const authMiddleware = require("../middlewares/authMiddleware");
const roleMiddleware = require("../middlewares/roleMiddleware");

const router = express.Router();

router.get("/", calendarioController.list);
router.post(
  "/",
  authMiddleware,
  roleMiddleware("superadmin", "directivo", "docente"),
  calendarioController.create
);

module.exports = router;
