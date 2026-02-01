import nodemailer from 'nodemailer';
import config from '../config/index.js';
export const sendEmail = async (to, subject, html) => {
    const transporter = nodemailer.createTransport({
        host: config.email_host,
        port: Number(config.email_port) || 587,
        secure: false, // true for 465, false for other ports
        auth: {
            user: config.email_user,
            pass: config.email_pass,
        },
        tls: {
            rejectUnauthorized: false,
        },
    });
    await transporter.sendMail({
        from: config.email_from || '"FoodVally" <no-reply@foodvally.com>',
        to,
        subject,
        text: '', // plain text body
        html, // html body
    });
};
