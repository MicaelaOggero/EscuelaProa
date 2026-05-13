const express = require("express");
const contenidoController = require("../controllers/contenidoController");
const authMiddleware = require("../middlewares/authMiddleware");
const roleMiddleware = require("../middlewares/roleMiddleware");

const router = express.Router();

// Visible to anyone authenticated; if estudiante, the backend scopes to their anioId.
router.get("/", authMiddleware, contenidoController.list);
router.get("/mine", authMiddleware, roleMiddleware("docente"), contenidoController.mine);

router.post("/", authMiddleware, roleMiddleware("docente"), contenidoController.create);
router.put("/:id", authMiddleware, roleMiddleware("docente"), contenidoController.update);
router.delete("/:id", authMiddleware, roleMiddleware("docente"), contenidoController.remove);

module.exports = router;
