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
 * mediaserver module for node.js (https://github.com/obastemur/mediaserver/)
 *
 * MIT license, Oguz Bastemur 2014-2016
 */
const fs = __importStar(require("fs"));
const pathModule = __importStar(require("path"));
const exts = {
    // plain formats
    ".html": "text/html",
    ".css": "text/css",
    ".js": "text/javascript",
    ".txt": "text/plain",
    // custom
    ".pdf": "application/octet-stream",
    ".woff": "application/octet-stream",
    ".ttf": "application/octet-stream",
    ".svg": "application/octet-stream",
    ".otf": "application/octet-stream",
    ".eot": "application/octet-stream",
    // compressed formats
    ".zip": "application/octet-stream",
    ".rar": "application/octet-stream",
    ".7z": "application/octet-stream",
    ".gz": "application/octet-stream",
    ".tar": "application/octet-stream",
    // media formats
    ".afl": "video/animaflex",
    ".ai": "application/postscript",
    ".aif": "audio/aiff",
    ".aifc": "audio/aiff",
    ".aiff": "audio/aiff",
    ".aip": "text/x-audiosoft-intra",
    ".art": "image/x-jg",
    ".asf": "video/x-ms-asf",
    ".asm": "text/x-asm",
    ".asx": "video/x-ms-asf",
    ".au": "audio/basic",
    ".avi": "video/avi",
    ".avs": "video/avs-video",
    ".bm": "image/bmp",
    ".bmp": "image/bmp",
    ".dif": "video/x-dv",
    ".dl": "video/dl",
    ".dv": "video/x-dv",
    ".dwg": "image/vnd.dwg",
    ".dxf": "image/vnd.dwg",
    ".fli": "video/fli",
    ".flo": "image/florian",
    ".fmf": "video/x-atomic3d-feature",
    ".fpx": "image/vnd.fpx",
    ".funk": "audio/make",
    ".g3": "image/g3fax",
    ".gif": "image/gif",
    ".gl": "video/gl",
    ".gsd": "audio/x-gsm",
    ".gsm": "audio/x-gsm",
    ".isu": "video/x-isvideo",
    ".it": "audio/it",
    ".jam": "audio/x-jam",
    ".jfif": "image/jpeg",
    ".jfif-tbnl": "image/jpeg",
    ".jpe": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".jpg": "image/jpeg",
    ".jps": "image/x-jps",
    ".jut": "image/jutvision",
    ".kar": "audio/midi",
    ".la": "audio/nspaudio",
    ".lam": "audio/x-liveaudio",
    ".lma": "audio/x-nspaudio",
    ".m1v": "video/mpeg",
    ".m2a": "audio/mpeg",
    ".m2v": "video/mpeg",
    ".m3u": "audio/x-mpequrl",
    ".mcf": "image/vasa",
    ".mid": "audio/midi",
    ".midi": "audio/midi",
    ".mjf": "audio/x-vnd.audioexplosion.mjuicemediafile",
    ".mjpg": "video/x-motion-jpeg",
    ".mod": "audio/mod",
    ".moov": "video/quicktime",
    ".mov": "video/quicktime",
    ".movie": "video/x-sgi-movie",
    ".mp2": "video/mpeg",
    ".mp3": "audio/mpeg",
    ".mpa": "audio/mpeg",
    ".mpe": "video/mpeg",
    ".mpeg": "video/mpeg",
    ".mp4": "video/mpeg",
    ".mpg": "video/mpeg",
    ".mpga": "audio/mpeg",
    ".mv": "video/x-sgi-movie",
    ".my": "audio/make",
    ".nap": "image/naplps",
    ".naplps": "image/naplps",
    ".nif": "image/x-niff",
    ".niff": "image/x-niff",
    ".ogg": "audio/ogg",
    ".pbm": "image/x-portable-bitmap",
    ".pct": "image/x-pict",
    ".pcx": "image/x-pcx",
    ".pfunk": "audio/make",
    ".pgm": "image/x-portable-greymap",
    ".pic": "image/pict",
    ".pict": "image/pict",
    ".pm": "image/x-xpixmap",
    ".png": "image/png",
    ".pnm": "image/x-portable-anymap",
    ".ppm": "image/x-portable-pixmap",
    ".qcp": "audio/vnd.qcelp",
    ".qif": "image/x-quicktime",
    ".qt": "video/quicktime",
    ".qtc": "video/x-qtc",
    ".qti": "image/x-quicktime",
    ".qtif": "image/x-quicktime",
    ".ra": "audio/x-realaudio",
    ".ram": "audio/x-pn-realaudio",
    ".ras": "image/cmu-raster",
    ".rast": "image/cmu-raster",
    ".rf": "image/vnd.rn-realflash",
    ".rgb": "image/x-rgb",
    ".rm": "audio/x-pn-realaudio",
    ".rmi": "audio/mid",
    ".rmm": "audio/x-pn-realaudio",
    ".rmp": "audio/x-pn-realaudio",
    ".rp": "image/vnd.rn-realpix",
    ".rpm": "audio/x-pn-realaudio-plugin",
    ".rv": "video/vnd.rn-realvideo",
    ".s3m": "audio/s3m",
    ".scm": "video/x-scm",
    ".sid": "audio/x-psid",
    ".snd": "audio/x-adpcm",
    ".svf": "image/vnd.dwg",
    ".tif": "image/tiff",
    ".tiff": "image/tiff",
    ".tsi": "audio/tsp-audio",
    ".tsp": "audio/tsplayer",
    ".vdo": "video/vdo",
    ".viv": "video/vivo",
    ".vivo": "video/vivo",
    ".voc": "audio/voc",
    ".vos": "video/vosaic",
    ".vox": "audio/voxware",
    ".vqe": "audio/x-twinvq-plugin",
    ".vqf": "audio/x-twinvq",
    ".vql": "audio/x-twinvq-plugin",
    ".wav": "audio/wav",
    ".wbmp": "image/vnd.wap.wbmp",
    ".xbm": "image/xbm",
    ".xdr": "video/x-amt-demorun",
    ".xif": "image/vnd.xiff",
    ".xm": "audio/xm",
    ".xmz": "xgl/movie",
    ".xpm": "image/xpm",
    ".x-png": "image/png",
    ".xsr": "video/x-amt-showrun"
};
class MediaServer {
    constructor() {
        this.pipe_extensions = {};
        this.pipe_extension_id = 0;
        this.noCache = false;
        this.mediaTypes = exts;
    }
    static stattag(stat) {
        const mtime = stat.mtime.getTime().toString(16);
        const size = stat.size.toString(16);
        return `"${size}-${mtime}"`;
    }
    static fileInfo(path) {
        if (path) {
            if (!exports.noCache && MediaServer.shared[path]) {
                return MediaServer.shared[path];
            }
            else {
                if (!fs.existsSync(path)) {
                    return undefined;
                }
                const stat = fs.statSync(path);
                const info = { "size": stat.size, "mtime": stat.mtime, "etag": MediaServer.stattag(stat) };
                if (!exports.noCache) {
                    MediaServer.shared[path] = info;
                }
                return info;
            }
        }
        return 0;
    }
    static getRange(req, total) {
        const range = [0, total, 0];
        const rinfo = req.headers ? req.headers.range : "";
        if (rinfo) {
            const rloc = rinfo.indexOf("bytes=");
            if (rloc >= 0) {
                const ranges = rinfo.substr(rloc + 6).split("-");
                try {
                    range[0] = parseInt(ranges[0]);
                    if (ranges[1] && ranges[1].length) {
                        range[1] = parseInt(ranges[1]);
                        range[1] = range[1] < 16 ? 16 : range[1];
                    }
                }
                catch (e) { }
            }
            if (range[1] == total)
                range[1]--;
            range[2] = total;
        }
        return range;
    }
    static isString(str) {
        if (!str)
            return false;
        return (typeof str == "string" || str instanceof String);
    }
    pipe(req, res, path, type, opt_cb = {}) {
        if (!MediaServer.isString(path)) {
            throw new TypeError("path must be a string value");
        }
        const info = MediaServer.fileInfo(path);
        if (!info) {
            res.end(path + " not found");
            return false;
        }
        const range = MediaServer.getRange(req, info.size);
        let ext = pathModule.extname(path);
        if (!type && ext && ext.length) {
            type = exts[ext];
        }
        if (type && type.length && type[0] == ".") {
            ext = type;
            type = exts[type];
        }
        if (!type || !type.length) {
            res.write("Media format not found for " + pathModule.basename(path));
        }
        else {
            const file = fs.createReadStream(path, { start: range[0], end: range[1] });
            if (!ext.length || !this.pipe_extensions[ext]) {
                const header = {
                    "Content-Length": range[1],
                    "Content-Type": type,
                    "ETag": info.etag,
                    "Access-Control-Allow-Origin": req.headers.origin || "*",
                    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
                    "Access-Control-Allow-Headers": "POST, GET, OPTIONS"
                };
                if (range[2]) {
                    header["Accept-Ranges"] = "bytes";
                    header["Content-Range"] = `bytes ${range[0]}-${range[1]}/${info.size}`;
                    header["Content-Length"] = range[2];
                    res.writeHead(206, header);
                }
                else {
                    res.writeHead(200, header);
                }
                file.pipe(res);
                file.on("close", function () {
                    res.end(0);
                    if (opt_cb && typeof opt_cb == "function") {
                        opt_cb(path);
                    }
                });
            }
            else {
                const _exts = this.pipe_extensions[ext];
                res.writeHead(200, {
                    "Content-Type": type,
                    "Access-Control-Allow-Origin": req.headers.origin || "*",
                    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
                    "Access-Control-Allow-Headers": "POST, GET, OPTIONS"
                });
                for (const o in _exts) {
                    _exts[o](file, req, res, function () {
                        if (!res.__ended) {
                            res.__ended = true;
                            res.end(0);
                        }
                    });
                }
            }
            return true;
        }
        return false;
    }
    on(ext, m) {
        if (!this.pipe_extensions[ext]) {
            this.pipe_extensions[ext] = [];
        }
        m.pipe_extension_id = this.pipe_extension_id++;
        m.pipe_extension = ext;
        this.pipe_extensions[ext].push(m);
    }
    removeEvent(method) {
        if (!method || method.pipe_extension || !method.pipe_extension_id) {
            return;
        }
        if (this.pipe_extensions[method.pipe_extension]) {
            const exts = this.pipe_extensions[method.pipe_extension];
            for (let i = 0, ln = exts.length; i < ln; i++) {
                if (exts[i].pipe_extension_id == method.pipe_extension_id) {
                    this.pipe_extensions[method.pipe_extension] = exts.splice(i, 1);
                }
            }
        }
    }
}
MediaServer.shared = {};
exports.MediaServer = MediaServer;
exports.default = new MediaServer();
//# sourceMappingURL=mediaserver.js.map