import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { UserStatus } from '@prisma/client';
import prisma from '../../utils/prisma.js';
import config from '../../config/index.js';
import { sendEmail } from '../../utils/sendEmail.js';
import AppError from '../../errors/AppError.js';

// Helper to generate OTP
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

const registerUser = async (payload: any) => {
    const { email, password, name } = payload;

    const existingUser = await prisma.user.findUnique({
        where: { email },
    });

    if (existingUser) {
        throw new AppError(400, 'User already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const otp = generateOTP();
    const hashedOTP = await bcrypt.hash(otp, 12);
    // OTP expires in 5 minutes
    const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);

    const newUser = await prisma.user.create({
        data: {
            name,
            email,
            password: hashedPassword,
            status: UserStatus.PENDING,
            otp: hashedOTP,
            otpExpiresAt,
        },
    });

    // Send OTP Email
    await sendEmail(
        email,
        'Account Verification OTP',
        `<p>Your OTP for account verification is <strong>${otp}</strong>. It expires in 5 minutes.</p>`
    );

    const { password: _, otp: __, ...userData } = newUser;
    return userData;
};

const verifyAccount = async (payload: { email: string; otp: string }) => {
    const { email, otp } = payload;

    const user = await prisma.user.findUnique({
        where: { email },
    });

    if (!user) {
        throw new AppError(404, 'User not found');
    }

    if (user.status === UserStatus.ACTIVE) {
        throw new AppError(400, 'User already active');
    }

    if (!user.otp || !user.otpExpiresAt) {
        throw new AppError(400, 'Invalid verification request');
    }

    if (new Date() > user.otpExpiresAt) {
        throw new AppError(400, 'OTP expired');
    }

    const isOtpValid = await bcrypt.compare(otp, user.otp);
    if (!isOtpValid) {
        throw new AppError(400, 'Invalid OTP');
    }

    const updatedUser = await prisma.user.update({
        where: { email },
        data: {
            status: UserStatus.ACTIVE,
            otp: null,
            otpExpiresAt: null,
        },
    });

    const { password: _, otp: __, ...userData } = updatedUser;
    return userData;
};

const loginRequest = async (payload: { email: string; password: string }) => {
    const { email, password } = payload;

    const user = await prisma.user.findUnique({
        where: { email },
    });

    if (!user) {
        throw new AppError(404, 'User not found');
    }

    if (user.status === UserStatus.BLOCKED) {
        throw new AppError(403, 'User is blocked');
    }

    if (user.status === UserStatus.PENDING) {
        throw new AppError(403, 'Please verify your account first');
        // Optionally resend OTP here if needed
    }

    if (!user.password) {
        throw new AppError(403, 'Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
        throw new AppError(403, 'Invalid credentials');
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

    await sendEmail(
        email,
        'Login OTP',
        `<p>Your OTP for login is <strong>${otp}</strong>. It expires in 5 minutes.</p>`
    );

    return { message: 'OTP sent to your email' };
};

const loginVerify = async (payload: { email: string; otp: string }) => {
    const { email, otp } = payload;

    const user = await prisma.user.findUnique({
        where: { email },
    });

    if (!user) {
        throw new AppError(404, 'User not found');
    }

    if (!user.otp || !user.otpExpiresAt) {
        throw new AppError(400, 'No OTP request found');
    }

    if (new Date() > user.otpExpiresAt) {
        throw new AppError(400, 'OTP expired');
    }

    const isOtpValid = await bcrypt.compare(otp, user.otp);
    if (!isOtpValid) {
        throw new AppError(400, 'Invalid OTP');
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
    const accessToken = jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        config.jwt_access_secret as string,
        { expiresIn: (config.jwt_access_expires_in || '1d') as any }
    );

    const refreshToken = jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        config.jwt_refresh_secret as string,
        { expiresIn: (config.jwt_refresh_expires_in || '365d') as any }
    );

    return {
        accessToken,
        refreshToken,
    };
};

const loginWithGoogle = async (idToken: string) => {
    const client = new OAuth2Client(config.google_client_id);
    
    // Verify Google Token
    const ticket = await client.verifyIdToken({
        idToken,
        audience: config.google_client_id as string,
    });
    const payload = ticket.getPayload();
    
    if (!payload || !payload.email) {
        throw new AppError(400, 'Invalid Google Token');
    }

    const { email, name, picture, sub: googleId } = payload;

    // Check if user exists
    let user = await prisma.user.findUnique({
        where: { email },
    });

    if (user) {
        // If user exists but not linked to Google, link it
        if (!user.googleId) {
            user = await prisma.user.update({
                where: { email },
                data: { googleId, avatar: (user.avatar || picture || null) as string | null },
            });
        }
    } else {
        // Create new user (Automatically Verified)
        user = await prisma.user.create({
            data: {
                name: name || 'Google User',
                email,
                googleId,
                avatar: picture || null,
                status: 'ACTIVE',
                // No password for social login
            },
        });
    }

    // Generate Tokens
    const accessToken = jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        config.jwt_access_secret as string,
        { expiresIn: (config.jwt_access_expires_in || '1d') as any }
    );

    const refreshToken = jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        config.jwt_refresh_secret as string,
        { expiresIn: (config.jwt_refresh_expires_in || '365d') as any }
    );

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
};
