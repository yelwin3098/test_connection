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
 * File Router
 */
const fs = __importStar(require("fs"));
const pathModule = __importStar(require("path"));
const formidable = __importStar(require("formidable"));
const mediaserver = __importStar(require("../lib/mediaserver"));
class FileRouter {
    constructor() { }
    static decodeUrl(url) {
        url = `${url}`;
        try {
            url = decodeURIComponent(url);
        }
        catch (err) { }
        url = url.replace(/%([0-9A-F]{2})/g, (x, x1) => {
            return String.fromCharCode(parseInt(x1, 16));
        });
        return url;
    }
    init(options) {
        if (!options) {
            options = {};
        }
        this.publicDir = this.findPublic(__dirname);
        return (req, res, next) => {
            const url = req.url;
            if (/^\/upload\/.*/i.test(url)) {
                const params = {};
                const keys = ["type"];
                const match = /^\/upload\/([^\/]+)/i.exec(url);
                if (match) {
                    for (const i in keys) {
                        let value = `${match[parseInt(i) + 1]}`;
                        if (typeof value === "string" || typeof value === "number") {
                            value = FileRouter.decodeUrl(value);
                            const queryMatch = /^([^\?]+)?(.*)$/.exec(value);
                            params[keys[i]] = queryMatch ? queryMatch[1] : value;
                        }
                    }
                }
                req.params = params;
                this.upload(req, res, next);
            }
            else if (/^\/delete/i.test(url)) {
                this.delete(req, res, next);
            }
            else if (/^\/stream/i.test(url)) {
                this.stream(req, res, next);
            }
            else {
                next();
            }
        };
    }
    findPublic(dir) {
        const t = pathModule.dirname(dir);
        const pubDir = pathModule.join(t, "public");
        if (!fs.existsSync(pubDir)) {
            const p = pathModule.join(t, "package.json");
            if (fs.existsSync(p)) {
                throw new Error("Public directory not found!");
            }
            return this.findPublic(t);
        }
        return pubDir;
    }
    upload(req, res, next) {
        const type = req.params.type;
        const uploadDir = pathModule.join(this.publicDir, "upload", type);
        console.log(`file: ${uploadDir}`);
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir);
        }
        const form = new formidable.IncomingForm();
        const uploads = [];
        form.maxFieldsSize = FileRouter.MAX_UPLOAD_SIZE;
        form.multiples = true;
        form.uploadDir = uploadDir;
        form.on("file", function (field, file) {
            let fileName = file.name.replace(/\s/g, "-");
            const origFileName = fileName;
            let count = 0;
            while (fs.existsSync(pathModule.join(uploadDir, fileName))) {
                count++;
                const match = origFileName.match(/^(.*)\.([^\.]+)$/);
                if (match) {
                    fileName = `${match[1]}-(${count}).${match[2]}`;
                }
                else {
                    fileName = `${origFileName}-(${count})`;
                }
            }
            fs.rename(file.path, pathModule.join(uploadDir, fileName), (err) => { });
            const filePath = `./upload/${type}/${fileName}`;
            console.log("UPLOAD " + filePath);
            uploads.push(filePath);
        });
        form.on("error", function (err) {
            console.log(`An error has occured: \n${err}`);
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ "message": "error", "error": err.message }));
        });
        form.on("end", function () {
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ "message": "success", "files": uploads }));
        });
        form.parse(req);
    }
    delete(req, res, next) {
        const file = req.body.file;
        if (typeof file === "string" && file != "") {
            const filePath = pathModule.join(this.publicDir, file);
            console.log(`DELETE ${file}`);
            if (fs.existsSync(filePath)) {
                fs.unlink(filePath, (err) => {
                    let msg = { "message": "success", "file": file };
                    if (err) {
                        msg = { "message": "error", "file": file, "error": err.message };
                    }
                    res.writeHead(200, { "content-type": "application/json" });
                    res.end(JSON.stringify(msg));
                });
            }
            else {
                res.writeHead(200, { "content-type": "application/json" });
                res.end(JSON.stringify({ "message": "error", "file": file, "error": "File not found!" }));
            }
        }
        else {
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ "message": "error", "file": file, "error": "File not found!" }));
        }
    }
    stream(req, res, next) {
        const reqData = (req.method == "POST") ? req.body : req.query;
        const file = reqData.file;
        if (typeof file === "string" && file != "") {
            const filePath = pathModule.join(this.publicDir, file);
            console.log(`STREAM ${file}`);
            if (fs.existsSync(filePath)) {
                const ms = new mediaserver.MediaServer();
                ms.pipe(req, res, filePath);
            }
            else {
                res.writeHead(200, { "content-type": "application/json" });
                res.end(JSON.stringify({ "message": "error", "file": file, "error": "File not found!" }));
            }
        }
        else {
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ "message": "error", "file": file, "error": "File not found!" }));
        }
    }
}
FileRouter.MAX_UPLOAD_SIZE = 15 * 1024 * 1024; // 15MB
exports.default = new FileRouter();
//# sourceMappingURL=file.js.map