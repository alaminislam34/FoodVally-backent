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

const registerUser = async (payload: any) => {
  const { email, password, name } = payload;

  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    if (
      existingUser.status === UserStatus.ACTIVE ||
      existingUser.emailVerifiedAt
    ) {
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

    await sendEmail(
      email,
      "Account Verification OTP",
      `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700&display=swap" rel="stylesheet">
  <title>FoodVally Verification</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #f8fafc;
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      color: #334155;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      padding: 40px 15px;
      box-sizing: border-box;
    }
    .container {
      max-width: 480px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 24px;
      padding: 40px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.04), 0 8px 10px -6px rgba(0, 0, 0, 0.04);
    }
    .brand_container {
      text-align: center;
      margin-bottom: 32px;
    }
    .brand_image {
      max-width: 180px;
      height: auto;
      object-fit: contain;
    }
    .content_header {
      text-align: center;
      margin-bottom: 24px;
    }
    .heading {
      font-size: 22px;
      font-weight: 700;
      color: #1e293b;
      margin-bottom: 12px;
    }
    .text {
      font-size: 15px;
      line-height: 1.6;
      color: #64748b;
      margin-bottom: 24px;
      text-align: center;
    }
    .otp-container {
      background: linear-gradient(135deg, #f97316 0%, #fb923c 100%);
      padding: 20px;
      border-radius: 16px;
      text-align: center;
      margin: 30px 0;
      box-shadow: 0 4px 12px rgba(249, 115, 22, 0.2);
    }
    .otp-box {
      color: #ffffff;
      font-size: 32px;
      font-weight: 800;
      letter-spacing: 8px;
      margin-left: 8px; /* Offsets letter spacing for perfect center */
    }
    .expiry {
      text-align: center;
      font-size: 13px;
      color: #94a3b8;
      margin-bottom: 30px;
    }
    .security-notice {
      background-color: #f1f5f9;
      border-radius: 12px;
      padding: 16px;
      font-size: 13px;
      line-height: 1.5;
      color: #475569;
      text-align: center;
    }
    .divider {
      height: 1px;
      background-color: #e2e8f0;
      margin: 32px 0;
    }
    .footer {
      text-align: center;
      font-size: 12px;
      color: #94a3b8;
      line-height: 1.5;
    }
    .footer strong {
      color: #64748b;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="brand_container">
        <img src="https://i.ibb.co.com/psygcQz/foodvely.png" alt="FoodVally Logo" class="brand_image" /> 
      </div>

      <div class="content_header">
        <div class="heading">Verify your email</div>
        <p class="text">
          Hi <strong>${name}</strong>,<br>
          Use the code below to securely sign in to your FoodVally account.
        </p>
      </div>

      <div class="otp-container">
        <div class="otp-box">${otp}</div>
      </div>

      <div class="expiry">
        Expires in <span style="color: #1e293b; font-weight: 600;">5 minutes</span>
      </div>

      <div class="security-notice">
        <strong>Not you?</strong> If you didn't request this, you can safely ignore this email.
      </div>

      <div class="divider"></div>

      <div class="footer">
        Thanks for being part of the <strong>FoodVally</strong> community!<br>
        &copy; 2026 FoodVally Inc. All rights reserved.
      </div>
    </div>
  </div>
</body>
</html>`,
    );

    return { message: "Verification OTP resent" };
  }

  const hashedPassword = await bcrypt.hash(password, 12);
  const otp = generateOTP();
  const hashedOTP = await bcrypt.hash(otp, 12);

  const parts = email.split("@");
  const username = parts[0];
  // OTP expires in 5 minutes
  const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);

  await prisma.user.create({
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
  await sendEmail(
    email,
    "Account Verification OTP",
    `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700&display=swap" rel="stylesheet">
  <title>FoodVally Verification</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #f8fafc;
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      color: #334155;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      padding: 40px 15px;
      box-sizing: border-box;
    }
    .container {
      max-width: 480px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 24px;
      padding: 40px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.04), 0 8px 10px -6px rgba(0, 0, 0, 0.04);
    }
    .brand_container {
      text-align: center;
      margin-bottom: 32px;
    }
    .brand_image {
      max-width: 180px;
      height: auto;
      object-fit: contain;
    }
    .content_header {
      text-align: center;
      margin-bottom: 24px;
    }
    .heading {
      font-size: 22px;
      font-weight: 700;
      color: #1e293b;
      margin-bottom: 12px;
    }
    .text {
      font-size: 15px;
      line-height: 1.6;
      color: #64748b;
      margin-bottom: 24px;
      text-align: center;
    }
    .otp-container {
      background: linear-gradient(135deg, #f97316 0%, #fb923c 100%);
      padding: 20px;
      border-radius: 16px;
      text-align: center;
      margin: 30px 0;
      box-shadow: 0 4px 12px rgba(249, 115, 22, 0.2);
    }
    .otp-box {
      color: #ffffff;
      font-size: 32px;
      font-weight: 800;
      letter-spacing: 8px;
      margin-left: 8px; /* Offsets letter spacing for perfect center */
    }
    .expiry {
      text-align: center;
      font-size: 13px;
      color: #94a3b8;
      margin-bottom: 30px;
    }
    .security-notice {
      background-color: #f1f5f9;
      border-radius: 12px;
      padding: 16px;
      font-size: 13px;
      line-height: 1.5;
      color: #475569;
      text-align: center;
    }
    .divider {
      height: 1px;
      background-color: #e2e8f0;
      margin: 32px 0;
    }
    .footer {
      text-align: center;
      font-size: 12px;
      color: #94a3b8;
      line-height: 1.5;
    }
    .footer strong {
      color: #64748b;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="brand_container">
        <img src="https://i.ibb.co.com/psygcQz/foodvely.png" alt="FoodVally Logo" class="brand_image" /> 
      </div>

      <div class="content_header">
        <div class="heading">Verify your email</div>
        <p class="text">
          Hi <strong>${name}</strong>,<br>
          Use the code below to securely sign in to your FoodVally account.
        </p>
      </div>

      <div class="otp-container">
        <div class="otp-box">${otp}</div>
      </div>

      <div class="expiry">
        Expires in <span style="color: #1e293b; font-weight: 600;">5 minutes</span>
      </div>

      <div class="security-notice">
        <strong>Not you?</strong> If you didn't request this, you can safely ignore this email.
      </div>

      <div class="divider"></div>

      <div class="footer">
        Thanks for being part of the <strong>FoodVally</strong> community!<br>
        &copy; 2026 FoodVally Inc. All rights reserved.
      </div>
    </div>
  </div>
</body>
</html>`,
  );

  return {
    message: "User registered successfully. Please check your email for OTP.",
  };
};

const verifyAccount = async (payload: { email: string; otp: string }) => {
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

  await prisma.user.update({
    where: { email },
    data: {
      status: UserStatus.ACTIVE,
      emailVerifiedAt: new Date(),
      otp: null,
      otpExpiresAt: null,
    },
  });

  return { message: "Account verified successfully." };
};

const loginRequest = async (payload: { email: string; password: string }) => {
  const { email, password } = payload;
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

  // Generate Tokens
  const accessToken = jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    config.jwt_access_secret as string,
    { expiresIn: (config.jwt_access_expires_in || "1d") as any },
  );

  const refreshToken = jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    config.jwt_refresh_secret as string,
    { expiresIn: (config.jwt_refresh_expires_in || "365d") as any },
  );

  return { access: accessToken, refresh: refreshToken };
};

