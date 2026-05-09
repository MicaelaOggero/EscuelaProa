const express = require("express");
const noticiaController = require("../controllers/noticiaController");
const authMiddleware = require("../middlewares/authMiddleware");
const roleMiddleware = require("../middlewares/roleMiddleware");

const router = express.Router();

router.get("/", noticiaController.list);
router.post(
  "/",
  authMiddleware,
  roleMiddleware("superadmin", "directivo", "docente"),
  noticiaController.create
);

module.exports = router;
