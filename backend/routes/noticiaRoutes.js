const express = require("express");
const noticiaController = require("../controllers/noticiaController");
const authMiddleware = require("../middlewares/authMiddleware");
const roleMiddleware = require("../middlewares/roleMiddleware");
const noticiaUpload = require("../middlewares/noticiaUpload");

const router = express.Router();

router.get("/", noticiaController.list);
router.post(
  "/",
  authMiddleware,
  roleMiddleware("superadmin", "directivo", "docente"),
  noticiaUpload.array("imagenes", 8),
  noticiaController.create
);
router.put(
  "/:id",
  authMiddleware,
  roleMiddleware("superadmin", "directivo", "docente"),
  noticiaUpload.array("imagenes", 8),
  noticiaController.update
);
router.delete(
  "/:id",
  authMiddleware,
  roleMiddleware("superadmin", "directivo", "docente"),
  noticiaController.remove
);

module.exports = router;
