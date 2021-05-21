"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Express Application
 */
const fs = __importStar(require("fs"));
const pathModule = __importStar(require("path"));
const express_1 = __importDefault(require("express"));
const http = __importStar(require("http"));
const errorHandler = __importStar(require("./errorhandler"));
const METHODS = (function () {
    return http.METHODS && http.METHODS.map((method) => {
        return method.toLowerCase();
    });
})() || [
    "get", "post", "put", "head", "delete", "options",
    "trace", "copy", "lock", "mkcol", "move", "purge",
    "propfind", "proppatch", "unlock", "report", "mkactivity",
    "checkout", "merge", "m-search", "notify", "subscribe",
    "unsubscribe", "patch", "search", "connect"
];
/****************************************************************************************************
 * ExpressApplication Class
 ****************************************************************************************************/
class ExpressApplication {
    constructor(basePath) {
        this.app = express_1.default();
        this.urlencodedOptions = { extended: false };
        this.isUnderConstruction = false;
        this.dirname = basePath;
    }
    /**
     * On create method
     */
    create() {
        this.onUseViewEngine(this.app);
        this.app.use(this.rootUrl());
        if (this.isUnderConstruction) {
            this.app.use(errorHandler.underConstruction());
        }
        else {
            this.app.use(express_1.default.json());
            this.app.use(express_1.default.urlencoded(this.urlencodedOptions));
            this.onUseMiddleWares(this.app);
            this.onUseRouter(this.app);
        }
        this.app.use(this.onErrorNotFound());
        // error handler
        this.app.use(errorHandler.handleError());
        return this.app;
    }
    rootUrl() {
        return (req, res, next) => {
            const url = req.url.replace(/^.*~\/(.*)$/, "/$1");
            console.log(`${req.method} ${url}`);
            req.url = url;
            next();
        };
    }
    /**
     * Catch 404 and forward to error handler
     * @param req @see express.Request
     * @param res @see express.Response
     * @param next @see express.NextFunction
     */
    onErrorNotFound() {
        return (req, res, next) => {
            const err = new errorHandler.HttpError(404, "Resource Not Found");
            next(err);
        };
    }
    /**
     * Set static directory to Express Application
     * @param dir static directory
     */
    useStatic(dir) {
        this.app.use(express_1.default.static(pathModule.join(this.dirname, dir)));
    }
    /**
     * Load all routers in given directory.
     * @param dir Routers directory
     */
    loadRouters(dir) {
        const findPath = pathModule.join(this.dirname, dir);
        const handlers = [];
        const files = fs.readdirSync(findPath).filter((name) => /^[^\.]+(.js|.ts)$/.test(name));
        for (const name of files) {
            const handler = require(pathModule.join(findPath, name));
            if (handler.default) {
                if (handler.default instanceof ExpressRouter) {
                    handlers.push(handler.default.router);
                }
                else {
                    handlers.push(handler.default);
                }
            }
            else {
                try {
                    const obj = new handler();
                    if (obj instanceof ExpressRouter) {
                        handlers.push(obj.router);
                    }
                }
                catch (e) {
                    console.log(e);
                }
            }
        }
        this.app.use(handlers);
    }
    // Properties
    /**
     * @see express.Application.locals
     */
    get locals() {
        return this.app.locals;
    }
    /**
     * @see express.Application.mountpath
     */
    get mountpath() {
        return this.app.mountpath;
    }
    // Events
    /**
     * @see express.Application.on
     */
    on(event, callback) {
        this.app.on(event, callback);
        return this;
    }
    // Methods
    /**
     * @see express.Application.all
     */
    all(path, ...handlers) {
        return this.app.all(path, handlers);
    }
    get(path, ...handlers) {
        if (name) {
            return this.app.get(name);
        }
        else {
            return this.app.get(path, handlers);
        }
    }
    /**
     * @see express.Application.post
     */
    post(path, ...handlers) {
        return this.app.post(path, handlers);
    }
    /**
     * @see express.Application.put
     */
    put(path, ...handlers) {
        return this.app.put(path, handlers);
    }
    /**
     * @see express.Application.patch
     */
    patch(path, ...handlers) {
        return this.app.patch(path, handlers);
    }
    /**
     * @see express.Application.delete
     */
    delete(path, ...handlers) {
        return this.app.delete(path, handlers);
    }
    /**
     * @see express.Application.options
     */
    options(path, ...handlers) {
        return this.app.options(path, handlers);
    }
    /**
     * @see express.Application.head
     */
    head(path, ...handlers) {
        return this.app.head(path, handlers);
    }
    /**
     * @see express.Application.route
     */
    route(prefix) {
        return this.app.route(prefix);
    }
    /**
     * @see express.Application.set
     */
    set(setting, val) {
        return this.app.set(setting, val);
    }
    /**
     * @see express.Application.engine
     */
    engine(ext, fn) {
        // public engine(ext: string, fn: Function): express.Application {
        return this.app.engine(ext, fn);
    }
    use(path, ...handlers) {
        if (path) {
            if (typeof path === "string") {
                this.app.use(path, handlers);
            }
            else if (path instanceof RegExp || path instanceof Array) {
                this.app.use(path, handlers);
            }
            else if (typeof path == "function") {
                handlers.splice(0, 0, path);
                this.app.use(handlers);
            }
        }
        else {
            this.app.use(handlers);
        }
    }
    useRouter(path, router) {
        if (typeof path === "string") {
            this.app.use(`${path}`, router.router);
        }
        else if (path instanceof RegExp || path instanceof Array) {
            this.app.use(path, router.router);
        }
    }
    /**
     * @see express.Application.path
     */
    path() {
        return this.app.path();
    }
}
exports.ExpressApplication = ExpressApplication;
/****************************************************************************************************
 * ExpressRouter Class
 ****************************************************************************************************/
