const express = require("express");
const router = express.Router();
const resolveController = require("../controllers/resolve.controller");

router.post("/resolve", resolveController.resolveStream);

module.exports = router;
