import express from "express";
import { UserControllers } from "./user.controller.js";

const router = express.Router();

router.post("/create-user", UserControllers.createUser);
router.get("/me", UserControllers.getProfile);
router.get("/", UserControllers.allUsers);
router.delete("/", UserControllers.deleteUser);
router.put("/", UserControllers.updateUser);
router.put("/update-status", UserControllers.updateStatus);

export const UserRoutes = router;