class ExpressRouter {
    constructor() {
        this.router = express_1.default.Router();
        const self = this;
        const funcs = ExpressRouter.getAllFuncs(self);
        for (const i in METHODS) {
            const m = METHODS[i];
            if (!~funcs.indexOf(m)) {
                this[m] = function (path, ...handlers) {
                    return self[m](path, handlers);
                };
            }
        }
    }
    static getAllFuncs(obj) {
        let props = [];
        if (!obj)
            return props;
        let objProto = obj;
        do {
            props = props.concat(Object.getOwnPropertyNames(objProto));
        } while (objProto = Object.getPrototypeOf(objProto));
        return props.filter((e, i, arr) => {
            return (e != arr[i + 1] && typeof obj[e] == "function");
        });
    }
    /**
     * Attach route
     * @param path Path of route
     * @param handlers handler object eg: { "get": [ function(req, res, next) {} ] }
     */
    attach(path, handlers) {
        const r = this.router.route(path);
        for (const m in handlers) {
            const method = m.toLowerCase();
            if (method == "all") {
                r.all(handlers[m]);
            }
            else if (!!~METHODS.indexOf(method)) {
                r[method](handlers[m]);
            }
        }
        return r;
    }
    use(path, ...handlers) {
        if (path) {
            if (typeof path === "string") {
                this.router.use(path, handlers);
            }
            else if (path instanceof RegExp || path instanceof Array) {
                this.router.use(path, handlers);
            }
            else if (typeof path == "function") {
                handlers.splice(0, 0, path);
                this.router.use(handlers);
            }
        }
        else {
            this.router.use(handlers);
        }
    }
    /**
     * @see express.Router.param
     */
    param(name, handler) {
        return this.router.param(name, handler);
    }
    /**
     * @see express.Router.all
     */
    all(path, ...handlers) {
        return this.router.all(path, handlers);
    }
    /**
     * @see express.Router.get
     */
    get(path, ...handlers) {
        return this.router.get(path, handlers);
    }
    /**
     * @see express.Router.post
     */
    post(path, ...handlers) {
        return this.router.post(path, handlers);
    }
    /**
     * @see express.Router.put
     */
    put(path, ...handlers) {
        return this.router.put(path, handlers);
    }
    /**
     * @see express.Router.patch
     */
    patch(path, ...handlers) {
        return this.router.patch(path, handlers);
    }
    /**
     * @see express.Router.delete
     */
    delete(path, ...handlers) {
        return this.router.delete(path, handlers);
    }
    /**
     * @see express.Router.options
     */
    options(path, ...handlers) {
        return this.router.options(path, handlers);
    }
    /**
     * @see express.Router.head
     */
    head(path, ...handlers) {
        return this.router.head(path, handlers);
    }
    /**
     * @see express.Router.route
     */
    route(prefix) {
        return this.router.route(prefix);
    }
}
exports.ExpressRouter = ExpressRouter;
//# sourceMappingURL=express-application.js.map