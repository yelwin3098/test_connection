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
 * Url Handler
 */
const _url = __importStar(require("url"));
function string2RegExp(str) {
    const specials = ["-", "[", "]", "/", "{", "}", "(", ")", "*", "+", "?", ".", "\\", "^", "$", "|"];
    const matchOperatorsRe = RegExp(`[${specials.join("\\")}]`, "g");
    return str.replace(matchOperatorsRe, "\\$&");
}
class UrlHandler {
    constructor() {
        this.stack = new Array();
    }
    use(path, method, handlers) {
        method = method.toUpperCase();
        let re;
        if (typeof path == "string") {
            re = new RegExp(`^${string2RegExp(path)}(.*)$`, "i");
        }
        else if (path instanceof RegExp) {
            re = path;
        }
        if (re) {
            for (const h in handlers) {
                const handler = handlers[h];
                this.stack.push({
                    regEx: re,
                    method: method,
                    handler: handler
                });
            }
        }
    }
    all(path, ...handlers) {
        this.use(path, "all", handlers);
    }
    get(path, ...handlers) {
        this.use(path, "get", handlers);
    }
    post(path, ...handlers) {
        this.use(path, "post", handlers);
    }
    put(path, ...handlers) {
        this.use(path, "put", handlers);
    }
    patch(path, ...handlers) {
        this.use(path, "patch", handlers);
    }
    delete(path, ...handlers) {
        this.use(path, "delete", handlers);
    }
    options(path, ...handlers) {
        this.use(path, "options", handlers);
    }
    head(path, ...handlers) {
        this.use(path, "head", handlers);
    }
    handle(req, res, callback) {
        const parsed = _url.parse(req.url, true);
        const method = (req.method || "GET").toLowerCase();
        const pathname = (parsed.pathname || "/").toLowerCase();
        let index = 0;
        const next = (err = undefined) => {
            const layer = this.stack[index++];
            if (!layer) {
                if (typeof err != "undefined") {
                    // console.log("UrlHandler.handle", err);
                    err = err || new Error("Not found");
                    err.status = err.status || 404;
                }
                setImmediate(callback, err, req, res);
                return;
            }
            if (!layer.regEx.test(pathname)) {
                return next(err);
            }
            if (!!~["all", method].indexOf(layer.method)) {
                return next(err);
            }
            const handler = layer.handler;
            try {
                if (err && handler.length == 4) {
                    handler(err, req, res, next);
                }
                else if (!err && handler.length < 4) {
                    handler(req, res, next);
                }
            }
            catch (thrown) {
                next(thrown);
            }
        };
        next();
    }
}
exports.UrlHandler = UrlHandler;
exports.default = new UrlHandler();
//# sourceMappingURL=urlhandler.js.map