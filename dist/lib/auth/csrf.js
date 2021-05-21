"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
/*!
 * csrf
 * Copyright(c) 2014 Jonathan Ong
 * Copyright(c) 2015 Douglas Christopher Wilson
 * MIT Licensed
 */
const crypto = __importStar(require("crypto"));
/**
 * Module variables.
 * @private
 */
const EQUAL_GLOBAL_REGEXP = /=/g;
const PLUS_GLOBAL_REGEXP = /\+/g;
const SLASH_GLOBAL_REGEXP = /\//g;
const generateAttempts = 1;
class Uuid {
    constructor() { }
    static generateRandomBytes(size, attempts, callback) {
        crypto.randomBytes(size, function (err, buf) {
            if (!err)
                return callback(undefined, buf);
            if (!--attempts)
                return callback(err);
            setTimeout(Uuid.generateRandomBytes.bind(undefined, size, attempts, callback), 10);
        });
    }
    /**
     * Generates strong pseudo-random bytes.
     *
     * @param {number} size
     * @param {function} [callback]
     * @return {Promise}
     * @public
     */
    static randomBytes(size, callback) {
        if (typeof callback === "function") {
            // classic callback style
            Uuid.generateRandomBytes(size, generateAttempts, callback);
        }
        else {
            return new Promise((resolve, reject) => {
                Uuid.generateRandomBytes(size, generateAttempts, (err, str) => {
                    if (err)
                        return reject(err);
                    resolve(str);
                });
            });
        }
    }
    static randomBytesSync(size) {
        let err = undefined;
        for (let i = 0; i < generateAttempts; i++) {
            try {
                return crypto.randomBytes(size);
            }
            catch (e) {
                err = e;
            }
        }
        throw err;
    }
    static generateUid(length, callback) {
        Uuid.randomBytes(length, function (err, buf) {
            if (err)
                return callback(err);
            const str = buf.toString("base64")
                .replace(PLUS_GLOBAL_REGEXP, "-")
                .replace(SLASH_GLOBAL_REGEXP, "_")
                .replace(EQUAL_GLOBAL_REGEXP, "");
            callback(undefined, str);
        });
    }
    /**
     * Generate a unique ID string.
     *
     * @param {number} length
     * @param {function} callback
     * @private
     */
    static generate(length, callback) {
        // validate callback is a function, if provided
        if (typeof callback === "function") {
            // classic callback style
            Uuid.generateUid(length, callback);
        }
        else {
            return new Promise((resolve, reject) => {
                Uuid.generateUid(length, (err, str) => {
                    if (err)
                        return reject(err);
                    resolve(str);
                });
            });
        }
    }
    static generateSync(length) {
        const buf = Uuid.randomBytesSync(length);
        return buf.toString("base64")
            .replace(PLUS_GLOBAL_REGEXP, "-")
            .replace(SLASH_GLOBAL_REGEXP, "_")
            .replace(EQUAL_GLOBAL_REGEXP, "");
    }
}
class Tokens {
    /**
     * Token generation/verification class.
     *
     * @param {object} [options]
     * @param {number} [options.saltLength=8] The string length of the salt
     * @param {number} [options.secretLength=18] The byte length of the secret key
     * @public
     */
    constructor(options) {
        const opts = options || {};
        const saltLength = opts.saltLength || 8;
        if (typeof saltLength !== "number" || !isFinite(saltLength) || saltLength < 1) {
            throw new TypeError("option saltLength must be finite number > 1");
        }
        const secretLength = opts.secretLength || 18;
        if (typeof secretLength !== "number" || !isFinite(secretLength) || secretLength < 1) {
            throw new TypeError("option secretLength must be finite number > 1");
        }
        this.saltLength = saltLength;
        this.secretLength = secretLength;
    }
    /**
     * Create a new CSRF token synchronously.
     *
     * @param {string} secret The secret for the token.
     * @param {function} [callback]
     * @public
     */
    create(secret, callback) {
        const promise = new Promise((resolve, reject) => {
            if (!secret || typeof secret !== "string") {
                reject(new TypeError("argument secret is required"));
            }
            else {
                const token = this._tokenize(secret, rndm(this.saltLength));
                resolve(token);
            }
        });
        if (typeof callback === "function") {
            promise.then((result) => {
                callback(undefined, result);
            }).catch((err) => {
                callback(err, undefined);
            });
        }
        else {
            return promise;
        }
    }
    /**
     * Create a new CSRF token synchronously.
     *
     * @param {string} secret The secret for the token.
     * @public
     */
    createSync(secret) {
        if (!secret || typeof secret !== "string") {
            throw new TypeError("argument secret is required");
        }
        return this._tokenize(secret, rndm(this.saltLength));
    }
    /**
     * Create a new secret key.
     *
     * @param {function} [callback]
     * @public
     */
    secret(callback) {
        return Uuid.generate(this.secretLength, callback);
    }
    /**
     * Create a new secret key synchronously.
     * @public
     */
    secretSync() {
        return Uuid.generateSync(this.secretLength);
    }
    /**
     * Tokenize a secret and salt.
     * @private
     */
    _tokenize(secret, salt) {
        return salt + "-" + hash(`${salt} - ${secret}`);
    }
    /**
     * Verify if a given token is valid for a given secret.
     *
     * @param {string} secret
     * @param {string} token
     * @public
     */
    verify(secret, token) {
        if (!secret || typeof secret !== "string") {
            return false;
        }
        if (!token || typeof token !== "string") {
            return false;
        }
        const index = token.indexOf("-");
        if (index === -1) {
            return false;
        }
        const salt = token.substr(0, index);
        const expected = this._tokenize(secret, salt);
        return compare(token, expected);
    }
}
exports.Tokens = Tokens;
/**
 * Hash a string with SHA1, returning url-safe base64
 * @param {string} str
 * @private
 */
