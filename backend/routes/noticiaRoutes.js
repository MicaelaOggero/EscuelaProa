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
router.put(
  "/:id",
  authMiddleware,
  roleMiddleware("superadmin", "directivo", "docente"),
  noticiaController.update
);
router.delete(
  "/:id",
  authMiddleware,
  roleMiddleware("superadmin", "directivo", "docente"),
  noticiaController.remove
);

module.exports = router;
