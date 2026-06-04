const express = require("express");
const userController = require("../controllers/userController");
const authMiddleware = require("../middlewares/authMiddleware");
const roleMiddleware = require("../middlewares/roleMiddleware");

const router = express.Router();

router.get("/me", authMiddleware, userController.me);
router.get("/", authMiddleware, roleMiddleware("superadmin"), userController.list);
router.post("/", authMiddleware, roleMiddleware("superadmin"), userController.create);

// Staff management (directivo/docente) - only superadmin
// Listing staff is allowed for directivo/superadmin (needed for academic assignments)
router.get("/staff", authMiddleware, roleMiddleware("superadmin", "directivo"), userController.listStaff);
// Directivo can manage docentes; superadmin can manage staff.
router.post("/staff", authMiddleware, roleMiddleware("superadmin", "directivo"), userController.createStaff);
router.put("/staff/:id", authMiddleware, roleMiddleware("superadmin", "directivo"), userController.updateStaff);
router.delete("/staff/:id", authMiddleware, roleMiddleware("superadmin", "directivo"), userController.deleteStaff);

module.exports = router;
