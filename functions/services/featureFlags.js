// 미완성/실험 기능을 composition root(index.js)에서만 끄고 켜는 env 게이트.
// FEATURE_<NAME> env가 정확히 'true'일 때만 on. 미설정 포함 그 외 값은 전부 off (default off).
// 모르는 flag 이름이면 해당 env가 없으니 자연히 off — registry 대조/throw 없음 (fail-safe).
function isEnabled(name) {
    return process.env[`FEATURE_${name.toUpperCase()}`] === 'true'
}

module.exports = { isEnabled }
