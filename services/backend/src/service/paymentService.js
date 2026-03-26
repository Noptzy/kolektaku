const axios = require('axios');
const prisma = require('../config/prisma');
const resHandler = require('../utils/resHandler');
const emailService = require('./emailService');

const SAWERIA_USER_ID = process.env.SAWERIA_USER_ID;

const getHeaders = () => ({
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Origin': 'https://saweria.co',
    'Referer': 'https://saweria.co/'
});

class PaymentService {
    async createPayment(userId, email, name, planId, voucherCode) {
        if (!SAWERIA_USER_ID) {
            throw Object.assign(resHandler.error('Server configuration missing (Saweria)'), { status: 500 });
        }

        const exactUser = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!exactUser) {
            throw Object.assign(resHandler.error('User not found'), { status: 404 });
        }

        // Admin users cannot purchase memberships
        if (exactUser.roleId === 1) {
            throw Object.assign(resHandler.error('Admin tidak perlu membeli membership'), { status: 403 });
        }

        const dbName = exactUser.name || name || 'User';

        const plan = await prisma.membershipPlan.findUnique({
            where: { id: planId }
        });

        if (!plan) {
            throw Object.assign(resHandler.error('Membership plan not found'), { status: 404 });
        }

        let exactPrice = Number(plan.price);
        const planTitle = plan.title || 'Premium Membership';
        let voucherId = null;

        if (voucherCode) {
            const voucher = await prisma.voucherCode.findUnique({ where: { code: voucherCode } });
            if (!voucher || !voucher.isActive) {
                throw Object.assign(resHandler.error('Voucher tidak valid atau sudah kadaluarsa'), { status: 400 });
            }
            if (voucher.expiresAt && voucher.expiresAt < new Date()) {
                throw Object.assign(resHandler.error('Voucher ini sudah kadaluarsa'), { status: 400 });
            }
            if (voucher.usedCount >= voucher.maxUses) {
                throw Object.assign(resHandler.error('Voucher sudah melebihi batas pemakaian'), { status: 400 });
            }
            if (voucher.planId && voucher.planId !== planId) {
                throw Object.assign(resHandler.error('Voucher ini tidak berlaku untuk paket yang kamu pilih'), { status: 400 });
            }

            // Hitung diskon harga
            const discountAmount = Math.floor(exactPrice * (voucher.discountPercent / 100));
            exactPrice = exactPrice - discountAmount;
            voucherId = voucher.id;
        }

        // Limit nominal QRIS Saweria minimal Rp 1.000
        if (exactPrice < 1000 && exactPrice !== 0) {
            throw Object.assign(resHandler.error(`Nominal pembayaran final (Rp ${exactPrice}) kurang dari batas minimum QRIS Saweria (Rp 1.000). Silakan pilih paket harga yang lebih tinggi.`), { status: 400 });
        }

        // Jika voucher yang dipakai 100% alias Rp 0 secara teknis
        if (exactPrice === 0) {
            // Bisa saja kita langsung proses bypass update di sini. 
            // Namun karena ekspektasi frontend adalah poller / QR string,
            // lebih logis throw error saja bahwa subscription free wajib melewati flow bypass khusus (kalau ada)
            throw Object.assign(resHandler.error('Voucher dengan tagihan akhir Rp 0 saat ini tidak didukung lewat Saweria'), { status: 400 });
        }

        try {
            const response = await axios.post(
                `https://backend.saweria.co/donations/snap/${SAWERIA_USER_ID}`,
                {
                    agree: true,
                    notUnderage: true,
                    message: `Payment Membership - ${planTitle}`,
                    amount: exactPrice,
                    payment_type: "qris",
                    vote: "",
                    currency: "IDR",
                    customer_info: {
                        first_name: dbName,
                        email: email,
                        phone: ""
                    }
                },
                { headers: getHeaders() }
            );

            const { id: snapId, qr_string, amount_raw } = response.data.data;

            await prisma.transaction.create({
                data: {
                    id: snapId,
                    userId,
                    planId,
                    amount: amount_raw,
                    paymentMethod: 'qris_saweria',
                    referenceId: voucherId,
                    status: 'pending',
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            });

            return {
                snapId,
                qr_string,
                amount_raw,
                createdAt: response.data.data.created_at
            };
        } catch (error) {
            console.error('Saweria Create Payment Error:', error?.response?.data || error.message);
            throw Object.assign(resHandler.error('Failed to communicate with payment gateway'), { status: 502 });
        }
    }

