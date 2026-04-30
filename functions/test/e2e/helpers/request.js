const axios = require('axios');

const PROJECT_ID = 'todocalendar-1707723626269';
const BASE_URL = `http://127.0.0.1:5001/${PROJECT_ID}/us-central1/api`;
const BASE_URL_V2 = `http://127.0.0.1:5001/${PROJECT_ID}/us-central1/apiV2`;

let authToken = null;

function setAuthToken(token) {
    authToken = token;
}

function createClient(useAuth = true, baseURL = BASE_URL) {
    const headers = {};
    if (useAuth && authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
    }
    return axios.create({
        baseURL,
        headers,
        validateStatus: () => true
    });
}

function authedClient() {
    return createClient(true, BASE_URL);
}

function publicClient() {
    return createClient(false, BASE_URL);
}

function authedClientV2() {
    return createClient(true, BASE_URL_V2);
}

function publicClientV2() {
    return createClient(false, BASE_URL_V2);
}

module.exports = {
    setAuthToken,
    authedClient,
    publicClient,
    authedClientV2,
    publicClientV2,
    BASE_URL,
    BASE_URL_V2
};
