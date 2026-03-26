const crypto = require('crypto');

function normalizeString(value) {
    if (value === null || value === undefined) return '';
    return String(value);
}

function normalizeIncomingSignature(signature) {
    return normalizeString(signature).trim().replace(/^sha256=/i, '').toLowerCase();
}

function isHex(value) {
    return /^[a-f0-9]+$/i.test(value);
}

function timingSafeCompareHex(left, right) {
    const normalizedLeft = normalizeIncomingSignature(left);
    const normalizedRight = normalizeIncomingSignature(right);

    if (!normalizedLeft || !normalizedRight) return false;
    if (normalizedLeft.length !== normalizedRight.length) return false;
    if (normalizedLeft.length % 2 !== 0 || normalizedRight.length % 2 !== 0) return false;
    if (!isHex(normalizedLeft) || !isHex(normalizedRight)) return false;

    const leftBuffer = Buffer.from(normalizedLeft, 'hex');
    const rightBuffer = Buffer.from(normalizedRight, 'hex');

    if (leftBuffer.length !== rightBuffer.length) return false;

    return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function buildSignatureCandidates(payload) {
    const dn = normalizeString(payload?.dn);
    const amt = normalizeString(payload?.amt);
    const msg = normalizeString(payload?.msg);

    return [
        `${dn}${amt}${msg}`,
        `${dn}|${amt}|${msg}`,
        JSON.stringify({ dn, amt, msg }),
    ];
}

function signPayload(base, streamKey) {
    return crypto.createHmac('sha256', streamKey).update(base).digest('hex');
}

function verifySaweriaSignature(payload, streamKey = process.env.SAWERIA_STREAM_KEY) {
    if (!streamKey) {
        return { valid: false, reason: 'missing-stream-key' };
    }

    if (!payload || typeof payload !== 'object') {
        return { valid: false, reason: 'invalid-payload' };
    }

    const incomingSignature = payload.sig;
    if (!incomingSignature) {
        return { valid: false, reason: 'missing-signature' };
    }

    const candidates = buildSignatureCandidates(payload).map((base) => ({
        base,
        signature: signPayload(base, streamKey),
    }));

    const matched = candidates.find((candidate) =>
        timingSafeCompareHex(incomingSignature, candidate.signature),
    );

    return {
        valid: Boolean(matched),
        reason: matched ? 'verified' : 'signature-mismatch',
        base: matched?.base || null,
    };
}

module.exports = {
    verifySaweriaSignature,
};
