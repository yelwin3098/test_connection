"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Dashboard Router
 */
const pathModule = __importStar(require("path"));
const fs = __importStar(require("fs"));
const crypto = __importStar(require("crypto"));
const oauth2_1 = require("./oauth2");
const basic_auth_1 = require("./basic-auth");
const csrf_1 = require("./csrf");
function mixin(dest, src, redefine = true) {
    if (!dest) {
        throw new TypeError("argument dest is required");
    }
    if (!src) {
        throw new TypeError("argument src is required");
    }
    const hasOwnProperty = Object.prototype.hasOwnProperty;
    Object.getOwnPropertyNames(src).forEach((name) => {
        if (!redefine && hasOwnProperty.call(dest, name)) {
            return;
        }
        const descriptor = Object.getOwnPropertyDescriptor(src, name);
        Object.defineProperty(dest, name, descriptor);
    });
    return dest;
}
class AuthModel {
    constructor() {
        this.data = this.load();
    }
    get authFilePath() {
        return pathModule.join(__dirname, "../../data/system-account.json");
    }
    load() {
        const filename = this.authFilePath;
        const fileData = fs.readFileSync(filename, "utf8");
        if (fileData && typeof fileData == "string") {
            return JSON.parse(fileData);
        }
        return false;
    }
    md5(str) {
        return crypto.createHash("md5").update(str, "ascii").digest("hex").toUpperCase();
    }
    getAccessToken(bearerToken) {
        if (this.data) {
            const tokens = this.data.tokens.filter((token) => {
                return token.accessToken == bearerToken;
            });
            return tokens.length ? tokens[0] : false;
        }
        return false;
    }
    getRefreshToken(bearerToken) {
        if (this.data) {
            const tokens = this.data.tokens.filter((token) => {
                return token.refreshToken == bearerToken;
            });
            return tokens.length ? tokens[0] : false;
        }
        return false;
    }
    getClient(clientId, clientSecret) {
        if (this.data) {
            const clients = this.data.clients.filter((client) => {
                return client.clientId == clientId && client.clientSecret == clientSecret;
            });
            return clients.length ? clients[0] : false;
        }
        return false;
    }
    saveToken(token, client, user) {
        if (!this.data.tokens) {
            this.data.tokens = [];
        }
        const tokenData = {
            accessToken: token.accessToken,
            accessTokenExpiresAt: token.accessTokenExpiresAt,
            clientId: client.clientId,
            refreshToken: token.refreshToken,
            refreshTokenExpiresAt: token.refreshTokenExpiresAt,
            userId: user.id
        };
        this.data.tokens.push(tokenData);
        const filename = this.authFilePath;
        fs.writeFileSync(filename, JSON.stringify(this.data));
        token.client = {
            id: client.clientId
        };
        token.user = {
            id: user.username || user.clientId
        };
        return token;
    }
    getUser(username, password) {
        if (this.data) {
            const pass = this.md5(`${password}`);
            const users = this.data.users.filter((user) => {
                return user.username == username && user.password == pass;
            });
            return users.length ? users[0] : false;
        }
        return false;
    }
    getUserFromClient(client) {
        if (this.data) {
            const clients = this.data.clients.filter((client) => {
                return client.clientId == client.clientId && client.clientSecret == client.clientSecret;
            });
            return clients.length ? clients[0] : false;
        }
        return false;
    }
}
class Auth {
    constructor(options = {}) {
        this.model = new AuthModel();
        this.csrfTokens = new csrf_1.Tokens();
        this.csrf = new csrf_1.Csrf(mixin({
            "sessionKey": "authCsrfSession"
        }, options, true));
        this.oauth2 = new oauth2_1.OAuth2(mixin({ "model": this.model }, options, true));
    }
    handle(type) {
        const self = this;
        return function (req, res, next) {
            const url = req.url;
            if (/^\/csrf\/secret/.test(url)) {
                self.csrfSecret(self, req, res, next);
            }
            else if (/^\/csrf\/token/.test(url)) {
                self.csrfToken(self, req, res, next);
            }
            else if (/^\/oauth2\/token/.test(url)) {
                self.oauth2Token(self, req, res, next);
            }
            else if (type == "basic") {
                self.basicHandle(self, req, res, next);
            }
            else if (type == "csrf") {
                self.csrf.handle(req, res, next);
            }
            else if (type == "oauth2") {
                self.oauth2Authenticate(self, req, res, next);
            }
            else {
                next();
            }
        };
    }
    basicHandle(self, req, res, next) {
        const basic = new basic_auth_1.BasicAuth(req);
        const user = self.model.getUser(basic.name, basic.pass);
        if (user) {
            next();
        }
        else {
            res.writeHead(401, {
                "WWW-Authenticate": "Basic realm=\"Basic Authentication\"",
                "Content-Type": "application/json; charset=utf-8"
            });
            res.write(JSON.stringify({ "error": "Authorization is needed" }));
            res.end();
        }
    }
    csrfSecret(self, req, res, next) {
        self.csrfTokens.secret()
            .then((result) => {
            self.response(res, undefined, { "secret": result });
        }).catch((err) => {
            self.response(res, err);
        });
    }
    csrfToken(self, req, res, next) {
        const reqData = req.body || req.query;
        const secret = reqData.secret || reqData._secret ||
            (req.headers["csrf-secret"]) ||
            (req.headers["xsrf-secret"]) ||
            (req.headers["x-csrf-secret"]) ||
            (req.headers["x-xsrf-secret"]) || "";
        self.csrfTokens.create(secret)
            .then((result) => {
            self.response(res, undefined, { "secret": secret, "token": result });
        }).catch((err) => {
            self.response(res, err);
        });
    }
    oauth2Token(self, req, res, next) {
        const token = self.oauth2.token(req, res);
        self.response(res, undefined, { "token": token });
    }
    oauth2Authenticate(self, req, res, next) {
        try {
            const accessToken = self.oauth2.authenticate(req, res);
            req.token = accessToken;
            next();
        }
        catch (err) {
            self.response(res, err);
        }
    }
    response(res, err, data) {
        if (err) {
            const code = err.code || err.status || 500;
            if (err instanceof Error) {
                data = {
                    "error": {
                        "code": code,
                        "name": err.name,
                        "message": err.message,
                        "stack": err.stack
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
exports.Auth = Auth;
//# sourceMappingURL=index.js.map