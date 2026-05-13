const express = require("express");
const materiaAnioController = require("../controllers/materiaAnioController");
const authMiddleware = require("../middlewares/authMiddleware");
const roleMiddleware = require("../middlewares/roleMiddleware");

const router = express.Router();

// Staff and students can list (students are scoped server-side to their anioId)
router.get("/", authMiddleware, roleMiddleware("directivo", "docente", "estudiante"), materiaAnioController.list);
router.get("/mine", authMiddleware, roleMiddleware("docente"), materiaAnioController.mine);

// Only directivo/superadmin can create/delete
router.post("/", authMiddleware, roleMiddleware("directivo"), materiaAnioController.create);
router.put("/:id", authMiddleware, roleMiddleware("directivo"), materiaAnioController.update);
router.delete("/:id", authMiddleware, roleMiddleware("directivo"), materiaAnioController.remove);

module.exports = router;
