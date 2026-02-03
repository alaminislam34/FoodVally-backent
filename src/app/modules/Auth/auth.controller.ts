import type { Request, Response } from "express";
import catchAsync from "../../utils/catchAsync.js";
import { AuthService } from "./auth.service.js";

const registerUser = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthService.registerUser(req.body);
  res.status(201).json({
    success: true,
    message: result.message,
  });
});

const verifyAccount = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthService.verifyAccount(req.body);
  res.status(200).json({
    success: true,
    message: result.message,
  });
});

const loginRequest = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthService.loginRequest(req.body);
  res.status(200).json({
    success: true,
    message: "Logged in successfully.",
    data: result,
  });
});

// todo: implement social login properly
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

const forgotPassword = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthService.forgotPassword(req.body);
  res.status(200).json({
    success: true,
    message: result.message,
  });
});

const resetPassword = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthService.resetPassword(req.body);
  res.status(200).json({
    success: true,
    message: result.message,
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
  forgotPassword,
  resetPassword,
};