const loginVerify = async (payload: { email: string; otp: string }) => {
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
  const accessToken = jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    config.jwt_access_secret as string,
    { expiresIn: (config.jwt_access_expires_in || "1d") as any },
  );

  const refreshToken = jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    config.jwt_refresh_secret as string,
    { expiresIn: (config.jwt_refresh_expires_in || "365d") as any },
  );

  return {
    accessToken,
    refreshToken,
  };
};

const refreshToken = async (payload: { refresh_token: string }) => {
  const { refresh_token } = payload;
  if (!refresh_token) {
    throw new AppError(400, "Invalid or expired refresh token");
  }
  if (!config.jwt_refresh_secret) {
    throw new AppError(500, "Server configuration error");
  }
  let decoded: jwt.JwtPayload | string;

  try {
    decoded = jwt.verify(refresh_token, config.jwt_refresh_secret as string);
  } catch (error) {
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

  const accessToken = jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    config.jwt_access_secret as string,
    { expiresIn: (config.jwt_access_expires_in || "1d") as any },
  );

  const newRefreshToken = jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    config.jwt_refresh_secret as string,
    { expiresIn: (config.jwt_refresh_expires_in || "365d") as any },
  );

  return {
    accessToken,
    refreshToken: newRefreshToken,
  };
};

const resendVerification = async (payload: { email: string }) => {
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

  await sendEmail(
    email,
    "Account Verification OTP",
    `<p>Your OTP for account verification is <strong>${otp}</strong>. It expires in 5 minutes.</p>`,
  );

  return { message: "Verification OTP resent" };
};

const loginWithGoogle = async (payload: {
  idToken?: string;
  token?: string;
}) => {
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
    audience: config.google_client_id as string,
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
  const parts: string[] = email.split("@");
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
          avatar: (user.avatar || picture || null) as string | null,
          status: UserStatus.ACTIVE,
          emailVerifiedAt: user.emailVerifiedAt || new Date(),
        },
      });
    }
  } else {
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
  const accessToken = jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    config.jwt_access_secret as string,
    { expiresIn: (config.jwt_access_expires_in || "1d") as any },
  );

  const refreshToken = jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    config.jwt_refresh_secret as string,
    { expiresIn: (config.jwt_refresh_expires_in || "30d") as any },
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
  refreshToken,
  resendVerification,
};
