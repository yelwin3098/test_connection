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
 * REST API main
 */
const events_1 = require("events");
const knex = __importStar(require("knex"));
const schema = __importStar(require("./schema"));
const storage_1 = require("./storage");
const parser_1 = require("./parser");
const filters = __importStar(require("./filters"));
const utils_1 = require("./utils");
const models_1 = require("./models");
const help_1 = require("./help");
const urlhandler_1 = require("./urlhandler");
const commands_1 = require("./commands");
const defaultHeaders = (headers) => {
    return {
        "Access-Control-Allow-Origin": headers.origin || "*",
        "Access-Control-Allow-Headers": "Content-Type, X-CSRF-Token",
        "Access-Control-Allow-Methods": storage_1.Storage.COMMANDS.join(", "),
        "Access-Control-Allow-Credentials": true,
        "Access-Control-Max-Age": 1728000
    };
};
class RestApi extends events_1.EventEmitter {
    /**
     * Api main constructor
     * @param {object} options Api config
     */
    constructor(options) {
        super();
        this.options = options;
        const dbConfig = utils_1.Utils.mixin({}, this.options, true);
        delete dbConfig.pagesize;
        delete dbConfig.databases;
        delete dbConfig.modelBasePath;
        const conn = this.options.connection;
        if (typeof conn.database === "string") {
            this.options.maindb = conn.database;
        }
        const maindb = this.options.maindb;
        if (maindb && maindb != "") {
            if (!this.options.databases) {
                this.options.databases = [maindb];
            }
            else {
                if (!~this.options.databases.indexOf(maindb)) {
                    this.options.databases.push(maindb);
                }
            }
        }
        this.dialect = dbConfig.dialect;
        if (dbConfig.client && typeof dbConfig.client === "string") {
            this.dialect = dbConfig.client;
        }
        this.initDatabase(dbConfig);
    }
    initDatabase(dbConfig) {
        let knexInit;
        if (typeof knex === "function") {
            knexInit = knex;
        }
        else if (knex["default"] && typeof knex["default"] == "function") {
            knexInit = knex["default"];
        }
        else {
            throw new Error("Knex not found.");
        }
        this.db = knexInit(dbConfig);
    }
    /**
     * Create and initialize Rest api.
     * @param {object} config
     * @return {RestApi}
     * @public
     */
    init() {
        const schemaCls = schema.default[this.dialect];
        if (!schemaCls) {
            throw new Error("Schema not found.");
        }
        const filtersCls = filters.default[this.dialect];
        if (!filtersCls) {
            throw new Error("Filter not found.");
        }
        const sc = (new schemaCls(this.db));
        return new Promise((resolve, reject) => {
            sc.getSchemas(this.options.databases)
                .then((result) => {
                this.storage = new storage_1.Storage(this.options, result);
                this.parser = new parser_1.Parser(this.storage, new filtersCls());
                this.initHandlers();
                resolve(this);
            }).catch((err) => {
                reject(err);
            });
        });
    }
    initHandlers() {
        this.handler = new urlhandler_1.UrlHandler();
        const defAuthFun = (req, res, next) => {
            next();
        };
        const authFun = this.options.authHandler || defAuthFun;
        this.handler.get(/^(\/|)--help$/i, help_1.Help.renderReadMe(__dirname));
        this.handler.get(/^(\/|)--schema$/i, help_1.Help.renderSchema(this.storage.getSchema()));
        this.handler.post(/^(\/|)--exec$/i, authFun, this.executeQuery());
        this.handler.all(/^(.*)$/i, authFun, this.handleCommads());
    }
    /**
     * Get storage.
     * @return {object}
     * @public
     */
    getStorage() {
        return this.storage;
    }
    /**
     * Get current database connection.
     * @return {KNEX}
     * @public
     */
    getDb() {
        return this.db;
    }
    /**
     * Close and destory.
     * @public
     */
    close() {
        if (this.db && typeof this.db.destroy === "function") {
            this.db.destroy((err) => { });
        }
    }
    /**
     * Apply custom models to api.
     * @param {object|string} models
     * @public
     */
    applyModel(...models) {
        if (!this.storage) {
            throw new Error("Not initialized.");
        }
        if (models.length > 0) {
            if (models.length == 2) {
                this.storage.pushModel({
                    "name": models[0],
                    "model": models[1]
                });
            }
            else if (typeof models[0] === "string") {
                for (const i in models) {
                    this.storage.pushModel(models[i]);
                }
            }
            else if (typeof models[0] === "object") {
                let args = models;
                if (Array.isArray(models[0])) {
                    args = models[0];
                }
                for (const i in args) {
                    this.storage.pushModel(args[i]);
                }
            }
        }
    }
    execute(objName) {
        if (this.storage.isModel(objName)) {
            const mod = this.storage.getModel(objName);
            const model = new models_1.Model(objName);
            return model.apply(mod);
        }
        else if (this.storage.isTable(objName)) {
            return this.db(objName);
        }
        else {
            throw new Error("Object not found.");
        }
    }
    /**
     * Handle middleware function
     * @return {Function} middleware function
     * @public
     */
    handle() {
        const self = this;
        return (req, res, next) => {
            if (!self.storage) {
                return next(new Error("Not initialized."));
            }
            self.emit("handle");
            self.handler.handle(req, res, next);
        };
    }
    handleCommads() {
        const self = this;
        return (req, res, next) => {
            const url = req.url;
            const method = req.method || "GET";
            const headers = defaultHeaders(req.headers);
            const outFunc = self.pipe(headers, req, res, next);
            if (method == "HEAD") {
                return outFunc();
            }
            else if (method == "OPTIONS") {
                const optionsCmd = new commands_1.OptionsCommand(self.storage.settings, self.storage.getSchema());
                return outFunc(undefined, optionsCmd.valueOf());
            }
            else {
                self.parser.parse(req);
                if (self.parser.model) {
                    const model = self.parser.model;
                    const args = model.createArguments(self, req, res);
                    self.executeModel(model, args, outFunc);
                }
                else if (!!~["POST", "PUT", "PATCH"].indexOf(method)) {
                    const dataView = self.parser.getPrimaryView();
                    if (!dataView) {
                        return outFunc(self.errorNotFound("Method"));
                    }
                    self.parser.parseBody(req)
                        .then((body) => {
                        dataView.setValues(body);
                        self.executeCommand([dataView], method, outFunc);
                    })
                        .catch((err) => {
                        outFunc(err);
                    });
                }
                else { // "GET"
                    self.executeCommand(self.parser.dataViews, method, outFunc);
                }
            }
        };
    }
    errorNotFound(type) {
        const err = new Error(`${type} not found!`);
        err.status = 404;
        return err;
    }
    executeQuery() {
        const self = this;
        return (req, res, next) => {
            const headers = defaultHeaders(req.headers);
            const outFunc = self.pipe(headers, req, res, next);
            self.parser.parseBody(req)
                .then((body) => {
                const query = body.query || body.sql || "";
                delete body.query;
                delete body.sql;
                if (query.length > 0) {
                    self.getDb().raw(query, body)
                        .then((result) => {
                        outFunc(undefined, result);
                    })
                        .catch((err) => {
                        outFunc(err);
                    });
                }
                else {
                    outFunc(self.errorNotFound("Arguments"));
                }
            })
                .catch((err) => {
                outFunc(err);
            });
        };
    }
    executeCommand(dataViews, method, outFunc) {
        const promises = [];
        for (const dv of dataViews) {
            const cmd = new commands_1.Commands(dv);
            if (method == "GET") {
                promises.push(cmd.execGetCommand(this.db));
            }
            else if (method == "POST") {
                promises.push(cmd.execPostCommand(this.db));
            }
            else if (method == "PATCH") {
                promises.push(cmd.execPatchCommand(this.db));
            }
            else if (method == "PUT") {
                promises.push(cmd.execPutCommand(this.db));
            }
            else if (method == "DELETE") {
                promises.push(cmd.execDeleteCommand(this.db));
            }
        }
        if (promises.length < 1) {
            return outFunc(this.errorNotFound("Method"));
        }
        Promise.all(promises)
            .then((result) => {
            const data = {};
            for (const i in result) {
                data[dataViews[i].tableName] = result[i];
            }
            outFunc(undefined, data);
        })
            .catch((err) => {
            outFunc(err, undefined);
        });
    }
    executeModel(model, args, outFunc) {
        const obj = this.storage.getModel(model.name);
        if (obj && typeof obj == "object") {
            let fnName = model.method;
            const funcs = utils_1.Utils.getAllUserFuncs(obj);
            const exp = new RegExp(`^${fnName}$`, "i");
            const index = funcs.findIndex((val) => exp.test(val));
            if (index > -1) {
                fnName = funcs[index];
            }
            const objFn = obj[fnName];
            if (typeof objFn === "function") {
                return (function () {
                    try {
                        return objFn.call(obj, args, outFunc);
                    }
                    catch (err) {
                        outFunc(this.errorNotFound("Method"));
                    }
                })();
            }
        }
        outFunc(this.errorNotFound("Method"));
    }
    pipe(headers, req, res, next) {
        const self = this;
        return function (err, result) {
            if (!utils_1.Utils.isEmpty(err)) {
                if (self.options.errorHandler && typeof self.options.errorHandler == "function") {
                    const handler = self.options.errorHandler;
                    handler.call(self.options, err, req, res, (doneData) => {
                        const data = doneData || self.errorJson(err);
                        self.jsonOut(headers, res, data.status || 500, doneData);
                    });
                }
                else if (next && typeof next === "function") {
                    return next(err);
                }
                else {
                    result = self.errorJson(err);
                    self.jsonOut(headers, res, err.status || 500, result);
                }
            }
            else if (self.options.resultHandler && typeof self.options.resultHandler == "function") {
                const handler = self.options.resultHandler;
                handler.call(self.options, result, req, res, (doneData) => {
                    const data = doneData || result;
                    self.jsonOut(headers, res, 200, data);
                });
            }
            else if (result) {
                self.jsonOut(headers, res, 200, result);
            }
            else {
                self.jsonOut(headers, res, 204, {});
            }
            return self;
        };
    }
    errorJson(err) {
        let status = 500;
        const result = {
            "error": {
                "message": "Internal server error.",
                "status": status,
                "stack": ""
            }
        };
        if (err && typeof err === "object") {
            status = (err.status || 500);
            result.error = {
                "message": err.message,
                "status": status,
                "stack": err.stack
            };
        }
        return result;
    }
    jsonOut(headers, res, status, data) {
        const dataStr = JSON.stringify(data);
        headers["Content-Type"] = "application/json; charset=utf-8";
        if (!utils_1.Utils.isEmpty(dataStr)) {
            headers["Content-Length"] = Buffer.byteLength(dataStr, "utf8");
        }
        res.writeHead(status, headers);
        res.write(dataStr);
        res.end();
    }
}
exports.RestApi = RestApi;
//# sourceMappingURL=api.js.map