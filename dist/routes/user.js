"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const user_1 = require("../controllers/user");
const router = (0, express_1.Router)();
router.post("/api/user/register", user_1.register);
router.post("/api/user/login", user_1.login);
exports.default = router;
