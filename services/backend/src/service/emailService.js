const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

const log = logger.createLogger('Email');

// Gmail OAuth2 Configuration from .env
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        type: 'OAuth2',
        user: process.env.GMAIL_USER || 'kolektaku@gmail.com', // Atur default jika perlu
        clientId: process.env.CLIENT_ID || process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET,
        refreshToken: process.env.REFRESH_TOKEN_NODEMAILER,
    },
});

const FROM = process.env.SMTP_FROM || 'Kolektaku <kolektaku@gmail.com>';

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

function buildMembershipActivationMessage(source) {
    if (source === 'purchase') {
        return 'Pembelian paket membership kamu berhasil diproses.';
    }
    if (source === 'trial') {
        return 'Premium Trial 7 hari kamu berhasil diaktifkan.';
    }
    if (source === 'admin') {
        return 'Membershipmu telah diaktifkan oleh admin.';
    }
    return 'Membershipmu telah aktif dan siap digunakan.';
}

class EmailService {
    async sendWelcome(email, name, meta = {}) {
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

            const mailOptions = {
                from: FROM,
                to: email,
                subject: 'Selamat Datang di Kolektaku! 🎉',
                html,
            };

            if (logoBase64) {
                mailOptions.attachments = [{
                    filename: 'logo.png',
                    content: logoBase64,
                    encoding: 'base64',
                    cid: 'logo',
                }];
            }

            await transporter.sendMail(mailOptions);
            log.info(`Welcome email sent to ${email}`);
        } catch (err) {
            log.error(`Failed to send welcome email to ${email}: ${err.message}`);
        }
    }

    async sendMembershipNotification(email, name, planTitle, expiresAt, meta = {}) {
        try {
            const expiryText = expiresAt
                ? `Berlaku sampai: <strong style="color:#ec4899;">${new Date(expiresAt).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</strong>`
                : `<strong style="color:#ec4899;">LIFETIME</strong> — berlaku selamanya!`;
            const source = meta?.source || 'system';
            const sourceMessage = buildMembershipActivationMessage(source);

            const html = emailWrapper(`
                <h2 style="color:#ec4899;margin:0 0 8px 0;font-size:22px;">Membership Aktif! 🎊</h2>
                <p style="color:rgba(255,255,255,0.7);line-height:1.6;margin:0 0 16px 0;">
                    Hai <strong style="color:#fff;">${name || 'Wibu'}</strong>, selamat! 
                    ${sourceMessage}
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

            const mailOptions = {
                from: FROM,
                to: email,
                subject: `Membership ${planTitle} Aktif — Kolektaku 🎊`,
                html,
            };

            if (logoBase64) {
                mailOptions.attachments = [{
                    filename: 'logo.png',
                    content: logoBase64,
                    encoding: 'base64',
                    cid: 'logo',
                }];
            }

            await transporter.sendMail(mailOptions);
            log.info(`Membership email sent to ${email}`);
        } catch (err) {
            log.error(`Failed to send membership email to ${email}: ${err.message}`);
        }
    }

    async sendRoleUpgradeNotification(email, name, newRoleTitle, oldRoleTitle = null, options = {}) {
        try {
            const html = emailWrapper(`
                <h2 style="color:#ec4899;margin:0 0 8px 0;font-size:22px;">Role Akun Diperbarui ✨</h2>
                <p style="color:rgba(255,255,255,0.7);line-height:1.6;margin:0 0 16px 0;">
                    Hai <strong style="color:#fff;">${name || 'Wibu'}</strong>, role akun kamu baru saja diperbarui.
                </p>
                <div style="background:rgba(236,72,153,0.1);border:1px solid rgba(236,72,153,0.2);border-radius:12px;padding:20px;margin:16px 0;">
                    <p style="color:rgba(255,255,255,0.5);font-size:12px;margin:0 0 4px 0;text-transform:uppercase;letter-spacing:0.1em;">Role Baru</p>
                    <p style="color:#fff;font-size:18px;font-weight:700;margin:0 0 8px 0;">${newRoleTitle || 'Updated Role'}</p>
                    ${oldRoleTitle ? `<p style="color:rgba(255,255,255,0.7);font-size:14px;margin:0;">Sebelumnya: ${oldRoleTitle}</p>` : ''}
                </div>
                <p style="color:rgba(255,255,255,0.7);line-height:1.6;margin:16px 0 0 0;">
                    Jika kamu merasa perubahan ini tidak sesuai, segera hubungi tim admin Kolektaku.
                </p>
            `);

            const mailOptions = {
                from: FROM,
                to: email,
                subject: `Role akun kamu sekarang ${newRoleTitle || 'Updated Role'} — Kolektaku`,
                html,
            };

            if (logoBase64) {
                mailOptions.attachments = [{
                    filename: 'logo.png',
                    content: logoBase64,
                    encoding: 'base64',
                    cid: 'logo',
                }];
            }

            await transporter.sendMail(mailOptions);
            log.info(`Role update email sent to ${email}`);
        } catch (err) {
            log.error(`Failed to send role update email to ${email}: ${err.message}`);
        }
    }

    async sendMembershipExpiryReminder(email, name, expiresAt) {
        try {
            const html = emailWrapper(`
                <h2 style="color:#ec4899;margin:0 0 8px 0;font-size:22px;">Membership Segera Berakhir ⚠️</h2>
                <p style="color:rgba(255,255,255,0.7);line-height:1.6;margin:0 0 16px 0;">
                    Hai <strong style="color:#fff;">${name || 'Wibu'}</strong>, ini adalah pengingat bahwa masa aktif Premium Membership kamu tinggal <strong>7 Hari</strong> lagi.
                </p>
                <div style="background:rgba(236,72,153,0.1);border:1px solid rgba(236,72,153,0.2);border-radius:12px;padding:20px;margin:16px 0;">
                    <p style="color:rgba(255,255,255,0.5);font-size:12px;margin:0 0 4px 0;text-transform:uppercase;letter-spacing:0.1em;">Berakhir Pada</p>
                    <p style="color:#fff;font-size:16px;font-weight:700;margin:0;">${new Date(expiresAt).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
                <p style="color:rgba(255,255,255,0.7);line-height:1.6;margin:16px 0 0 0;">
                    Yuk, perpanjang sekarang agar kamu tetap bisa streaming anime favorit tanpa iklan dengan kualitas tinggi! Sisa hari aktifmu juga otomatis diakumulasi~
                </p>
                <div style="text-align:center;margin-top:24px;">
                    <a href="${process.env.CLIENT_URL?.split(',')[0] || 'http://localhost:5173'}/membership" 
                       style="display:inline-block;padding:12px 32px;background:linear-gradient(135deg,#ec4899,#8b5cf6);color:#fff;text-decoration:none;border-radius:8px;font-weight:700;font-size:14px;">
                        Perpanjang Membership
                    </a>
                </div>
            `);

            const mailOptions = {
                from: FROM,
                to: email,
                subject: 'Pengingat: Membership Premium Tinggal 7 Hari — Kolektaku',
                html,
            };

            if (logoBase64) {
                mailOptions.attachments = [{
                    filename: 'logo.png',
                    content: logoBase64,
                    encoding: 'base64',
                    cid: 'logo',
                }];
            }

            await transporter.sendMail(mailOptions);
            log.info(`Membership reminder email sent to ${email}`);
        } catch (err) {
            log.error(`Failed to send reminder email to ${email}: ${err.message}`);
        }
    }
}

module.exports = new EmailService();
