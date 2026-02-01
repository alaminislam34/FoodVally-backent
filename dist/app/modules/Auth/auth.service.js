import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import { UserStatus } from "@prisma/client";
import prisma from "../../utils/prisma.js";
import config from "../../config/index.js";
import { sendEmail } from "../../utils/sendEmail.js";
import AppError from "../../errors/AppError.js";
// Helper to generate OTP
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};
const registerUser = async (payload) => {
    const { email, password, name } = payload;
    const existingUser = await prisma.user.findUnique({
        where: { email },
    });
    if (existingUser) {
        if (existingUser.status === UserStatus.ACTIVE ||
            existingUser.emailVerifiedAt) {
            throw new AppError(400, "Email already registered. Please login.");
        }
        const otp = generateOTP();
        const hashedOTP = await bcrypt.hash(otp, 12);
        const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);
        const hashedPassword = password
            ? await bcrypt.hash(password, 12)
            : undefined;
        await prisma.user.update({
            where: { email },
            data: {
                name: name ?? existingUser.name,
                password: hashedPassword ?? existingUser.password,
                otp: hashedOTP,
                otpExpiresAt,
            },
        });
        await sendEmail(email, "Account Verification OTP", `<p>Your OTP for account verification is <strong>${otp}</strong>. It expires in 5 minutes.</p>`);
        return { message: "Verification OTP resent" };
    }
    const hashedPassword = await bcrypt.hash(password, 12);
    const otp = generateOTP();
    const hashedOTP = await bcrypt.hash(otp, 12);
    const parts = email.split("@");
    const username = parts[0];
    // OTP expires in 5 minutes
    const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);
    const newUser = await prisma.user.create({
        data: {
            name,
            username: username,
            email,
            password: hashedPassword,
            status: UserStatus.PENDING,
            otp: hashedOTP,
            otpExpiresAt,
        },
    });
    // Send OTP Email
    await sendEmail(email, "Account Verification OTP", `<p>Your OTP for account verification is <strong>${otp}</strong>. It expires in 5 minutes.</p>`);
    const { password: _, otp: __, ...userData } = newUser;
    return userData;
};
const verifyAccount = async (payload) => {
    const { email, otp } = payload;
    const user = await prisma.user.findUnique({
        where: { email },
    });
    if (!user) {
        throw new AppError(404, "User not found");
    }
    if (user.status === UserStatus.ACTIVE) {
        throw new AppError(400, "User already active");
    }
    if (!user.otp || !user.otpExpiresAt) {
        throw new AppError(400, "Invalid verification request");
    }
    if (new Date() > user.otpExpiresAt) {
        throw new AppError(400, "OTP expired");
    }
    const isOtpValid = await bcrypt.compare(otp, user.otp);
    if (!isOtpValid) {
        throw new AppError(400, "Invalid OTP");
    }
    const updatedUser = await prisma.user.update({
        where: { email },
        data: {
            status: UserStatus.ACTIVE,
            emailVerifiedAt: new Date(),
            otp: null,
            otpExpiresAt: null,
        },
    });
    const { password: _, otp: __, ...userData } = updatedUser;
    return userData;
};
const loginRequest = async (payload) => {
    const { email, password } = payload;
    console.log(email, password);
    const user = await prisma.user.findUnique({
        where: { email },
    });
    if (!user) {
        throw new AppError(404, "User not found");
    }
    if (user.status === UserStatus.BLOCKED) {
        throw new AppError(403, "User is blocked");
    }
    if (user.status === UserStatus.PENDING) {
        throw new AppError(403, "Please verify your account first");
        // Optionally resend OTP here if needed
    }
    if (!user.password) {
        throw new AppError(403, "Invalid credentials");
    }
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
        throw new AppError(403, "Invalid credentials");
    }
    // Generate OTP for 2FA
    const otp = generateOTP();
    const hashedOTP = await bcrypt.hash(otp, 12);
    // OTP expires in 5 minutes
    const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);
    await prisma.user.update({
        where: { email },
        data: {
            otp: hashedOTP,
            otpExpiresAt,
        },
    });
    await sendEmail(email, "Login OTP", `<p>Your OTP for login is <strong>${otp}</strong>. It expires in 5 minutes.</p>`);
    return { message: "OTP sent to your email" };
};
const loginVerify = async (payload) => {
    const { email, otp } = payload;
    const user = await prisma.user.findUnique({
        where: { email },
    });
    if (!user) {
        throw new AppError(404, "User not found");
    }
    if (!user.otp || !user.otpExpiresAt) {
        throw new AppError(400, "No OTP request found");
    }
    if (new Date() > user.otpExpiresAt) {
        throw new AppError(400, "OTP expired");
    }
    const isOtpValid = await bcrypt.compare(otp, user.otp);
    if (!isOtpValid) {
        throw new AppError(400, "Invalid OTP");
    }
    // Clear OTP
    await prisma.user.update({
        where: { email },
        data: {
            otp: null,
            otpExpiresAt: null,
        },
    });
    // Generate Tokens
    const accessToken = jwt.sign({ userId: user.id, email: user.email, role: user.role }, config.jwt_access_secret, { expiresIn: (config.jwt_access_expires_in || "1d") });
    const refreshToken = jwt.sign({ userId: user.id, email: user.email, role: user.role }, config.jwt_refresh_secret, { expiresIn: (config.jwt_refresh_expires_in || "365d") });
    return {
        accessToken,
        refreshToken,
    };
};
const refreshToken = async (payload) => {
    const { refresh_token } = payload;
    if (!refresh_token) {
        throw new AppError(400, "Invalid or expired refresh token");
    }
    if (!config.jwt_refresh_secret) {
        throw new AppError(500, "Server configuration error");
    }
    let decoded;
    try {
        decoded = jwt.verify(refresh_token, config.jwt_refresh_secret);
    }
    catch (error) {
        throw new AppError(500, "Invalid or expired refresh token");
    }
    if (!decoded || typeof decoded === "string" || !decoded.userId) {
        throw new AppError(401, "Invalid refresh token");
    }
    const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
    });
    if (!user) {
        throw new AppError(404, "User not found");
    }
    if (user.status === UserStatus.BLOCKED) {
        throw new AppError(403, "User is blocked");
    }
    if (!config.jwt_refresh_secret) {
        throw new AppError(500, "Server configuration error");
    }
    const accessToken = jwt.sign({ userId: user.id, email: user.email, role: user.role }, config.jwt_access_secret, { expiresIn: (config.jwt_access_expires_in || "1d") });
    const newRefreshToken = jwt.sign({ userId: user.id, email: user.email, role: user.role }, config.jwt_refresh_secret, { expiresIn: (config.jwt_refresh_expires_in || "365d") });
    return {
        accessToken,
        refreshToken: newRefreshToken,
    };
};
const resendVerification = async (payload) => {
    const { email } = payload;
    const user = await prisma.user.findUnique({
        where: { email },
    });
    if (!user) {
        throw new AppError(404, "User not found");
    }
    if (user.status === UserStatus.ACTIVE || user.emailVerifiedAt) {
        throw new AppError(400, "User already verified");
    }
    const otp = generateOTP();
    const hashedOTP = await bcrypt.hash(otp, 12);
    const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);
    await prisma.user.update({
        where: { email },
        data: {
            otp: hashedOTP,
            otpExpiresAt,
        },
    });
    await sendEmail(email, "Account Verification OTP", `<p>Your OTP for account verification is <strong>${otp}</strong>. It expires in 5 minutes.</p>`);
    return { message: "Verification OTP resent" };
};
const loginWithGoogle = async (payload) => {
    const idToken = payload?.idToken || payload?.token;
    if (!idToken) {
        throw new AppError(400, "Google ID token is required");
    }
    if (!config.google_client_id) {
        throw new AppError(500, "Server configuration error");
    }
    const client = new OAuth2Client(config.google_client_id);
    // Verify Google Token
    const ticket = await client.verifyIdToken({
        idToken,
        audience: config.google_client_id,
    });
    const googlePayload = ticket.getPayload();
    if (!googlePayload || !googlePayload.email) {
        throw new AppError(400, "Invalid Google Token");
    }
    if (googlePayload.email_verified === false) {
        throw new AppError(400, "Google email not verified");
    }
    const { email, name, picture, sub: googleId } = googlePayload;
    // Check if user exists
    let user = await prisma.user.findUnique({
        where: { email },
    });
    const parts = email.split("@");
    const username = parts[0] ?? "";
    if (user) {
        if (user.status === UserStatus.BLOCKED) {
            throw new AppError(403, "User is blocked");
        }
        // If user exists but not linked to Google, link it
        if (!user.googleId) {
            user = await prisma.user.update({
                where: { email },
                data: {
                    googleId,
                    avatar: (user.avatar || picture || null),
                    status: UserStatus.ACTIVE,
                    emailVerifiedAt: user.emailVerifiedAt || new Date(),
                },
            });
        }
    }
    else {
        user = await prisma.user.create({
            data: {
                name: name || "Google User",
                username,
                email,
                googleId,
                avatar: picture || null,
                status: UserStatus.ACTIVE,
                emailVerifiedAt: new Date(),
                // No password for social login
            },
        });
    }
    // Generate Tokens
    const accessToken = jwt.sign({ userId: user.id, email: user.email, role: user.role }, config.jwt_access_secret, { expiresIn: (config.jwt_access_expires_in || "1d") });
    const refreshToken = jwt.sign({ userId: user.id, email: user.email, role: user.role }, config.jwt_refresh_secret, { expiresIn: (config.jwt_refresh_expires_in || "30d") });
    return {
        accessToken,
        refreshToken,
    };
};
export const AuthService = {
    registerUser,
    verifyAccount,
    loginRequest,
    loginVerify,
    loginWithGoogle,
    refreshToken,
    resendVerification,
};
