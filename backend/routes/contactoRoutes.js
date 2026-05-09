const express = require("express");
const contactoController = require("../controllers/contactoController");
const authMiddleware = require("../middlewares/authMiddleware");
const roleMiddleware = require("../middlewares/roleMiddleware");

const router = express.Router();

router.post("/", contactoController.create);
router.get("/", authMiddleware, roleMiddleware("superadmin", "directivo"), contactoController.list);

module.exports = router;
