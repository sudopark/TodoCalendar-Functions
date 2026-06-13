
const ONE_YEAR_MS = 365 * 86400000;
const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;

// req.query에서 expanded 공통 파라미터 파싱 + limit clamp.
function parseExpandedParams(req) {
    const lowerRaw = req.query.lower, upperRaw = req.query.upper;
    const lower = lowerRaw != null ? Number(lowerRaw) : null;
    const upper = upperRaw != null ? Number(upperRaw) : null;
    let limit = req.query.limit != null ? Number(req.query.limit) : DEFAULT_LIMIT;
    if (!Number.isFinite(limit) || limit <= 0) limit = DEFAULT_LIMIT;
    if (limit > MAX_LIMIT) limit = MAX_LIMIT;
    const cursor = req.query.cursor || null;
    return { lower, upper, limit, cursor };
}

module.exports = { parseExpandedParams, ONE_YEAR_MS, DEFAULT_LIMIT, MAX_LIMIT };
