import type { Request, Response } from "express";
import catchAsync from "../../utils/catchAsync.js";
import { AuthService } from "./auth.service.js";

const registerUser = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthService.registerUser(req.body);
  res.status(201).json({
    success: true,
    message: "User registered successfully. Please check your email for OTP.",
    data: result,
  });
});

const verifyAccount = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthService.verifyAccount(req.body);
  res.status(200).json({
    success: true,
    message: "Account verified successfully.",
    data: result,
  });
});

const loginRequest = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthService.loginRequest(req.body);
  res.status(200).json({
    success: true,
    message: "Login OTP sent successfully.",
    data: result,
  });
});

const loginVerify = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthService.loginVerify(req.body);
  res.status(200).json({
    success: true,
    message: "User logged in successfully.",
    data: result,
  });
});

const loginWithGoogle = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthService.loginWithGoogle(req.body);
  res.status(200).json({
    success: true,
    message: "Google login successful.",
    data: result,
  });
});

const refreshToken = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthService.refreshToken(req.body);
  res.status(200).json({
    success: true,
    message: "Create new tokens.",
    data: result,
  });
});

const resendVerification = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthService.resendVerification(req.body);
  res.status(200).json({
    success: true,
    message: "Verification email sent.",
    data: result,
  });
});

export const AuthController = {
  registerUser,
  verifyAccount,
  loginRequest,
  loginVerify,
  loginWithGoogle,
  refreshToken,
  resendVerification,
};
