"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Jwt
 */
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const url_1 = __importDefault(require("url"));
const querystring_1 = __importDefault(require("querystring"));
const httperror_1 = require("./httperror");
const jwt = __importStar(require("./jwt"));
const urlHandler = __importStar(require("./urlhandler"));
const credential = __importStar(require("./credentials"));
// `consumerId`
// DEBUG: keytool -exportcert -alias androiddebugkey -keystore ~/.android/debug.keystore | openssl sha1 -binary | openssl base64
// RELESE: keytool -exportcert -alias <RELEASE_KEY_ALIAS> -keystore <RELEASE_KEY_PATH> | openssl sha1 -binary | openssl base64
//
// generateSecret: generate
const DEFAULT_NAME = "Json Web Token";
const CREDENTIALS_REGEXP = /^ *(?:[Bb][Aa][Ss][Ii][Cc]) +([A-Za-z0-9._~+/-]+=*) *$/;
const USER_PASS_REGEXP = /^([^:]*):(.*)$/;
function getRootPath() {
    if (process.env.APP_ROOT_PATH) {
        return process.env.APP_ROOT_PATH;
    }
    const getRoot = function (dir) {
        try {
            const isPkgJson = fs_1.default.accessSync(path_1.default.join(dir, "./package.json"));
            const is_node_modules = fs_1.default.accessSync(path_1.default.join(dir, "./node_modules"));
        }
        catch (e) {
            if (dir === "/") {
                throw new Error("Project root (package.json & node_modules location)");
            }
            return getRoot(path_1.default.join(dir, ".."));
        }
        return dir;
    };
    return getRoot(__dirname);
}
class JwtAuth {
    constructor(config) {
        const rootPath = getRootPath();
        const algorithm = config.algorithm || "HS256";
        const expiresIn = config.expiresIn || "1h";
        this.ignoreUrls = config.ignoreUrls;
        this.checkUrls = config.checkUrls;
        if (config.credentialsFile) {
            this.credentials = new credential.Credentials(rootPath, config.credentialsFile);
        }
        else {
            this.credentials = new credential.Credentials(rootPath, config.credentials);
        }
        this.tokenUrl = config.tokenUrl || "/jwt/token";
        const findCredential = (id) => {
            return this.credentials.findCredential({ id: id });
        };
        const jwtConfig = {
            secretOrPrivateKey: config.secretKey,
            secretOrPublicKey: config.secretKey,
            secureSecret: config.secureSecret,
            checkCredentialExistence: true,
            credentials: config.credentials || findCredential,
            signOptions: {
                algorithm: algorithm,
                expiresIn: expiresIn
            },
            verifyOptions: {
                algorithms: [algorithm]
            }
        };
        this.jwtInstance = new jwt.Jwt(rootPath, jwtConfig);
        this.handler = new urlHandler.UrlHandler();
        this.handler.get(`${this.tokenUrl}/secret`, this.generateSecret());
        this.handler.get(`${this.tokenUrl}/credential`, this.generateCredential());
        this.handler.get(`${this.tokenUrl}`, this.generateToken());
    }
    handle() {
        const self = this;
        return (req, res, next) => {
            req.jwtToken = (credentialId) => {
                const name = DEFAULT_NAME;
                return self.jwtInstance.generateToken(credentialId, name, false);
            };
            const url = req.url;
            self.handler.handle(req, res, (err) => {
                if (typeof err == "object") {
                    next(err);
                }
                else if (self.isIgnored(url)) {
                    next();
                }
                else if (self.canCheck(url)) {
                    self.verify()(req, res, next);
                }
                else {
                    next();
                }
            });
        };
    }
    isIgnored(url) {
        if (this.ignoreUrls && this.ignoreUrls.length) {
            const parsed = url_1.default.parse(url);
            const pathName = parsed.pathname;
            for (const i in this.ignoreUrls) {
                const ignore = this.ignoreUrls[i];
                if (typeof ignore == "string") {
                    if (ignore == pathName)
                        return true;
                }
                else if (typeof ignore == "object") {
                    const ignoreObj = ignore;
                    const regex = new RegExp(ignoreObj.pattern, "i");
                    if (regex.test(pathName))
                        return true;
                }
            }
        }
        return false;
    }
    canCheck(url) {
        if (this.checkUrls && this.checkUrls.length) {
            const parsed = url_1.default.parse(url);
            const pathName = parsed.pathname;
            for (const i in this.checkUrls) {
                const check = this.checkUrls[i];
                if (typeof check == "string") {
                    if (check == pathName)
                        return true;
                }
                else if (typeof check == "object") {
                    const checkObj = check;
                    const regex = new RegExp(checkObj.pattern, "i");
                    if (regex.test(pathName))
                        return true;
                }
            }
            return false;
        }
        return true;
    }
    decodeBase64(str) {
        return Buffer.from(str, "base64").toString();
    }
    parseConsumer(req) {
        if (!req.headers || typeof req.headers !== "object") {
            throw new TypeError("argument req is required to have headers property");
        }
        const authorization = req.headers.authorization;
        const match = CREDENTIALS_REGEXP.exec(authorization);
        if (!match) {
            return undefined;
        }
        const userPass = USER_PASS_REGEXP.exec(this.decodeBase64(match[1]));
        if (!userPass) {
            return undefined;
        }
        return {
            key: userPass[1],
            secret: userPass[2]
        };
    }
    /**
     * Generate jwt token
     * GET /jwt/token
     *    headers [
     *        BasicAuth { username: ${consumerKey}, password: ${keySecret} }
     *    ]
     * Response { "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1NTJkOWVhMi1mMmE0LTQ2N2QtODA5YS01MTk3MmZlY2U1ZGEiLCJuYW1lIjoiSnNvbiBXZWIgVG9rZW4iLCJpYXQiOjQ5MzYxNCwiZXhwIjo0OTcyMTR9.o-OoZ7HYaKYHoN1rxvps8dxQcsHRBNXrCIDHf6uYDOU" }
     */
    generateToken() {
        const self = this;
        return (req, res, next) => {
            const consumer = self.parseConsumer(req);
            if (consumer) {
                const credentials = self.credentials.findCredential({ consumerKey: consumer.key, secret: consumer.secret });
                if (credentials) {
                    const name = DEFAULT_NAME;
                    const credentialId = credentials.id;
                    self.jwtInstance.generateToken(credentialId, name)
                        .then((result) => {
                        self.response(res, undefined, { accessToken: result });
                    })
                        .catch((err) => {
                        self.response(res, err);
                    });
                }
                else {
                    self.response(res, new httperror_1.HttpError(401, "Consumer not found"));
                }
            }
            else {
                self.response(res, new httperror_1.HttpError(401, "Invalid Consumer"));
            }
        };
    }
    /**
     * Generate random secret key
     * GET /jwt/token/secret
     * Response { "key":"Ht2T9Qm9Lr", "secret":"lBz_a30qLgHUDQhblA8k2bqLuP4ezZBwbqgce49qeZg" }
     */
    generateSecret() {
        const self = this;
        const secret = this.credentials.generateCode(10, 3);
        const keySecret = this.credentials.createHmac(secret[0], secret.join(""));
        return (req, res, next) => {
            self.response(res, undefined, {
                key: secret[0],
                secret: keySecret
            });
        };
    }
    /**
     * Generate Credential object for config.credentials
     * GET /jwt/token/credential?secret=${secret|consumerId}
     * Response {"id":"552d9ea2-f2a4-467d-809a-51972fece5da","consumerKey":"lBz_a30qLgHUDQhblA8k2bqLuP4ezZBwbqgce49qeZg","keyId":"Jzr3KLWRpv_t5l9QgeiFezc08ZLNLuS_x3kWADBbikY","keySecret":"pDXSown7DtlOwmuK","isActive":true}
     */
    generateCredential() {
        const self = this;
        return (req, res, next) => {
            const parsedUrl = url_1.default.parse(req.url);
            const parsed = querystring_1.default.decode(parsedUrl.query);
            if (parsed) {
                const consumerKey = `${parsed["key"] || parsed["secret"] || parsed["consumer"]}`;
                if (consumerKey) {
                    const credential = self.credentials.generate(consumerKey, true);
                    self.response(res, undefined, credential);
                }
                else {
                    self.response(res, new Error("Invalid key"));
                }
            }
            else {
                self.response(res, new Error("Invalid key"));
            }
        };
    }
    /**
     * Jwt verify
     * GET *
     *    headers [
     *      authorization "Bearer ${accessToken}"
     *    ]
     */
    verify() {
        const self = this;
        return (req, res, next) => {
            self.jwtInstance.verifyHandle(req, (err, result) => {
                if (err) {
                    self.response(res, err);
                }
                else if (result) {
                    next();
                }
                else {
                    self.response(res, new httperror_1.HttpError(401, "Unauthorized"));
                }
            });
        };
    }
    response(res, err, data) {
        if (err) {
            const code = err.code || err.status || 500;
            if (err instanceof Error) {
                data = {
                    "error": {
                        "code": code,
                        "name": err.name,
                        "message": err.message
                    }
                };
            }
            else if (typeof err == "object") {
                data = { "error": err };
            }
            else {
                data = { "error": `${err}` };
            }
        }
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        res.write(JSON.stringify(data));
        res.end();
    }
}
exports.JwtAuth = JwtAuth;
//# sourceMappingURL=index.js.map