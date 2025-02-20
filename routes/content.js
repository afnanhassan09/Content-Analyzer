const express = require("express");
const router = express.Router();
const contentController = require("../controllers/content");
const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() });
const auth = require("../middleware/auth");

router.post(
  "/create",
  auth,
  upload.single("file"),
  contentController.createContent
);

router.get("/all", auth, contentController.getAllContent);

router.get("/safe", auth, contentController.getSafeContent);

router.get("/warning", auth, contentController.getWarningContent);

router.get("/harmful", auth, contentController.getHarmfulContent);

module.exports = router;
