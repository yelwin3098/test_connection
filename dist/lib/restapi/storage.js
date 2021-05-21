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
 * REST API Storage Class
 */
const pathModule = __importStar(require("path"));
const utils_1 = require("./utils");
class Storage {
    constructor(options, schema) {
        this.getParamsKeys = [
            "distinct", "filter", "where", "columns", "exclude", "include",
            "order", "page", "start", "length", "join", "group", "having",
            "relation"
        ];
        this.postParamsKeys = ["filter", "where", "relation"];
        this.settings = {
            pagesize: 20
        };
        utils_1.Utils.mixin(this.settings, options, true);
        this.mainDb = this.settings.maindb || "";
        this.schema = schema;
        this.models = {};
        if (options.modelBasePath) {
            this.setModelBasePath(options.modelBasePath);
        }
    }
    setModelBasePath(path) {
        if (path) {
            const pathArr = path.split(pathModule.sep);
            const currentArr = __dirname.split(pathModule.sep);
            while (pathArr.length > 0) {
                if (pathArr[0] != currentArr[0])
                    break;
                pathArr.shift();
                currentArr.shift();
            }
            this.modPath = "./" + "../".repeat(currentArr.length) + pathArr.join("/");
            this.modBasePath = path;
        }
    }
    pushModel(mod) {
        if (typeof mod === "object" && mod.name) {
            if (mod.model) {
                this.models[mod.name] = mod.model;
            }
            else {
                this.pushModel(mod.name);
            }
        }
        else if (this.modPath && typeof mod === "string" && mod != "") {
            this.addModel(mod, require(`${this.modPath}/${mod}`));
        }
    }
    addModel(modelName, model) {
        this.models[modelName] = model;
    }
    isModel(modelName) {
        if (this.models && typeof modelName === "string" && modelName != "string") {
            return (typeof this.models[modelName] !== "undefined");
        }
        return false;
    }
    isModelFunction(name, modelName) {
        const mod = this.getModel(modelName);
        if (mod && typeof name === "string" && name != "") {
            let fnName = name;
            const funcs = utils_1.Utils.getAllUserFuncs(mod);
            const exp = new RegExp(`^${fnName}$`, "i");
            const index = funcs.findIndex((val) => exp.test(val));
            if (index > -1) {
                fnName = funcs[index];
            }
            const m = mod[fnName];
            return (m && typeof m === "function");
        }
        return false;
    }
    getModel(modelName) {
        if (this.isModel(modelName)) {
            const mod = this.models[modelName];
            if (mod.default && typeof mod.default == "object") {
                return mod.default;
            }
            return mod;
        }
        return undefined;
    }
    getSchema() {
        return this.schema;
    }
    isMainDatabase(dbName) {
        return dbName == this.mainDb;
    }
    isDatabase(dbName) {
        if (typeof this.schema !== "object") {
            throw new Error("Schema is empty");
        }
        return (this.schema && typeof dbName === "string" && dbName != "" && this.schema[dbName] && typeof this.schema[dbName] === "object");
    }
    isTable(tableName, dbName = this.mainDb) {
        if (this.isDatabase(dbName) && typeof this.schema[dbName] === "object" &&
            typeof tableName === "string" && tableName != "") {
            return (typeof this.schema[dbName][tableName] === "object");
        }
        return false;
    }
    getDatabase(dbName) {
        if (this.isDatabase(dbName)) {
            return this.schema[dbName];
        }
        return undefined;
    }
    getTable(tableName, dbName = this.mainDb) {
        if (this.isTable(tableName, dbName)) {
            return this.schema[dbName][tableName];
        }
        return undefined;
    }
    getPrimaryKey(tableName, dbName = this.mainDb) {
        const table = this.getTable(tableName, dbName);
        if (table && table.columns && table.columns.length > 0 && table.primary) {
            const index = table.columns.findIndex((col) => col.name == table.primary);
            if (index > -1) {
                return table.columns[index];
            }
        }
        return undefined;
    }
    getColumns(tableName, dbName = this.mainDb) {
        const table = this.getTable(tableName, dbName);
        if (table && table.columns && table.columns.length > 0) {
            return table.columns;
        }
        return undefined;
    }
}
Storage.COMMANDS = ["HEAD", "OPTIONS", "GET", "POST", "PUT", "DELETE", "PATCH"];
exports.Storage = Storage;
//# sourceMappingURL=storage.js.map