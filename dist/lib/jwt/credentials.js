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
 * Credentials class
 */
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const crypto = __importStar(require("crypto"));
const uuid = __importStar(require("uuid"));
const voucher_codes_1 = __importDefault(require("./voucher-codes"));
class Credentials {
    constructor(rootPath, fileOrObj) {
        if (typeof fileOrObj == "string") {
            this.filePath = path_1.default.join(rootPath, `${fileOrObj}`);
            this.loadCredentials();
            this.watchFile();
        }
        else {
            this.credentials = fileOrObj;
        }
    }
    loadCredentials() {
        const json = fs_1.default.readFileSync(this.filePath, "utf8");
        this.credentials = JSON.parse(json);
    }
    watchFile() {
        const self = this;
        fs_1.default.watchFile(this.filePath, (curr, prev) => {
            if (curr.mtime != prev.mtime) {
                setTimeout(() => {
                    self.loadCredentials();
                }, 1000);
            }
        });
    }
    createHmac(secret, str) {
        return crypto.createHmac("sha256", secret)
            .update(str)
            .digest("base64")
            .replace(/\+/g, "-")
            .replace(/\//g, "_")
            .replace(/=/g, "");
    }
    generateCode(length, count = 1) {
        const codes = voucher_codes_1.default.generate({
            length: length,
            count: count,
            charset: voucher_codes_1.default.charset("alphanumeric")
        });
        if (count == 1) {
            return codes[0];
        }
        return codes;
    }
    generate(consumerKey, save = true) {
        const secret = this.generateCode(16);
        const keyId = this.createHmac(secret, consumerKey);
        const credential = {
            id: uuid.v4(),
            consumerKey: consumerKey,
            keyId: keyId,
            keySecret: secret,
            isActive: true
        };
        if (save) {
            this.credentials.push(credential);
            if (fs_1.default.existsSync(`${this.filePath}`)) {
                const data = JSON.stringify(this.credentials);
                fs_1.default.writeFile(this.filePath, data, "utf8", (err) => {
                    if (typeof err == "object") {
                        // console.log("generate credentials (cretentaila.ts) >>> ", err);
                    }
                });
            }
        }
        return credential;
    }
    findCredential(filter) {
        // console.log("filter parameter in findCredentail (credentials.ts) >>> ", filter);
        let result;
        if (filter.id) {
            result = this.credentials.filter((value) => {
                return value.id == filter.id;
            });
        }
        else if (filter.consumerKey && filter.secret) {
            const keyId = this.createHmac(filter.secret, filter.consumerKey);
            // console.log("keyId in findCredential (credential.ts) >>> ", keyId);
            result = this.credentials.filter((value) => {
                return value.consumerKey == filter.consumerKey && value.keyId == keyId && value.keySecret == filter.secret;
            });
        }
        // console.log("result in findCredential (credential.ts) >>> ", result);
        // console.log("result[0] in findCredential (credential.ts) >>> ", result[0]);
        if (result && result.length) {
            return result[0];
        }
        return undefined;
    }
}
exports.Credentials = Credentials;
//# sourceMappingURL=credentials.js.map