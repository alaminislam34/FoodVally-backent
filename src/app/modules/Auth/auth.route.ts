import express from 'express';
import { AuthController } from './auth.controller.js';

const router = express.Router();

router.post('/register', AuthController.registerUser);
router.post('/verify-account', AuthController.verifyAccount);
router.post('/login', AuthController.loginRequest);
router.post('/login-verify', AuthController.loginVerify);
router.post('/google', AuthController.loginWithGoogle);

export const AuthRoutes = router;
