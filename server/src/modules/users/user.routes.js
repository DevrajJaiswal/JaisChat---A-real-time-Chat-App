
import { Router } from "express";
import { requireAuth } from "../../middleware/requireAuth.js";
import { syncCurrentUser } from "./user.controller.js";

const router = Router();

router.post("/sync", requireAuth, syncCurrentUser);

export default router;
