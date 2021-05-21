"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const url_1 = __importDefault(require("url"));
function parseAuthHeader(hdrValue) {
    const matches = hdrValue.match(/(\S+)\s+(\S+)/);
    return matches && {
        scheme: matches[1],
        value: matches[2]
    };
}
const AUTH_HEADER = "authorization";
const LEGACY_AUTH_SCHEME = "JWT";
const BEARER_AUTH_SCHEME = "bearer";
class Extractors {
    constructor() {
        this.header = this.fromHeader;
        this.query = this.fromUrlQueryParameter;
        this.authScheme = this.fromAuthHeaderWithScheme;
        this.authBearer = this.fromAuthHeaderAsBearerToken;
    }
    fromHeader(header_name) {
        return (request) => {
            let token = undefined;
            if (request.headers[header_name]) {
                token = `${request.headers[header_name]}`;
            }
            return token;
        };
    }
    fromBodyField(field_name) {
        return (request) => {
            const req = request;
            let token = undefined;
            if (req.body && Object.prototype.hasOwnProperty.call(req.body, field_name)) {
                token = `${req.body[field_name]}`;
            }
            return token;
        };
    }
    fromUrlQueryParameter(param_name) {
        return (request) => {
            let token = undefined;
            const parsed_url = url_1.default.parse(request.url, true);
            if (parsed_url.query && Object.prototype.hasOwnProperty.call(parsed_url.query, param_name)) {
                token = `${parsed_url.query[param_name]}`;
            }
            return token;
        };
    }
    fromAuthHeaderWithScheme(auth_scheme) {
        const auth_scheme_lower = auth_scheme.toLowerCase();
        return (request) => {
            let token = undefined;
            // console.log("typeof request.headers['balckkey'] in fromAuthHeaderWithScheme (extractor.ts) >>> ", typeof request.headers['blackkey']);
            if (request.headers[AUTH_HEADER]) {
                const auth_params = parseAuthHeader(request.headers[AUTH_HEADER]);
                if (auth_params && auth_scheme_lower === auth_params.scheme.toLowerCase()) {
                    token = auth_params.value;
                }
            }
            const secrethash = request.headers["secrethash"];
            // return blackkey;
            return token;
            // return request.headers['blackkey'];
        };
    }
    fromAuthHeaderAsBearerToken() {
        return this.fromAuthHeaderWithScheme(BEARER_AUTH_SCHEME);
    }
    fromExtractors(extractors) {
        if (!Array.isArray(extractors)) {
            throw new TypeError("extractors.fromExtractors expects an array");
        }
        return (request) => {
            let token = undefined;
            let index = 0;
            while (!token && index < extractors.length) {
                token = extractors[index].call(this, request);
                index++;
            }
            return token;
        };
    }
    /**
     * This extractor mimics the behavior of the v1.*.* extraction logic.
     *
     * This extractor exists only to provide an easy transition from the v1.*.* API to the v2.0.0 API.
     *
     * This extractor first checks the auth header, if it doesn't find a token there then it checks the
     * specified body field and finally the url query parameters.
     *
     * @param options
     *          authScheme: Expected scheme when JWT can be found in HTTP Authorize header. Default is JWT.
     *          tokenBodyField: Field in request body containing token. Default is auth_token.
     *          tokenQueryParameterName: Query parameter name containing the token. Default is auth_token.
     */
    versionOneCompatibility(options) {
        const authScheme = options.authScheme || LEGACY_AUTH_SCHEME;
        const bodyField = options.tokenBodyField || "auth_token";
        const queryParam = options.tokenQueryParameterName || "auth_token";
        return (request) => {
            const authHeaderExtractor = this.fromAuthHeaderWithScheme(authScheme);
            let token = authHeaderExtractor(request);
            if (!token) {
                const bodyExtractor = this.fromBodyField(bodyField);
                token = bodyExtractor(request);
            }
            if (!token) {
                const queryExtractor = this.fromUrlQueryParameter(queryParam);
                token = queryExtractor(request);
            }
            return token;
        };
    }
}
exports.default = new Extractors();
//# sourceMappingURL=extractors.js.map