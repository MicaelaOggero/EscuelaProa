const express = require("express");
const cursoController = require("../controllers/cursoController");
const authMiddleware = require("../middlewares/authMiddleware");
const roleMiddleware = require("../middlewares/roleMiddleware");

const router = express.Router();

router.get("/", authMiddleware, roleMiddleware("directivo", "docente", "estudiante"), cursoController.list);
router.post("/", authMiddleware, roleMiddleware("directivo"), cursoController.create);
router.put("/:id", authMiddleware, roleMiddleware("directivo"), cursoController.update);
router.delete("/:id", authMiddleware, roleMiddleware("directivo"), cursoController.remove);

module.exports = router;
