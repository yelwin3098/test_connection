"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_application_1 = require("../../lib/express-application");
const config_json_1 = __importDefault(require("../../../data/config.json"));
class DashboardRouter extends express_application_1.ExpressRouter {
    constructor() {
        super();
        this.route("/dashboard").all(this.onLoad).get(this.getDashboard);
    }
    onLoad(req, res, next) {
        if (req.isAuthenticated()) {
            next();
        }
        else {
            res.redirect(`/login?url=${req.url}`);
        }
    }
    getDashboard(req, res, next) {
        const params = { title: config_json_1.default.appname };
        if (typeof req.csrfToken == "function") {
            params.csrfToken = req.csrfToken();
        }
        res.render("dashboard/index", params);
    }
}
exports.default = new DashboardRouter();
//# sourceMappingURL=dashboard.js.map