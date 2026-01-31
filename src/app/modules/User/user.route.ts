import express from 'express';
import { UserControllers } from './user.controller.js';

const router = express.Router();

router.get('/me', UserControllers.getProfile);
router.post('/create-user', UserControllers.createUser);

export const UserRoutes = router;
