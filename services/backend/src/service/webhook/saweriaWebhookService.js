const prisma = require('../../config/prisma');
const logger = require('../../utils/logger');
const { verifySaweriaSignature } = require('./saweriaSignatureService');

const log = logger.createLogger('SaweriaWebhookService');

class SaweriaWebhookService {
    _normalizePayload(rawPayload) {
        if (!rawPayload || typeof rawPayload !== 'object') {
            return { ok: false, reason: 'invalid-payload' };
        }

        const msg = rawPayload.msg === null || rawPayload.msg === undefined ? '' : String(rawPayload.msg).trim();
        const sig = rawPayload.sig === null || rawPayload.sig === undefined ? '' : String(rawPayload.sig).trim();

        if (!msg) return { ok: false, reason: 'missing-message' };
        if (!sig) return { ok: false, reason: 'missing-signature' };

        return {
            ok: true,
            payload: {
                dn: rawPayload.dn,
                amt: rawPayload.amt,
                msg,
                sig,
            },
        };
    }

    _toBigIntAmount(value) {
        if (value === null || value === undefined) return null;

        const normalized = typeof value === 'number'
            ? String(Math.trunc(value))
            : String(value).trim();

        if (!/^\d+$/.test(normalized)) return null;

        return BigInt(normalized);
    }

    _resolveExpiredAt(existingExpiredAt, durationDays, now) {
        if (!durationDays || durationDays <= 0) {
            return null;
        }

        const baseDate = existingExpiredAt && existingExpiredAt > now
            ? new Date(existingExpiredAt)
            : new Date(now);

        baseDate.setDate(baseDate.getDate() + durationDays);
        return baseDate;
    }

    async processWebhook(rawPayload) {
        const normalized = this._normalizePayload(rawPayload);
        if (!normalized.ok) {
            log.warn(`Saweria webhook skipped: ${normalized.reason}`);
            return { processed: false, reason: normalized.reason };
        }

        const payload = normalized.payload;
        const signature = verifySaweriaSignature(payload);
        if (!signature.valid) {
            log.warn(`Saweria webhook signature invalid: ${signature.reason}`);
            return { processed: false, reason: signature.reason };
        }

        try {
            return await prisma.$transaction(async (tx) => {
                const transaction = await tx.transaction.findUnique({
                    where: { id: payload.msg },
                    include: { plan: true },
                });

                if (!transaction) {
                    log.warn(`Saweria webhook: transaction not found (${payload.msg})`);
                    return { processed: false, reason: 'transaction-not-found' };
                }

                if (transaction.status !== 'pending') {
                    log.info(`Saweria webhook: transaction already processed (${transaction.id})`);
                    return { processed: false, reason: 'transaction-not-pending' };
                }

                if (!transaction.plan) {
                    log.error(`Saweria webhook: plan missing for transaction (${transaction.id})`);
                    return { processed: false, reason: 'plan-not-found' };
                }

                const payloadAmount = this._toBigIntAmount(payload.amt);
                if (payloadAmount !== null && transaction.amount !== null && payloadAmount !== transaction.amount) {
                    log.warn(`Saweria webhook: amount mismatch for transaction (${transaction.id})`);
                    return { processed: false, reason: 'amount-mismatch' };
                }

                const now = new Date();
                const currentSubscription = await tx.userSubscription.findUnique({
                    where: { userId: transaction.userId },
                });

                const nextExpiredAt = this._resolveExpiredAt(
                    currentSubscription?.expiredAt || null,
                    transaction.plan.durationDays,
                    now,
                );

                const appliedPrice = transaction.amount ?? transaction.plan.price ?? payloadAmount;

                await tx.userSubscription.upsert({
                    where: { userId: transaction.userId },
                    update: {
                        planId: transaction.planId,
                        price: appliedPrice,
                        expiredAt: nextExpiredAt,
                        updatedAt: now,
                    },
                    create: {
                        userId: transaction.userId,
                        planId: transaction.planId,
                        price: appliedPrice,
                        expiredAt: nextExpiredAt,
                        updatedAt: now,
                    },
                });

                await tx.transaction.update({
                    where: { id: transaction.id },
                    data: {
                        status: 'success',
                        updatedAt: now,
                    },
                });

                await tx.user.update({
                    where: { id: transaction.userId },
                    data: {
                        roleId: 2,
                        updatedAt: now,
                    },
                });

                log.info(`Saweria webhook processed successfully for transaction (${transaction.id})`);

                return {
                    processed: true,
                    reason: 'processed',
                    transactionId: transaction.id,
                    userId: transaction.userId,
                };
            });
        } catch (error) {
            log.error(`Saweria webhook processing failed: ${error.message}`);
            return { processed: false, reason: 'internal-error' };
        }
    }
}

module.exports = new SaweriaWebhookService();
