const express = require("express");
const router = express.Router();
const contentController = require("../controllers/content");
const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() });

router.post("/analyze", upload.single("file"), contentController.analyze);

module.exports = router;
