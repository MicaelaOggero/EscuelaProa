const express = require("express");
const anioController = require("../controllers/anioController");
const authMiddleware = require("../middlewares/authMiddleware");
const roleMiddleware = require("../middlewares/roleMiddleware");

const router = express.Router();

router.get("/", authMiddleware, roleMiddleware("directivo", "docente", "estudiante"), anioController.list);
router.post("/", authMiddleware, roleMiddleware("directivo"), anioController.create);
router.put("/:id", authMiddleware, roleMiddleware("directivo"), anioController.update);
router.delete("/:id", authMiddleware, roleMiddleware("directivo"), anioController.remove);

module.exports = router;
