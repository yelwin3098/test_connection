"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const querystring = __importStar(require("querystring"));
const zlib = __importStar(require("zlib"));
function parse(req) {
    const stream = contentStream(req);
    let parser;
    let bytesExpected = 0;
    if (req.headers["content-length"]) {
        bytesExpected = parseInt(req.headers["content-length"], 10);
    }
    else if (typeof req.headers["transfer-encoding"] === "undefined") {
        bytesExpected = 0;
    }
    if (req.headers["content-type"]) {
        if (req.headers["content-type"].match(/octet-stream/i)) {
            parser = new OctetParser();
        }
        else if (req.headers["content-type"].match(/urlencoded/i)) {
            parser = new QuerystringParser();
        }
        else if (req.headers["content-type"].match(/json/i)) {
            parser = new JSONParser(bytesExpected);
        }
    }
    return new Promise((resolve, reject) => {
        if (!parser) {
            reject(new Error("Body parser not supported"));
            return;
        }
        stream.on("error", (err) => {
            reject(err);
        })
            .on("aborted", () => {
            reject(new Error("Request aborted"));
        })
            .on("data", (buffer) => {
            parser.write(buffer);
        }).on("end", () => {
            parser.end((err, result) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(result);
                }
            });
        });
    });
}
exports.parse = parse;
function contentStream(req) {
    const encoding = (req.headers["content-encoding"] || "identity").toLowerCase();
    const length = req.headers["content-length"];
    let stream;
    switch (encoding) {
        case "deflate":
            stream = zlib.createInflate();
            req.pipe(stream);
            break;
        case "gzip":
            stream = zlib.createGunzip();
            req.pipe(stream);
            break;
        case "identity":
            stream = req;
            stream.length = length;
            break;
        default:
            throw new Error(`Unsupported content encoding "${encoding}"`);
    }
    return stream;
}
/**
 * Base Parser Class
 */
class Parser {
    constructor() { }
    write(buffer) {
        return 0;
    }
    end(cb) { }
}
/**
 * OctetParser Class
 */
class OctetParser extends Parser {
    constructor() {
        super();
    }
    write(buffer) {
        if (this.buffer.length >= this.bytesWritten + buffer.length) {
            buffer.copy(this.buffer, this.bytesWritten);
        }
        else {
            this.buffer = Buffer.concat([this.buffer, buffer]);
        }
        this.bytesWritten += buffer.length;
        return buffer.length;
    }
    end(cb) {
        this.data = this.buffer.toString("utf8");
        cb(undefined, this.data);
    }
}
/**
 * QuerystringParser Class
 */
class QuerystringParser extends Parser {
    constructor(maxKeys = 1000) {
        super();
        this.maxKeys = maxKeys;
        this.buffer = "";
    }
    write(buffer) {
        this.buffer += buffer.toString("ascii");
        return buffer.length;
    }
    end(cb) {
        const fields = querystring.parse(this.buffer.replace(/\+/g, "%2B"), "&", "=", {
            maxKeys: this.maxKeys
        });
        for (const field in fields) {
            this.data[field] = fields[field];
        }
        this.buffer = "";
        cb(undefined, this.data);
    }
}
/**
 * JSONParser Class
 */
class JSONParser extends Parser {
    constructor(length = 0) {
        super();
        if (length) {
            this.buffer = new Buffer(length);
        }
        else {
            this.buffer = new Buffer("");
        }
        this.bytesWritten = 0;
    }
    write(buffer) {
        if (this.buffer.length >= this.bytesWritten + buffer.length) {
            buffer.copy(this.buffer, this.bytesWritten);
        }
        else {
            this.buffer = Buffer.concat([this.buffer, buffer]);
        }
        this.bytesWritten += buffer.length;
        return buffer.length;
    }
    end(cb) {
        let err;
        try {
            const fields = JSON.parse(this.buffer.toString("utf8"));
            for (const field in fields) {
                this.data[field] = fields[field];
            }
        }
        catch (e) {
            err = e;
        }
        this.buffer = undefined;
        cb(err, this.data);
    }
}
//# sourceMappingURL=bodyparser.js.map