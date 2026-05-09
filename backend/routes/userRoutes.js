const express = require("express");
const userController = require("../controllers/userController");
const authMiddleware = require("../middlewares/authMiddleware");
const roleMiddleware = require("../middlewares/roleMiddleware");

const router = express.Router();

router.get("/me", authMiddleware, userController.me);
router.get("/", authMiddleware, roleMiddleware("superadmin"), userController.list);
router.post("/", authMiddleware, roleMiddleware("superadmin"), userController.create);

// Staff management (directivo/docente) - only superadmin
router.get("/staff", authMiddleware, roleMiddleware("superadmin"), userController.listStaff);
router.post("/staff", authMiddleware, roleMiddleware("superadmin"), userController.createStaff);
router.put("/staff/:id", authMiddleware, roleMiddleware("superadmin"), userController.updateStaff);
router.delete("/staff/:id", authMiddleware, roleMiddleware("superadmin"), userController.deleteStaff);

module.exports = router;
