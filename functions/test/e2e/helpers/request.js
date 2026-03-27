const axios = require('axios');

const PROJECT_ID = 'todocalendar-1707723626269';
const BASE_URL = `http://127.0.0.1:5001/${PROJECT_ID}/us-central1/api`;

let authToken = null;

function setAuthToken(token) {
    authToken = token;
}

function createClient(useAuth = true) {
    const headers = {};
    if (useAuth && authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
    }
    return axios.create({
        baseURL: BASE_URL,
        headers,
        validateStatus: () => true
    });
}

function authedClient() {
    return createClient(true);
}

function publicClient() {
    return createClient(false);
}

module.exports = { setAuthToken, authedClient, publicClient, BASE_URL };
