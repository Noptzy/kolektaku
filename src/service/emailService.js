const { Resend } = require('resend');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

const log = logger.createLogger('Email');

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.SMTP_FROM || 'Kolektaku <noreply@kolektaku.id>';

// Load logo as base64 for email embedding
let logoBase64 = null;
try {
    const logoPath = path.join(__dirname, '../../public/logo.png');
    if (fs.existsSync(logoPath)) {
        logoBase64 = fs.readFileSync(logoPath).toString('base64');
    }
} catch (err) {
    log.warn('Could not load logo for emails');
}

const logoImg = logoBase64
    ? `<img src="cid:logo" alt="Kolektaku" style="width:120px;height:auto;margin-bottom:16px;" />`
    : `<h1 style="color:#ec4899;font-family:Inter,sans-serif;margin-bottom:16px;">Kolektaku</h1>`;

function emailWrapper(content) {
    return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8" /></head>
    <body style="margin:0;padding:0;background:#0f0f1a;font-family:Inter,Arial,sans-serif;">
        <div style="max-width:560px;margin:0 auto;padding:40px 24px;">
            <div style="text-align:center;margin-bottom:32px;">
                ${logoImg}
            </div>
            <div style="background:linear-gradient(135deg,#1a1a2e,#16162a);border:1px solid rgba(255,255,255,0.06);border-radius:16px;padding:32px;color:#fff;">
                ${content}
            </div>
            <div style="text-align:center;margin-top:24px;color:rgba(255,255,255,0.3);font-size:12px;">
                <p>© ${new Date().getFullYear()} Kolektaku. All rights reserved.</p>
                <p>Nonton anime & manga favorit kamu tanpa batas.</p>
            </div>
        </div>
    </body>
    </html>`;
}

class EmailService {
    async sendWelcome(email, name) {
        try {
            const html = emailWrapper(`
                <h2 style="color:#ec4899;margin:0 0 8px 0;font-size:22px;">Selamat Datang, ${name || 'Wibu'}! 🎉</h2>
                <p style="color:rgba(255,255,255,0.7);line-height:1.6;margin:0 0 16px 0;">
                    Akun kamu di <strong style="color:#ec4899;">Kolektaku</strong> sudah berhasil dibuat.
                    Sekarang kamu bisa menikmati ribuan anime dan manga.
                </p>
                <p style="color:rgba(255,255,255,0.7);line-height:1.6;margin:0 0 24px 0;">
                    🎁 <strong style="color:#fff;">Bonus:</strong> Kamu bisa mencoba <strong style="color:#ec4899;">Premium Trial 7 hari</strong> secara gratis!
                    Nikmati streaming tanpa iklan dan resolusi 1080p.
                </p>
                <div style="text-align:center;margin-top:24px;">
                    <a href="${process.env.CLIENT_URL?.split(',')[0] || 'http://localhost:5173'}" 
                       style="display:inline-block;padding:12px 32px;background:linear-gradient(135deg,#ec4899,#8b5cf6);color:#fff;text-decoration:none;border-radius:8px;font-weight:700;font-size:14px;">
                        Mulai Nonton Sekarang →
                    </a>
                </div>
            `);

            const options = {
                from: FROM,
                to: email,
                subject: 'Selamat Datang di Kolektaku! 🎉',
                html,
            };

            if (logoBase64) {
                options.attachments = [{
                    filename: 'logo.png',
                    content: logoBase64,
                    contentType: 'image/png',
                    contentDisposition: 'inline',
                    cid: 'logo',
                }];
            }

            await resend.emails.send(options);
            log.info(`Welcome email sent to ${email}`);
        } catch (err) {
            log.error(`Failed to send welcome email to ${email}: ${err.message}`);
        }
    }

    async sendMembershipNotification(email, name, planTitle, expiresAt) {
        try {
            const expiryText = expiresAt
                ? `Berlaku sampai: <strong style="color:#ec4899;">${new Date(expiresAt).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</strong>`
                : `<strong style="color:#ec4899;">LIFETIME</strong> — berlaku selamanya!`;

            const html = emailWrapper(`
                <h2 style="color:#ec4899;margin:0 0 8px 0;font-size:22px;">Membership Aktif! 🎊</h2>
                <p style="color:rgba(255,255,255,0.7);line-height:1.6;margin:0 0 16px 0;">
                    Hai <strong style="color:#fff;">${name || 'Wibu'}</strong>, selamat! 
                    Membershipmu telah diaktifkan oleh admin.
                </p>
                <div style="background:rgba(236,72,153,0.1);border:1px solid rgba(236,72,153,0.2);border-radius:12px;padding:20px;margin:16px 0;">
                    <p style="color:rgba(255,255,255,0.5);font-size:12px;margin:0 0 4px 0;text-transform:uppercase;letter-spacing:0.1em;">Paket</p>
                    <p style="color:#fff;font-size:18px;font-weight:700;margin:0 0 12px 0;">${planTitle}</p>
                    <p style="color:rgba(255,255,255,0.7);font-size:14px;margin:0;">${expiryText}</p>
                </div>
                <p style="color:rgba(255,255,255,0.7);line-height:1.6;margin:16px 0 0 0;">
                    Sekarang kamu bisa menikmati anime tanpa iklan dan streaming 1080p! 🚀
                </p>
            `);

            const options = {
                from: FROM,
                to: email,
                subject: `Membership ${planTitle} Aktif — Kolektaku 🎊`,
                html,
            };

            if (logoBase64) {
                options.attachments = [{
                    filename: 'logo.png',
                    content: logoBase64,
                    contentType: 'image/png',
                    contentDisposition: 'inline',
                    cid: 'logo',
                }];
            }

            await resend.emails.send(options);
            log.info(`Membership email sent to ${email}`);
        } catch (err) {
            log.error(`Failed to send membership email to ${email}: ${err.message}`);
        }
    }
}

module.exports = new EmailService();
