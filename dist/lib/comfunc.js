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
 * Common Functions
 */
const urlModule = __importStar(require("url"));
const errorhandler_1 = require("./errorhandler");
const utils_1 = require("./utils");
function fillDefaultFields(data) {
    if (data.createddate && /^([\d\/-]+)T(.*)$/i.test(data.createddate)) {
        data.createddate = data.createddate.replace(/^([\d\/-]+)T(.*)$/i, "$1");
    }
    data.updateddate = utils_1.Utils.toSqlDate(new Date());
    if (utils_1.Utils.isEmpty(data.createddate)) {
        data.createddate = utils_1.Utils.toSqlDate(new Date());
    }
    return data;
}
exports.fillDefaultFields = fillDefaultFields;
function sendForbidden(res, next) {
    const error = new errorhandler_1.HttpError(403, "Access to this resource on the server is denied!");
    if (res) {
        res.json({ "error": error });
    }
    else if (next) {
        next(error);
    }
}
exports.sendForbidden = sendForbidden;
function rootUrl(req) {
    const url = urlModule.format({
        protocol: req.protocol,
        host: req.get("host"),
        pathname: req.originalUrl,
    });
    return url.replace(req.url, "");
}
exports.rootUrl = rootUrl;
//# sourceMappingURL=comfunc.js.map