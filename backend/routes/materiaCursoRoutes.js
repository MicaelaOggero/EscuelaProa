const express = require("express");
const materiaCursoController = require("../controllers/materiaCursoController");
const authMiddleware = require("../middlewares/authMiddleware");
const roleMiddleware = require("../middlewares/roleMiddleware");

const router = express.Router();

// Staff and students can list (students are scoped server-side to their cursoId)
router.get("/", authMiddleware, roleMiddleware("directivo", "docente", "estudiante"), materiaCursoController.list);
router.get("/mine", authMiddleware, roleMiddleware("docente"), materiaCursoController.mine);

// Only directivo/superadmin can create/delete
router.post("/", authMiddleware, roleMiddleware("directivo"), materiaCursoController.create);
router.post("/import-csv", authMiddleware, roleMiddleware("directivo"), materiaCursoController.importCsv);
router.patch("/:id/asignar-docente", authMiddleware, roleMiddleware("directivo"), materiaCursoController.assignDocente);
router.patch("/:id/quitar-docente", authMiddleware, roleMiddleware("directivo"), materiaCursoController.clearDocente);
router.put("/:id", authMiddleware, roleMiddleware("directivo"), materiaCursoController.update);
router.delete("/:id", authMiddleware, roleMiddleware("directivo"), materiaCursoController.remove);

module.exports = router;
