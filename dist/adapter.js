"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createHTTP2Adapter = void 0;
const axios_1 = require("axios");
const http2 = __importStar(require("http2-wrapper"));
const follow_redirects_1 = require("follow-redirects");
function createHTTP2Adapter(adapterConfig = {}) {
    return (config) => http2Adapter(config, adapterConfig);
}
exports.createHTTP2Adapter = createHTTP2Adapter;
async function http2Adapter(config, adapterConfig) {
    const adapter = (0, axios_1.getAdapter)('http');
    if (await shouldUseHTTP2(config, adapterConfig)) {
        const http2Config = createHTTP2Config(config, adapterConfig);
        return adapter(http2Config);
    }
    else {
        return adapter(config);
    }
}
async function shouldUseHTTP2(config, adapterConfig) {
    if (adapterConfig.force) {
        return true;
    }
    return await isHTTP2Supported(config);
}
async function isHTTP2Supported(config) {
    var _a;
    const lowercasedUrl = config.url.toLowerCase();
    const lowercasedBaseURL = (_a = config.baseURL) === null || _a === void 0 ? void 0 : _a.toLowerCase();
    let url;
    if (lowercasedUrl.startsWith('http:') || lowercasedUrl.startsWith('https:')) {
        // config.url has a higher priority than config.baseURL
        url = new URL(config.url);
    }
    else if (config.baseURL && (lowercasedBaseURL.startsWith('http:') || lowercasedBaseURL.startsWith('https:'))) {
        url = new URL(config.baseURL + config.url);
    }
    else {
        // failed to find a valid url
        throw new Error('Invalid URL: ' + config.url + ' or baseURL: ' + config.baseURL);
    }
    // HTTP2 doesn't support not secured connection.
    if (!url.protocol.startsWith('https:')) {
        return false;
    }
    try {
        const res = await http2.auto.resolveProtocol({
            host: url.host,
            servername: url.hostname,
            port: url.port || 443,
            ALPNProtocols: ['h2', 'http/1.1'],
            rejectUnauthorized: false,
        });
        return res.alpnProtocol === 'h2';
    }
    catch (e) {
        return false;
    }
}
function createHTTP2Config(config, adapterConfig) {
    const requestWrappedWithRedirects = (0, follow_redirects_1.wrap)({
        https: {
            request: (options, handleResponse) => {
                if (adapterConfig.agent) {
                    // @ts-expect-error Typing are not aware of agent prop, but it actually works
                    // https://github.com/szmarczak/http2-wrapper?tab=readme-ov-file#new-http2agentoptions
                    options.agent = adapterConfig.agent;
                }
                const req = http2.request(options, handleResponse);
                const origOn = req.on.bind(req);
                // Omit the socket.setKeepAlive axios action, as HTTP/2 sockets should not be manipulated directly.
                req.on = (name, ...args) => {
                    if (name != 'socket') {
                        return origOn(name, ...args);
                    }
                    return req;
                };
                return req;
            },
        },
    });
    return { ...config, transport: requestWrappedWithRedirects.https };
}
