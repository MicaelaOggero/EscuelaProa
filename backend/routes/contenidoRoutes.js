const express = require("express");
const contenidoController = require("../controllers/contenidoController");
const authMiddleware = require("../middlewares/authMiddleware");
const roleMiddleware = require("../middlewares/roleMiddleware");
const contenidoUpload = require("../middlewares/contenidoUpload");

const router = express.Router();

// Visible to anyone authenticated; if estudiante, the backend scopes to their cursoId.
router.get("/", authMiddleware, contenidoController.list);
router.get("/mine", authMiddleware, roleMiddleware("directivo", "docente"), contenidoController.mine);

router.post("/", authMiddleware, roleMiddleware("directivo", "docente"), contenidoUpload.array("archivos", 4), contenidoController.create);
router.put("/:id", authMiddleware, roleMiddleware("directivo", "docente"), contenidoUpload.array("archivos", 4), contenidoController.update);
router.delete("/:id", authMiddleware, roleMiddleware("directivo", "docente"), contenidoController.remove);

module.exports = router;