    async checkPaymentStatus(snapId) {
        // 1. Cek local transaction status
        const trx = await prisma.transaction.findUnique({
            where: { id: snapId },
            include: { plan: true }
        });

        if (!trx) {
            throw Object.assign(resHandler.error('Transaction not found'), { status: 404 });
        }

        // Kalau di db sudah sukses, kembalikan sukses (mencegah overhitting saweria/multiple add exp)
        if (trx.status === 'success') {
            return { status: 'success' };
        }

        // 2. GET dari Saweria
        try {
            const response = await axios.get(
                `https://backend.saweria.co/donations/qris/snap/${snapId}`,
                { headers: getHeaders() }
            );

            const transactionStatus = response.data.data.transaction_status; // "Pending" | "Success" | "Failed"

            if (transactionStatus === 'Success') {
                // Lakukan Atomic Update Transaction + UserSubscription
                await prisma.$transaction(async (tx) => {
                    // Update trx status
                    await tx.transaction.update({
                        where: { id: snapId },
                        data: { 
                            status: 'success',
                            updatedAt: new Date()
                        }
                    });

                    const currentSub = await tx.userSubscription.findUnique({
                        where: { userId: trx.userId }
                    });

                    // Tambahkan exp hari sesuai plan (atau set dari sekarang)
                    const durationDays = trx.plan.durationDays || 30;
                    const now = new Date();
                    let newExpiredAt;

                    if (currentSub && currentSub.expiredAt && currentSub.expiredAt > now) {
                        // Perpanjang
                        newExpiredAt = new Date(currentSub.expiredAt);
                        newExpiredAt.setDate(newExpiredAt.getDate() + durationDays);
                    } else {
                        // Baru langganan / udah habis
                        newExpiredAt = new Date();
                        newExpiredAt.setDate(newExpiredAt.getDate() + durationDays);
                    }

                    await tx.userSubscription.upsert({
                        where: { userId: trx.userId },
                        update: {
                            planId: trx.planId,
                            price: trx.amount,
                            expiredAt: newExpiredAt,
                            updatedAt: new Date()
                        },
                        create: {
                            userId: trx.userId,
                            planId: trx.planId,
                            price: trx.amount,
                            expiredAt: newExpiredAt,
                            updatedAt: new Date()
                        }
                    });

                    // Upgrade Role User ke Premium (Role ID 2)
                    await tx.user.update({
                        where: { id: trx.userId },
                        data: { roleId: 2 }
                    });

                    // Cek Voucher dan input usages jika transaksi tadi memanfaatkannya
                    if (trx.referenceId) {
                        try {
                            const voucher = await tx.voucherCode.findUnique({ where: { id: trx.referenceId } });
                            if (voucher) {
                                await tx.voucherCode.update({
                                    where: { id: trx.referenceId },
                                    data: { usedCount: { increment: 1 } }
                                });
                                await tx.voucherUsage.create({
                                    data: {
                                        voucherId: trx.referenceId,
                                        userId: trx.userId,
                                        planId: trx.planId
                                    }
                                });
                            }
                        } catch (e) {
                            console.error("Gagal mendata usage voucher: ", e);
                        }
                    }
                });

                // Trigger Email Notification (Done outside $transaction to avoid blocking)
                try {
                    const fullUser = await prisma.user.findUnique({ where: { id: trx.userId } });
                    if (fullUser && fullUser.email) {
                        emailService.sendMembershipNotification(
                            fullUser.email,
                            fullUser.name,
                            trx.plan.title,
                            null, // null if it's better to refetch newExpiredAt or not needed for the email
                            { source: 'purchase' }
                        ).catch(e => console.error("Gagal kirim email payment success:", e));
                    }
                } catch (e) {
                    console.error("Gagal menyiapkan data email payment success:", e);
                }

                return { status: 'success' };
            }

            return { status: 'pending' };

        } catch (error) {
            console.error('Saweria Check Status Error:', error?.response?.data || error.message);
            throw Object.assign(resHandler.error('Failed checking payment status'), { status: 502 });
        }
    }
}

module.exports = new PaymentService();
