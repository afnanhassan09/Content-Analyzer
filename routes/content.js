const express = require("express");
const router = express.Router();
const contentController = require("../controllers/content");
const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() });

router.post("/analyze", upload.single("file"), contentController.analyze);

router.post("/log-user-activity", contentController.logUserActivity);

module.exports = router;
