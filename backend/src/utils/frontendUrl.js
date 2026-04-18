const DEFAULT_FRONTEND_BASE_URL = 'http://localhost:5500';
const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

function normalizeFrontendBaseUrl(value = '') {
    return String(value || '').trim().replace(/\/+$/, '');
}

function isLoopbackBaseUrl(value = '') {
    try {
        const parsed = new URL(normalizeFrontendBaseUrl(value));
        return LOOPBACK_HOSTS.has(String(parsed.hostname || '').toLowerCase());
    } catch (error) {
        return false;
    }
}

function extractOriginBaseUrl(value = '') {
    const normalized = normalizeFrontendBaseUrl(value);
    if (!normalized) return '';

    try {
        const parsed = new URL(normalized);
        return `${parsed.protocol}//${parsed.host}`;
    } catch (error) {
        return '';
    }
}

function resolveRequestBaseUrl(req) {
    if (!req) return '';

    const origin = extractOriginBaseUrl(req.get?.('origin'));
    if (origin) return origin;

    const protoHeader = req.get?.('x-forwarded-proto') || req.protocol || 'http';
    const protocol = String(protoHeader).split(',')[0].trim() || 'http';
    const hostHeader = req.get?.('x-forwarded-host') || req.get?.('host') || '';
    const host = String(hostHeader).split(',')[0].trim();

    if (!host) return '';
    return normalizeFrontendBaseUrl(`${protocol}://${host}`);
}

function resolveFrontendBaseUrl(req) {
    const configured = normalizeFrontendBaseUrl(process.env.FRONTEND_URL);
    const requestBaseUrl = resolveRequestBaseUrl(req);

    if (requestBaseUrl && (!configured || isLoopbackBaseUrl(configured))) {
        return requestBaseUrl;
    }

    return configured || requestBaseUrl || DEFAULT_FRONTEND_BASE_URL;
}

function resolveFrontendBaseUrlFromValue(value = '') {
    return normalizeFrontendBaseUrl(value)
        || normalizeFrontendBaseUrl(process.env.FRONTEND_URL)
        || DEFAULT_FRONTEND_BASE_URL;
}

module.exports = {
    DEFAULT_FRONTEND_BASE_URL,
    normalizeFrontendBaseUrl,
    resolveFrontendBaseUrl,
    resolveFrontendBaseUrlFromValue
};
