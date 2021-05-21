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
 * cookies
 * Copyright(c) 2014 Jed Schmidt, http://jed.is/
 * Copyright(c) 2015-2016 Douglas Christopher Wilson
 * MIT Licensed
 *
 * https://github.com/pillarjs/cookies
 */
const http = __importStar(require("http"));
const crypto = __importStar(require("crypto"));
const cache = {};
// http://codahale.com/a-lesson-in-timing-attacks/
const constantTimeCompare = function (val1, val2) {
    if (!val1 && val2) {
        return false;
    }
    else if (!val2 && val1) {
        return false;
    }
    else if (!val1 && !val2) {
        return true;
    }
    if (val1.length !== val2.length) {
        return false;
    }
    let result = 0;
    for (let i = 0; i < val1.length; i++) {
        result |= val1.charCodeAt(i) ^ val2.charCodeAt(i); // Don't short circuit
    }
    return result === 0;
};
class Keygrip {
    constructor(keys, algorithm, encoding) {
        this.algorithm = algorithm || "sha1";
        this.encoding = encoding || "base64";
        if (!keys || !(0 in keys)) {
            throw new Error("Keys must be provided.");
        }
        this.keys = keys;
    }
    sign(data, key) {
        const signKeys = { "/": "_", "+": "-", "=": "" };
        key = key || this.keys[0];
        return crypto.createHmac(this.algorithm, key).update(data).digest(this.encoding)
            .replace(/\/|\+|=/g, function (x) {
            return signKeys[x];
        });
    }
    verify(data, digest) {
        return this.index(data, digest) > -1;
    }
    index(data, digest) {
        for (let i = 0, l = this.keys.length; i < l; i++) {
            if (constantTimeCompare(digest, this.sign(data, this.keys[i])))
                return i;
        }
        return -1;
    }
}
/**
 * RegExp to match field-content in RFC 7230 sec 3.2
 *
 * field-content = field-vchar [ 1*( SP / HTAB ) field-vchar ]
 * field-vchar   = VCHAR / obs-text
 * obs-text      = %x80-FF
 */
const fieldContentRegExp = /^[\u0009\u0020-\u007e\u0080-\u00ff]+$/;
/**
 * RegExp to match Same-Site cookie attribute value.
 */
const sameSiteRegExp = /^(?:lax|strict)$/i;
class Cookies {
    constructor(request, response, options) {
        this.secure = undefined;
        this.request = request;
        this.response = response;
        if (options) {
            this.keys = Array.isArray(options.keys) ? new Keygrip(options.keys) : options.keys;
            this.secure = options.secure;
        }
    }
    get(name, opts) {
        const sigName = `${name}.sig`;
        const signed = opts && opts.signed !== undefined ? opts.signed : !!this.keys;
        const header = this.request.headers["cookie"];
        if (!header)
            return;
        const match = header.match(getPattern(name));
        if (!match)
            return;
        const value = match[1];
        if (!opts || !signed)
            return value;
        const remote = this.get(sigName);
        if (!remote)
            return;
        const data = name + "=" + value;
        if (!this.keys)
            throw new Error(".keys required for signed cookies");
        const index = this.keys.index(data, remote);
        if (index < 0) {
            this.set(sigName, undefined, { path: "/", signed: false });
        }
        else {
            index && this.set(sigName, this.keys.sign(data), { signed: false });
            return value;
        }
    }
    set(name, value, opts) {
        const res = this.response;
        const req = this.request;
        const secure = this.secure !== undefined ? !!this.secure : req.protocol === "https" || req.connection.encrypted;
        const cookie = new Cookie(name, value, opts);
        const signed = opts && opts.signed !== undefined ? opts.signed : !!this.keys;
        let headers = [];
        const resHeaders = res.getHeader("Set-Cookie");
        if (typeof resHeaders == "string") {
            headers = [resHeaders];
        }
        else {
            headers = resHeaders;
        }
        if (!secure && opts && opts.secure) {
            throw new Error("Cannot send secure cookie over unencrypted connection");
        }
        cookie.secure = secure;
        if (opts && "secure" in opts)
            cookie.secure = opts.secure;
        headers = pushCookie(headers, cookie);
        if (opts && signed) {
            if (!this.keys)
                throw new Error(".keys required for signed cookies");
            cookie.value = this.keys.sign(cookie.toString());
            cookie.name += ".sig";
            headers = pushCookie(headers, cookie);
        }
        const setHeader = res.set ? http.OutgoingMessage.prototype.setHeader : res.setHeader;
        setHeader.call(res, "Set-Cookie", headers);
        return this;
    }
}
exports.Cookies = Cookies;
class Cookie {
    constructor(name, value, attrs) {
        this.expires = undefined;
        this.domain = undefined;
        this.httpOnly = true;
        this.sameSite = false;
        this.secure = false;
        this.overwrite = false;
        if (!fieldContentRegExp.test(name)) {
            throw new TypeError("argument name is invalid");
        }
        if (value && !fieldContentRegExp.test(value)) {
            throw new TypeError("argument value is invalid");
        }
        value || (this.expires = new Date(0));
        this.name = name;
        this.value = value || "";
        for (const name in attrs) {
            this[name] = attrs[name];
        }
        if (this.path && !fieldContentRegExp.test(this.path)) {
            throw new TypeError("option path is invalid");
        }
        if (this.domain && !fieldContentRegExp.test(this.domain)) {
            throw new TypeError("option domain is invalid");
        }
        if (this.sameSite && this.sameSite !== true && !sameSiteRegExp.test(this.sameSite)) {
            throw new TypeError("option sameSite is invalid");
        }
    }
    toString() {
        return `${this.name} = ${this.value}`;
    }
    toHeader() {
        let header = this.toString();
        if (this.maxAge)
            this.expires = new Date(Date.now() + this.maxAge);
        if (this.path)
            header += `; path=${this.path}`;
        if (this.expires)
            header += `; expires=${this.expires.toUTCString()}`;
        if (this.domain)
            header += `; domain=${this.domain}`;
        if (this.sameSite)
            header += "; samesite=" + (this.sameSite === true ? "strict" : `${this.sameSite}`.toLowerCase());
        if (this.secure)
            header += "; secure";
        if (this.httpOnly)
            header += "; httponly";
        return header;
    }
}
function getPattern(name) {
    if (cache[name])
        return cache[name];
    return cache[name] = new RegExp("(?:^|;) *" +
        name.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&") +
        "=([^;]*)");
}
function pushCookie(cookies, cookie) {
    if (cookie.overwrite) {
        cookies = cookies.filter((c) => {
            return c.indexOf(`${cookie.name}=`) !== 0;
        });
    }
    cookies.push(cookie.toHeader());
    return cookies;
}
Cookies.Cookie = Cookie;
//# sourceMappingURL=cookies.js.map