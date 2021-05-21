"use strict";
/**
 * REST API helper functions
 */
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const splitter_1 = require("./splitter");
class Utils {
    constructor() { }
    static mixin(dest, src, redefine = true) {
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
    // https://github.com/justmoon/node-extend
    static extend(...args) {
        let target = args[0];
        const length = args.length;
        let deep = false;
        let i = 1;
        const hasOwn = Object.prototype.hasOwnProperty;
        const toStr = Object.prototype.toString;
        const isArray = (arr) => {
            if (typeof Array.isArray === "function") {
                return Array.isArray(arr);
            }
            return toStr.call(arr) === "[object Array]";
        };
        const isPlainObject = (obj) => {
            if (!obj || toStr.call(obj) !== "[object Object]") {
                return false;
            }
            const hasOwnConstructor = hasOwn.call(obj, "constructor");
            const hasIsPrototypeOf = obj.constructor && obj.constructor.prototype && hasOwn.call(obj.constructor.prototype, "isPrototypeOf");
            if (obj.constructor && !hasOwnConstructor && !hasIsPrototypeOf) {
                return false;
            }
            let key;
            for (key in obj) { /**/ }
            return typeof key === "undefined" || hasOwn.call(obj, key);
        };
        if (typeof target === "boolean") {
            deep = target;
            target = args[1] || {};
            i = 2;
        }
        if (!target || (typeof target !== "object" && typeof target !== "function")) {
            target = {};
        }
        for (; i < length; i++) {
            const options = args[i];
            if (options && typeof options === "object") {
                for (const name in options) {
                    const src = target[name];
                    const copy = options[name];
                    if (target !== copy) {
                        let copyIsArray;
                        if (deep && copy && (isPlainObject(copy) || (copyIsArray = isArray(copy)))) {
                            let clone;
                            if (copyIsArray) {
                                copyIsArray = false;
                                clone = src && isArray(src) ? src : [];
                            }
                            else {
                                clone = src && isPlainObject(src) ? src : {};
                            }
                            target[name] = Utils.extend(deep, clone, copy);
                        }
                        else if (typeof copy !== "undefined") {
                            target[name] = copy;
                        }
                    }
                }
            }
        }
        return target;
    }
    static decodeUrl(url) {
        const tryDecode = (u) => {
            try {
                u = decodeURIComponent(u);
            }
            catch (err) {
                u = u.replace(/%([0-9A-F]{2})/g, (x, x1) => {
                    return String.fromCharCode(parseInt(x1, 16));
                });
            }
            return u;
        };
        if (Array.isArray(url)) {
            for (const i in url) {
                url[i] = tryDecode(`${url[i]}`);
            }
            return url;
        }
        else {
            return tryDecode(`${url}`);
        }
    }
    static promisify(fn, argsNum) {
        return (thisArgs, ...args) => {
            if (argsNum && args.length > argsNum) {
                args = args.slice(0, argsNum);
            }
            const promise = new Promise((resolve, reject) => {
                if (!args) {
                    args = [];
                }
                args.push((err, result) => {
                    if (err) {
                        reject(err);
                    }
                    else {
                        resolve(result);
                    }
                });
                try {
                    fn.call(thisArgs, ...args);
                }
                catch (err) {
                    reject(err);
                }
            });
            return promise;
        };
    }
    static isEmpty(obj) {
        if (typeof obj === "undefined")
            return true;
        if (!obj)
            return true;
        if (typeof obj === "number" && isNaN(obj))
            return true;
        if (typeof obj === "string" && obj == "")
            return true;
        if (typeof obj === "object") {
            if (Array.isArray(obj) && obj.length == 0) {
                return true;
            }
            else {
                const temp = JSON.stringify(obj).replace(/[\{\}\[\]\s]/g, "");
                return (temp === "");
            }
        }
        return false;
    }
    static getAllUserFuncs(obj) {
        const buildInFuncs = [
            "constructor",
            "__defineGetter__",
            "__defineSetter__",
            "hasOwnProperty",
            "__lookupGetter__",
            "__lookupSetter__",
            "isPrototypeOf",
            "propertyIsEnumerable",
            "toString",
            "valueOf",
            "__proto__",
            "toLocaleString"
        ];
        let props = [];
        if (!obj)
            return props;
        let objProto = obj;
        do {
            props = props.concat(Object.getOwnPropertyNames(objProto));
        } while (objProto = Object.getPrototypeOf(objProto));
        return props.filter((e, i, arr) => {
            if (!!~buildInFuncs.indexOf(e))
                return false;
            return (e != arr[i + 1] && typeof obj[e] == "function");
        });
    }
    static split(str, delimiter = ",") {
        const splitOpts = {};
        if (delimiter) {
            splitOpts.delimiter = delimiter;
        }
        const split = new splitter_1.Splitter(splitOpts);
        return split.parse(str);
    }
    static toArray(val, splitter) {
        const splitOpts = {};
        if (splitter) {
            splitOpts.delimiter = splitter;
        }
        const split = new splitter_1.Splitter(splitOpts);
        let values = [];
        if (typeof val === "string" && val != "") {
            if (!Utils.isEmpty(splitter)) {
                values = split.parse(val);
            }
            else {
                values.push(val);
            }
        }
        else if (typeof val === "object") {
            for (const v of val) {
                if (typeof v === "string" && v != "") {
                    if (!Utils.isEmpty(splitter)) {
                        const t1 = split.parse(v);
                        for (const j of t1) {
                            values.push(j);
                        }
                    }
                    else {
                        values.push(v);
                    }
                }
            }
        }
        else {
            values.push(`${val}`);
        }
        return values;
    }
    static tryParseInt(val, def = 0) {
        const v = `${val}`.replace(/[^0-9]/g, "");
        try {
            return parseInt(v);
        }
        catch (_a) {
        }
        return def;
    }
    static tryParseBoolean(val) {
        const v = `${val}`;
        const match = /^(true|false|[\d]+)$/i.exec(v);
        if (!match) {
            const temp = JSON.stringify(val).replace(/[\{\}\[\]\s\"\']/g, "");
            return (temp.length > 0);
        }
        else if (/[0-9]+/.test(`${match[1]}`)) {
            const v1 = `${match[1]}`;
            try {
                return (parseInt(v1) > 0);
            }
            catch (_a) {
            }
            return false;
        }
        else {
            return (match[1].toLowerCase() != "false");
        }
    }
    /**
     * Find the project root.
     * If user set process.env.APP_ROOT_PATH, use that. If not found, traverse backwards from current
     * directory until a directory is found containing both node_modules and package.json.
     */
    static getRootPath() {
        if (process.env.APP_ROOT_PATH) {
            return process.env.APP_ROOT_PATH;
        }
        const getRoot = (dir) => {
            try {
                const isPkgJson = fs.accessSync(path.join(dir, "./package.json"));
                const is_node_modules = fs.accessSync(path.join(dir, "./node_modules"));
            }
            catch (e) {
                if (dir === "/") {
                    throw new Error("Project root (package.json & node_modules location)");
                }
                return getRoot(path.join(dir, ".."));
            }
            return dir;
        };
        return getRoot(__dirname);
    }
}
exports.Utils = Utils;
//# sourceMappingURL=utils.js.map