function hash(str) {
    return crypto
        .createHash("sha1")
        .update(str, "ascii")
        .digest("base64")
        .replace(PLUS_GLOBAL_REGEXP, "-")
        .replace(SLASH_GLOBAL_REGEXP, "_")
        .replace(EQUAL_GLOBAL_REGEXP, "");
}
// Implements Brad Hill's Double HMAC pattern from
// https://www.nccgroup.trust/us/about-us/newsroom-and-events/blog/2011/february/double-hmac-verification/.
// The approach is similar to the node's native implementation of timing safe buffer comparison that will be available on v6+.
// https://github.com/nodejs/node/issues/3043
// https://github.com/nodejs/node/pull/3073
function compare(a, b) {
    const sa = String(a);
    const sb = String(b);
    const key = crypto.randomBytes(32);
    const ah = crypto.createHmac("sha256", key).update(sa).digest();
    const bh = crypto.createHmac("sha256", key).update(sb).digest();
    const bufferEqual = function (a_buf, b_buf) {
        if (a_buf.length !== b_buf.length) {
            return false;
        }
        for (let i = 0; i < a_buf.length; i++) {
            if (a_buf[i] !== b_buf[i]) {
                return false;
            }
        }
        return true;
    };
    return bufferEqual(ah, bh) && a === b;
}
function rndm(len) {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    const length = Buffer.byteLength(chars);
    len = len || 10;
    let salt = "";
    for (let i = 0; i < len; i++) {
        salt += chars[Math.floor(length * Math.random())];
    }
    return salt;
}
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
class Csrf {
    constructor(options) {
        const opts = options || {};
        // get cookie options
        this.cookie = this.getCookieOptions(opts.cookie);
        // get session options
        this.sessionKey = opts.sessionKey || "session";
        // get value getter
        this.value = opts.value || this.defaultValue;
        // token repo
        this.tokens = new Tokens(opts);
        // ignored methods
        const ignoreMethods = (typeof opts.ignoreMethods == "undefined")
            ? ["GET", "HEAD", "OPTIONS"]
            : opts.ignoreMethods;
        if (!Array.isArray(ignoreMethods)) {
            throw new TypeError("option ignoreMethods must be an array");
        }
        // generate lookup
        this.ignoreMethod = this.getIgnoredMethods(ignoreMethods);
    }
    handle(req, res, next) {
        // validate the configuration against request
        if (!this.verifyConfiguration(req, this.sessionKey, this.cookie)) {
            return next(new Error("misconfigured csrf"));
        }
        // get the secret from the request
        let secret = this.getSecret(req, this.sessionKey, this.cookie);
        let token;
        // lazy-load token getter
        req.csrfToken = () => {
            let sec = !this.cookie
                ? this.getSecret(req, this.sessionKey, this.cookie)
                : secret;
            // use cached token if secret has not changed
            if (token && sec === secret) {
                return token;
            }
            // generate & set new secret
            if (sec === undefined) {
                sec = this.tokens.secretSync();
                this.setSecret(req, res, this.sessionKey, sec, this.cookie);
            }
            // update changed secret
            secret = sec;
            // create new token
            token = this.tokens.createSync(secret);
            return token;
        };
        // generate & set secret
        if (!secret) {
            secret = this.tokens.secretSync();
            this.setSecret(req, res, this.sessionKey, secret, this.cookie);
        }
        // verify the incoming token
        if (!this.ignoreMethod[req.method] && !this.tokens.verify(secret, this.value(req))) {
            return next(this.createError(403, "Invalid csrf token", {
                code: "EBADCSRFTOKEN"
            }));
        }
        next();
    }
    /**
     * Default value function, checking the `req.body`
     * and `req.query` for the CSRF token.
     *
     * @param {IncomingMessage} req
     * @return {String}
     * @api private
     */
    defaultValue(req) {
        return (req.body && req.body._csrf) ||
            (req.query && req.query._csrf) ||
            (req.headers["csrf-token"]) ||
            (req.headers["xsrf-token"]) ||
            (req.headers["x-csrf-token"]) ||
            (req.headers["x-xsrf-token"]);
    }
    /**
     * Get options for cookie.
     *
     * @param {boolean|object} [options]
     * @returns {object}
     * @api private
     */
    getCookieOptions(options) {
        const opts = {
            key: "_csrf",
            path: "/"
        };
        if (options && typeof options == "object") {
            return mixin(opts, options);
        }
        return opts;
    }
    /**
     * Get a lookup of ignored methods.
     *
     * @param {array} methods
     * @returns {object}
     * @api private
     */
    getIgnoredMethods(methods) {
        const obj = Object.create({});
        for (let i = 0; i < methods.length; i++) {
            const method = methods[i].toUpperCase();
            obj[method] = true;
        }
        return obj;
    }
    /**
     * Get the token secret from the request.
     *
     * @param {IncomingMessage} req
     * @param {String} sessionKey
     * @param {Object} [cookie]
     * @api private
     */
    getSecret(req, sessionKey, cookie) {
        // get the bag & key
        const bag = this.getSecretBag(req, sessionKey, cookie);
        const key = cookie ? cookie.key : "csrfSecret";
        if (!bag) {
            /* istanbul ignore next: should never actually run */
            throw new Error("misconfigured csrf");
        }
        // return secret from bag
        return bag[key];
    }
    /**
     * Get the token secret bag from the request.
     *
     * @param {IncomingMessage} req
     * @param {String} sessionKey
     * @param {Object} [cookie]
     * @api private
     */
    getSecretBag(req, sessionKey, cookie) {
        if (cookie) {
            // get secret from cookie
            const cookieKey = cookie.signed
                ? "signedCookies"
                : "cookies";
            return req[cookieKey];
        }
        else {
            // get secret from session
            return req[sessionKey];
        }
    }
    /**
     * Set a cookie on the HTTP response.
     *
     * @param {OutgoingMessage} res
     * @param {string} name
     * @param {string} val
     * @param {Object} [options]
     * @api private
     */
    setCookie(res, name, val, options) {
        const data = this.serialize(name, val, options);
        const prev = res.getHeader("set-cookie") || [];
        const header = Array.isArray(prev) ? prev.concat(data)
            : Array.isArray(data) ? [prev].concat(data)
                : [prev, data];
        res.setHeader("set-cookie", header);
    }
    /**
     * Set the token secret on the request.
     *
     * @param {IncomingMessage} req
     * @param {OutgoingMessage} res
     * @param {string} sessionKey
     * @param {string} val
     * @param {Object} [cookie]
     * @api private
     */
    setSecret(req, res, sessionKey, val, cookie) {
        if (cookie) {
            // set secret on cookie
            let value = val;
            if (cookie.signed) {
                const secret = req.secret;
                if (!secret) {
                    /* istanbul ignore next: should never actually run */
                    throw new Error("misconfigured csrf");
                }
                value = `s:${this.sign(val, secret)}`;
            }
            this.setCookie(res, cookie.key, value, cookie);
        }
        else if (req[sessionKey]) {
            // set secret on session
            req[sessionKey].csrfSecret = val;
        }
        else {
            /* istanbul ignore next: should never actually run */
            throw new Error("misconfigured csrf");
        }
    }
    /**
     * Verify the configuration against the request.
     * @private
     */
    verifyConfiguration(req, sessionKey, cookie) {
        if (!this.getSecretBag(req, sessionKey, cookie)) {
            return false;
        }
        if (cookie && cookie.signed && !req.secret) {
            return false;
        }
        return true;
    }
    /**
     * Sign the given `val` with `secret`.
     *
     * @param {String} val
     * @param {String} secret
     * @return {String}
     * @api private
     */
    sign(val, secret) {
        if ("string" != typeof val)
            throw new TypeError("Cookie value must be provided as a string.");
        if ("string" != typeof secret)
            throw new TypeError("Secret string must be provided.");
        return `${val}.` + crypto
            .createHmac("sha256", secret)
            .update(val)
            .digest("base64")
            .replace(/\=+$/, "");
    }
    /**
     * Create a new HTTP Error.
     *
     * @returns {Error}
     * @public
     */
    createError(status, msg, props) {
        const err = new Error(msg);
        err.status = 403;
        Error.captureStackTrace(err, this.createError);
        for (const key in props) {
            if (key !== "status" && key !== "statusCode") {
                err[key] = props[key];
            }
        }
        return err;
    }
    /**
     * Serialize data into a cookie header.
     *
     * Serialize the a name value pair into a cookie string suitable for
     * http headers. An optional options object specified cookie parameters.
     *
     * serialize('foo', 'bar', { httpOnly: true })
     *   => "foo=bar; httpOnly"
     *
     * @param {string} name
     * @param {string} val
     * @param {object} [options]
     * @return {string}
     * @public
     */
    serialize(name, val, options) {
        const opt = options || {};
        const enc = opt.encode || encodeURIComponent;
        const fieldContentRegExp = /^[\u0009\u0020-\u007e\u0080-\u00ff]+$/;
        if (!fieldContentRegExp.test(name)) {
            throw new TypeError("argument name is invalid");
        }
        const value = enc(val);
        if (value && !fieldContentRegExp.test(value)) {
            throw new TypeError("argument val is invalid");
        }
        let str = `${name}=${value}`;
        if (opt.maxAge) {
            const maxAge = opt.maxAge - 0;
            if (isNaN(maxAge))
                throw new Error("maxAge should be a Number");
            str += `; Max-Age=${Math.floor(maxAge)}`;
        }
        if (opt.domain) {
            if (!fieldContentRegExp.test(opt.domain)) {
                throw new TypeError("option domain is invalid");
            }
            str += `; Domain=${opt.domain}`;
        }
        if (opt.path) {
            if (!fieldContentRegExp.test(opt.path)) {
                throw new TypeError("option path is invalid");
            }
            str += `; Path=${opt.path}`;
        }
        if (opt.expires) {
            if (typeof opt.expires.toUTCString !== "function") {
                throw new TypeError("option expires is invalid");
            }
            str += `; Expires=${opt.expires.toUTCString()}`;
        }
        if (opt.httpOnly) {
            str += "; HttpOnly";
        }
        if (opt.secure) {
            str += "; Secure";
        }
        if (opt.sameSite) {
            const sameSite = typeof opt.sameSite == "string"
                ? opt.sameSite.toLowerCase() : opt.sameSite;
            switch (sameSite) {
                case true:
                    str += "; SameSite=Strict";
                    break;
                case "lax":
                    str += "; SameSite=Lax";
                    break;
                case "strict":
                    str += "; SameSite=Strict";
                    break;
                default:
                    throw new TypeError("option sameSite is invalid");
            }
        }
        return str;
    }
}
exports.Csrf = Csrf;
//# sourceMappingURL=csrf.js.map