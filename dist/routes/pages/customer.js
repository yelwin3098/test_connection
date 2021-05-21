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
const express_application_1 = require("../../lib/express-application");
const utils_1 = require("../../lib/utils");
const config_json_1 = __importDefault(require("../../../data/config.json"));
const RestApi = __importStar(require("../../lib/restapi"));
const comfunc = __importStar(require("../../lib/comfunc"));
const jwtCredentialId = config_json_1.default.jwt.defCredentialId;
class CustomerRouter extends express_application_1.ExpressRouter {
    constructor() {
        super();
        this.route("/customer").all(this.onLoad).get(this.getList);
        this.route("/customer/entry").all(this.onLoad).get(this.getEntry).post(this.postEntry);
        this.route("/customer/edit/:id").all(this.onLoad).get(this.getEdit).post(this.postEdit);
        this.route("/customer/delete/:id").all(this.onLoad).post(this.postDelete);
    }
    onLoad(req, res, next) {
        if (req.isAuthenticated()) {
            next();
        }
        else {
            res.redirect(`/login?url=${req.url}`);
        }
    }
    getList(req, res, next) {
        const params = { title: config_json_1.default.appname };
        params.login = req.isAuthenticated();
        if (typeof req.jwtToken == "function") {
            req.jwtToken(jwtCredentialId)
                .then((result) => {
                params.token = result;
                res.render("dashboard/customer", params);
            })
                .catch((err) => {
                next(err);
            });
        }
        else {
            res.render("dashboard/customer", params);
        }
    }
    getEntry(req, res, next) {
        const params = { title: config_json_1.default.appname, postUrl: "/customer/entry", params: {}, listUrl: "/customer" };
        params.login = req.isAuthenticated();
        if (typeof req.jwtToken == "function") {
            req.jwtToken(jwtCredentialId)
                .then((result) => {
                params.token = result;
                res.render("dashboard/customer-entry", params);
            })
                .catch((err) => {
                next(err);
            });
        }
        else {
            res.render("dashboard/customer-entry", params);
        }
    }
    postEntry(req, res, next) {
        const data = comfunc.fillDefaultFields(req.body);
        delete (data.id);
        const db = RestApi.getDb("customer");
        db.insert(data, "id")
            .then((result) => {
            res.json({ "success": result });
        })
            .catch((err) => {
            console.log(`${err}`);
            res.json({ "error": err });
        });
    }
    getEdit(req, res, next) {
        const data = { id: req.params.id };
        if (utils_1.Utils.isEmpty(data.id)) {
            return comfunc.sendForbidden(next);
        }
        const postUrl = `/customer/edit/${data.id}`;
        const params = { title: config_json_1.default.appname, postUrl: postUrl, listUrl: "/customer", params: data };
        params.login = req.isAuthenticated();
        RestApi.getDb("customer").where({ id: data.id }).select()
            .then((result) => {
            params.params = utils_1.Utils.mixin(data, result[0]);
            if (typeof req.jwtToken == "function") {
                return req.jwtToken(jwtCredentialId);
            }
            else {
                return Promise.resolve("");
            }
        })
            .then((result) => {
            params.token = result;
            res.render("dashboard/customer-entry", params);
        })
            .catch((err) => {
            console.log(`${err}`);
            next({ "error": err });
        });
    }
    postEdit(req, res, next) {
        const data = comfunc.fillDefaultFields(req.body);
        let db = RestApi.getDb("customer");
        if (utils_1.Utils.isEmpty(data.id)) {
            return comfunc.sendForbidden(res);
        }
        db = db.where({ id: data.id });
        delete (data.id);
        db.update(data, "id")
            .then((result) => {
            res.json({ "success": result });
        })
            .catch((err) => {
            console.log(`${err}`);
            res.json({ "error": err });
        });
    }
    postDelete(req, res, next) {
        const data = { id: req.params.id };
        if (utils_1.Utils.isEmpty(data.id)) {
            return comfunc.sendForbidden(res);
        }
        let db = RestApi.getDb("customer");
        db = db.where({ id: data.id });
        db.delete("id")
            .then((result) => {
            res.json({ "success": result });
        })
            .catch((err) => {
            console.log(`${err}`);
            res.json({ "error": err });
        });
    }
}
exports.default = new CustomerRouter();
//# sourceMappingURL=customer.js.map