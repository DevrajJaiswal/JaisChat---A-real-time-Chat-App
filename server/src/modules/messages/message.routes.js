
import { Router } from "express";
import { requireAuth } from "../../middleware/requireAuth.js";
import {
  createMessage,
  listMessages,
} from "./message.controller.js";

const router = Router({ mergeParams: true });

router.use(requireAuth);

router.post("/", createMessage);
router.get("/", listMessages);

export default router;
