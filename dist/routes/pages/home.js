"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_application_1 = require("../../lib/express-application");
const config_json_1 = __importDefault(require("../../../data/config.json"));
class HomeRouter extends express_application_1.ExpressRouter {
    constructor() {
        super();
        this.get("/", this.getHome);
    }
    getHome(req, res, next) {
        const params = { title: config_json_1.default.appname };
        params.login = req.isAuthenticated();
        if (typeof req.csrfToken == "function") {
            params.csrfToken = req.csrfToken();
        }
        res.render("index", params);
    }
}
exports.default = new HomeRouter();
//# sourceMappingURL=home.js.map