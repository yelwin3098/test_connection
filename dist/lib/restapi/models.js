"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("./utils");
class Model {
    constructor(name, method, args) {
        this.name = name;
        this.method = method;
        this.args = args;
    }
    createArguments(api, req, res) {
        const obj = {};
        if (this.args && typeof this.args === "object") {
            utils_1.Utils.mixin(obj, this.args, false);
        }
        if (req.query) {
            utils_1.Utils.mixin(obj, req.query, false);
        }
        if (req.body) {
            utils_1.Utils.mixin(obj, req.body, false);
        }
        obj.knex = api.getDb();
        obj.getApi = () => {
            return api;
        };
        obj.getSettings = () => {
            return api.getStorage().settings;
        };
        obj.getRequest = () => {
            return req;
        };
        obj.getResponse = () => {
            return res;
        };
        obj.getDb = (tableName) => {
            if (tableName) {
                return api.getDb()(tableName);
            }
            return api.getDb();
        };
        return obj;
    }
    apply(mod) {
        const self = utils_1.Utils.extend({}, this);
        if (mod) {
            this.model = mod;
            const funcs = utils_1.Utils.getAllUserFuncs(mod);
            for (const f of funcs) {
                const fn = mod[f];
                if (fn && typeof fn === "function") {
                    self[f] = (args) => {
                        const fnArgs = [args];
                        return new Promise((resolve, reject) => {
                            fnArgs.push((err, result) => {
                                if (!utils_1.Utils.isEmpty(err)) {
                                    reject(err);
                                }
                                else {
                                    resolve(result);
                                }
                            });
                            try {
                                fn.call(mod, ...fnArgs);
                            }
                            catch (err) {
                                reject(err);
                            }
                        });
                    };
                }
            }
        }
        delete self["createArguments"];
        delete self["apply"];
        return self;
    }
    call(method, ...args) {
        if (this.model && method !== "") {
            const model = this.model;
            const fn = this.model[method];
            if (fn && typeof fn === "function") {
                return new Promise((resolve, reject) => {
                    if (!args) {
                        args = [];
                    }
                    args.push((err, result) => {
                        if (!utils_1.Utils.isEmpty(err)) {
                            reject(err);
                        }
                        else {
                            resolve(result);
                        }
                    });
                    try {
                        fn.call(model, ...args);
                    }
                    catch (err) {
                        reject(err);
                    }
                });
            }
            else {
                throw new Error("Model method not found.");
            }
        }
        else {
            throw new Error("Model not found.");
        }
    }
}
exports.Model = Model;
//# sourceMappingURL=models.js.map