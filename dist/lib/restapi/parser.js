"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const urlModule = __importStar(require("url"));
const querystring = __importStar(require("querystring"));
const models_1 = require("./models");
const utils_1 = require("./utils");
const dataview_1 = require("./dataview");
const bodyParser = __importStar(require("./bodyparser"));
class Parser {
    constructor(storage, filters) {
        this.storage = storage;
        this.filters = filters;
        this.dataViews = [];
    }
    getDataView(tableName) {
        if (this.dataViews.length > 0) {
            const index = this.dataViews.findIndex((value) => value.tableName == tableName);
            if (index > -1) {
                return this.dataViews[index];
            }
        }
        return undefined;
    }
    setPrimaryView(tableName) {
        if (this.dataViews.length > 0) {
            const index = this.dataViews.findIndex((view) => view.tableName == tableName);
            if (index > -1) {
                for (let i = 0; i < this.dataViews.length; i++) {
                    this.dataViews[i].type = "foreign";
                }
                this.dataViews[index].type = "primary";
            }
        }
    }
    getPrimaryView() {
        if (this.dataViews.length > 0) {
            let index = this.dataViews.findIndex((view) => view.type == "primary");
            if (index > -1) {
                return this.dataViews[index];
            }
            index = this.dataViews.length - 1;
            return this.dataViews[index];
        }
        return undefined;
    }
    parseUrl(url) {
        if (!url || url == "/") {
            throw new Error("Url is empty");
        }
        const tempUrl = url.replace(/^[/]{1,2}([^\?]+)(.*)$/, "$1");
        const arr = tempUrl.split("/");
        for (const i in arr) {
            arr[i] = utils_1.Utils.decodeUrl(arr[i]);
        }
        if (arr.length > 0) {
            const temp = arr[0];
            if (this.storage.isModel(temp)) {
                arr.shift();
                let modelFunc = "index";
                if (arr.length > 0 && this.storage.isModelFunction(arr[0], temp)) {
                    modelFunc = arr.shift();
                }
                this.model = new models_1.Model(temp, modelFunc, arr);
                return;
            }
            let dbName = this.storage.mainDb;
            if (this.storage.isDatabase(temp)) {
                dbName = temp;
                arr.shift();
            }
            let tblName;
            while (arr.length > 0) {
                if (this.storage.isTable(arr[0], dbName)) {
                    tblName = arr.shift();
                    if (!this.getDataView(tblName)) {
                        const dataView = new dataview_1.DataView(dbName);
                        const colunms = this.storage.getColumns(tblName, dbName);
                        dataView.setTable(tblName, colunms);
                        const primaryKey = this.storage.getPrimaryKey(tblName, dbName);
                        if (primaryKey) {
                            dataView.setPrimaryKey(primaryKey);
                        }
                        this.dataViews.push(dataView);
                        this.setPrimaryView(tblName);
                    }
                }
                else if (tblName) {
                    const arrIds = arr.shift();
                    if (arrIds != "") {
                        const ids = arrIds.split(",");
                        const dataView = this.getDataView(tblName);
                        if (dataView) {
                            const primaryKey = this.storage.getPrimaryKey(tblName, dbName);
                            let filterStr = primaryKey.name;
                            if (ids.length == 1) {
                                filterStr += `,eq,${ids[0]}`;
                            }
                            else if (ids.length > 1) {
                                filterStr += `,in,[${ids.join(",")}]`;
                            }
                            dataView.setIdFilters(filterStr, ids, this.filters);
                        }
                    }
                }
                else {
                    arr.shift();
                }
            }
        }
    }
    parseParam(query, method = "GET") {
        if (typeof query === "object") {
            method = method.toUpperCase();
            const keys = (method == "GET") ? this.storage.getParamsKeys : this.storage.postParamsKeys;
            const pageSize = this.storage.settings.pagesize;
            for (const i in query) {
                let key = i.replace(/^([\w]+)(\[\]|)$/, "$1").toLowerCase();
                let dataView = this.getPrimaryView();
                const match = /^([^\.]+)\.([^\.]+)$/.exec(key);
                if (match) {
                    dataView = this.getDataView(match[1]);
                    key = `${match[2]}`;
                }
                if (!dataView)
                    continue;
                if (!~keys.indexOf(key))
                    continue;
                const val = utils_1.Utils.decodeUrl(query[i]);
                if (key == "columns") {
                    dataView.setUserColumns(val);
                }
                else if (key == "exclude") {
                    dataView.setExclude(val);
                }
                else if (key == "start") {
                    dataView.setOffset(val);
                }
                else if (key == "length") {
                    dataView.setLength(val);
                }
                else if (key == "page") {
                    dataView.setPage(val, pageSize);
                }
                else if (!!~["filter", "where", "w"].indexOf(key)) {
                    dataView.addFilter(val, this.filters);
                }
                else if (key == "join") {
                    dataView.setJoin(val, this.filters);
                }
                else if (key == "group") {
                    dataView.setGroupBy(val);
                }
                else if (key == "having") {
                    dataView.setHaving(val, this.filters);
                }
                else if (key == "order") {
                    dataView.setOrderBy(val);
                }
                else if (key == "distinct") {
                    dataView.distinct = true;
                }
                else if (key == "include") {
                    dataView.setInclude(val);
                }
            }
        }
    }
    parse(req) {
        const url = req.url;
        const method = req.method || "GET";
        const parsed = urlModule.parse(req.url, false);
        const queryStr = parsed.query ? `${parsed.query}` : "";
        const query = querystring.parse(queryStr.replace(/\+/g, "%2B"), "&", "=");
        this.model = undefined;
        this.dataViews = [];
        this.parseUrl(url);
        this.parseParam(query, method);
        return this;
    }
    parseBody(req) {
        if (req.body) {
            return new Promise((resolve, reject) => {
                resolve(req.body);
            });
        }
        return bodyParser.parse(req);
    }
    shrinkQuery(query) {
        const result = {};
        const keys = this.storage.getParamsKeys;
        if (typeof query === "object") {
            for (const i in query) {
                const key = i.replace(/^([\w]+)(\[\]|)$/, "$1");
                if (!~keys.indexOf(key)) {
                    result[key] = utils_1.Utils.decodeUrl(query[i]);
                }
            }
        }
        return result;
    }
}
exports.Parser = Parser;
//# sourceMappingURL=parser.js.map