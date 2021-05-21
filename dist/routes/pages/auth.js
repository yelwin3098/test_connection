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
const config_json_1 = __importDefault(require("../../../data/config.json"));
const passport = __importStar(require("../../config/passport-config"));
class AuthRouter extends express_application_1.ExpressRouter {
    constructor() {
        super();
        /* Login route. */
        this.route("/login").get(this.getLogin).post(this.postLogin);
        /* Log out route */
        this.route("/logout").all(this.logout);
        /* Register route */
        this.route("/register").get(this.getRegister);
        /* Change password route */
        this.route("/changepwd").get(this.getChangePassword).post(this.postChangePassword);
    }
    static buildAlert(type, message) {
        const cssClass = (type == "error") ? "danger" : type;
        const title = type.toUpperCase();
        return `<div class='alert alert-${cssClass} alert-dismissible' role='alert'><strong>${title}:</strong> ${message}
  <button class='close' type='button' data-dismiss='alert' aria-label='Close'><span aria-hidden='true'>&times;</span></button>
  </div>`;
    }
    getLogin(req, res, next) {
        const params = { title: "Login" };
        params.url = req.query.url || "/dashboard";
        if (typeof req.csrfToken == "function") {
            params.csrfToken = req.csrfToken();
        }
        res.render("auth/login", params);
    }
    postLogin(req, res, next) {
        const redirecturl = req.body.url || "/dashboard";
        const remember = (req.body.remember && req.body.remember == 1) || false;
        if (remember) {
            // Cookie expires after 7 days
            req.session.cookie.maxAge = 7 * 24 * 60 * 60 * 1000;
        }
        else {
            // Cookie expires at end of session
            req.session.cookie.expires = false;
        }
        passport.default.authenticate("local", (err, user) => {
            const params = { title: config_json_1.default.appname };
            params.url = redirecturl;
            if (typeof req.csrfToken == "function") {
                params.csrfToken = req.csrfToken();
            }
            if (err) {
                params.message = AuthRouter.buildAlert("error", err.message);
                res.render("auth/login", params);
            }
            else if (!user) {
                params.message = AuthRouter.buildAlert("error", "Invalid login user!");
                res.render("auth/login", params);
            }
            else {
                req.logIn(user, { session: true }, (errLogin) => {
                    if (errLogin) {
                        return next(err);
                    }
                    return res.redirect(redirecturl);
                });
            }
        })(req, res, next);
    }
    logout(req, res, next) {
        req.logOut();
        res.redirect("/");
    }
    getChangePassword(req, res, next) {
        if (req.isAuthenticated() && req.user) {
            const params = { title: config_json_1.default.appname, params: req.user };
            params.url = req.query["url"] || "/dashboard";
            if (typeof req.csrfToken == "function") {
                params.csrfToken = req.csrfToken();
            }
            res.render("auth/changepassword", params);
        }
        else {
            res.redirect(`/login?url=${req.url}`);
        }
    }
    postChangePassword(req, res, next) {
        const redirectUrl = req.body.redirecturl || "/dashboard";
        const outFunc = (data, msgtype, msg) => {
            const params = { title: config_json_1.default.appname, params: data, url: redirectUrl };
            params.message = AuthRouter.buildAlert(msgtype, msg);
            if (typeof req.csrfToken == "function") {
                params.csrfToken = req.csrfToken();
            }
            res.render("auth/changepassword", params);
        };
        if (req.isAuthenticated() && req.user) {
            const data = req.body;
            const user = req.user;
            const id = user.id || 0;
            const password = user.password || "";
            if (data.id && data.id == id) {
                const oldpassword = passport.md5(data.oldpassword);
                if (password != oldpassword) {
                    outFunc(data, "error", "Old Password does not match!");
                }
                else if (data.password != data.repassword) {
                    outFunc(data, "error", "Confirm Password does not match!");
                }
                else {
                    const saveData = {
                        id: id,
                        usertype: user.usertype,
                        username: user.username,
                        password: passport.md5(data.password)
                    };
                    passport.default.updateSystemUser(saveData)
                        .then((result) => {
                        if (result) {
                            outFunc(data, "success", "Password has changed!");
                        }
                        else {
                            outFunc(data, "error", "Password can not changed!");
                        }
                    })
                        .catch((err) => {
                        outFunc(data, "error", "Password can not changed!");
                    });
                }
            }
            else {
                res.redirect(redirectUrl);
            }
        }
        else {
            res.redirect(redirectUrl);
        }
    }
    getRegister(req, res, next) {
        res.send("Hello world!");
    }
}
exports.default = new AuthRouter();
//# sourceMappingURL=auth.js.map