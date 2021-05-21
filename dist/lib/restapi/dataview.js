"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * REST API DataView class
 */
const utils_1 = require("./utils");
class DataView {
    constructor(dbName) {
        this.type = "foreign";
        this.filter = {};
        this.distinct = false;
        this.dbName = dbName;
    }
    isColumnContains(col, arr = undefined) {
        if (utils_1.Utils.isEmpty(col))
            col = "";
        if (arr && arr.length > 0) {
            const tcol = `${this.tableName}.${col}`;
            return !!~arr.indexOf(col) || !!~arr.indexOf(tcol);
        }
        const index = this.schemaColumns.findIndex((sc) => { return sc.name == col; });
        return index > -1;
    }
    get where() {
        const where = [];
        if (this.filter["primary"]) {
            where.push(this.filter["primary"]);
        }
        if (this.filter["filter"]) {
            for (const w of this.filter["filter"]) {
                where.push(w);
            }
        }
        if (where.length == 0) {
            return undefined;
        }
        return "(" + where.join(") AND (") + ")";
    }
    setValues(values) {
        this.values = values;
        return this;
    }
    setTable(tableName, columns) {
        this.tableName = tableName;
        this.schemaColumns = columns;
        return this;
    }
    setPrimaryKey(primaryKey) {
        this.primaryKey = primaryKey;
    }
    setUserColumns(userColumns) {
        this.columns = [];
        const userCols = [];
        const userColsVals = [];
        if (userColumns && !Array.isArray(userColumns)) {
            userColumns = utils_1.Utils.toArray(userColumns, ",");
        }
        for (const i in userColumns) {
            const col = `${userColumns[i]}`.replace(/^([^\s\(\)\,]+|)\((.*)\)/, (m, m1, m2) => {
                userColsVals.push(m2);
                return `${m1}(#${(userColsVals.length - 1)})`;
            });
            const colObj = {
                table: "",
                prefix: "",
                func: "",
                column: ""
            };
            if (!!~col.indexOf("@")) {
                const m = /^([^@]+)@([^@]+)$/.exec(col);
                if (m) {
                    colObj.prefix = m[2];
                    colObj.column = m[1];
                }
            }
            else if (!~col.indexOf("(") && !~col.indexOf(")") && !~col.indexOf(".")) {
                if (this.isColumnContains(col)) {
                    colObj.table = this.tableName;
                }
                colObj.column = col;
            }
            else {
                const m = /^([^\(\)\.]+)\.([^\(\)\.]+)$/.exec(col);
                if (m) {
                    colObj.table = m[1];
                    colObj.column = m[2];
                }
                else {
                    colObj.column = col;
                }
            }
            const mFunc = /^([^\s\(\)\,]+|)\(#([0-9]+)\)/.exec(col);
            if (mFunc) {
                colObj.column = `${userColsVals[parseInt(mFunc[2])]}`;
                colObj.func = `${mFunc[1]}` == "" ? "raw" : mFunc[1].toLowerCase();
            }
            this.columns.push(colObj);
        }
        return this;
    }
    setExclude(exclude) {
        if (!Array.isArray(exclude)) {
            exclude = utils_1.Utils.toArray(exclude, ",");
        }
        this.columns = [];
        const excludeArr = [];
        for (const i in exclude) {
            if (exclude[i] != "") {
                excludeArr.push(exclude[i]);
            }
        }
        if (excludeArr.length > 0) {
            for (const col of this.schemaColumns) {
                if (!this.isColumnContains(col.name, excludeArr)) {
                    this.columns.push(col);
                }
            }
        }
        return this;
    }
    setIdFilters(filterStr, values, filters) {
        if (filters) {
            this.filter["primary"] = filters.convertFilter(filterStr);
        }
        else {
            this.filter["primary"] = filterStr;
        }
        this.filterIds = values;
        return this;
    }
    addFilter(filter, filters) {
        if (!this.filter["filter"]) {
            this.filter["filter"] = [];
        }
        if (!Array.isArray(filter)) {
            filter = [filter];
        }
        for (const i in filter) {
            if (filters) {
                this.filter["filter"].push(filters.convertFilter(filter[i]));
            }
            else {
                this.filter["filter"].push(filter[i]);
            }
        }
        return this;
    }
    setOrderBy(orderBy) {
        if (!Array.isArray(orderBy)) {
            orderBy = [orderBy];
        }
        let sort = "ASC";
        for (const i in orderBy) {
            const arr = utils_1.Utils.split(orderBy[i], ",");
            if (arr.length == 1) {
                arr.push(sort);
            }
            sort = arr[1] = arr[1].toUpperCase();
            orderBy[i] = arr.join(" ");
        }
        this.orderBy = orderBy.join(", ");
        return this;
    }
    setOffset(offset) {
        this.offset = utils_1.Utils.tryParseInt(offset, 0);
        return this;
    }
    setLength(length) {
        this.limit = utils_1.Utils.tryParseInt(length, 0);
        return this;
    }
    setPage(page, defPageSize) {
        if (typeof page === "number") {
            this.offset = page * defPageSize;
            this.limit = defPageSize;
        }
        else if (typeof page === "string") {
            page = page.replace(/[^0-9,]/g, "");
            let match = page.match(/^([0-9]+),([0-9]+)$/i);
            if (match) {
                this.limit = utils_1.Utils.tryParseInt(match[2], 0);
                this.offset = utils_1.Utils.tryParseInt(match[1], 0) * this.limit;
            }
            else {
                match = page.match(/^([0-9]+)$/i);
                if (match) {
                    this.offset = utils_1.Utils.tryParseInt(match[1], 0) * defPageSize;
                    this.limit = defPageSize;
                }
            }
        }
        return this;
    }
    setGroupBy(groupBy) {
        const values = utils_1.Utils.toArray(groupBy, ",");
        this.groupBy = [];
        for (const group of values) {
            this.groupBy.push(`${group}`);
        }
        return this;
    }
    setHaving(having, filters) {
        const value = `${having}`.replace(/\"/g, "'");
        if (filters) {
            this.having = filters.convertFilter(value);
        }
        else {
            this.having = value;
        }
        return this;
    }
    setJoin(join, filters) {
        let val = "";
        if (typeof join === "string") {
            val = join.replace(/\"/g, "'");
        }
        else {
            val = join;
        }
        this.joins = [];
        const list = utils_1.Utils.toArray(val);
        for (const item of list) {
            const st = utils_1.Utils.split(`${item}`, ",");
            if (st.length > 1) {
                let jType = "inner";
                if (!!~["inner", "left", "leftouter", "right", "rightouter", "outer", "fullouter", "cross"]
                    .indexOf(st[0].toLowerCase())) {
                    jType = st.shift().toLowerCase();
                    if (jType == "leftouter") {
                        jType = "left outer";
                    }
                    else if (jType == "rightouter") {
                        jType = "right outer";
                    }
                    else if (jType == "fullouter") {
                        jType = "full outer";
                    }
                }
                jType += " join";
                const table = st.shift();
                if (table) {
                    let cond = st.join(",");
                    if (filters) {
                        cond = filters.convertFilter(st.join(","));
                    }
                    this.joins.push({
                        "type": jType,
                        "table": table,
                        "condition": cond
                    });
                }
            }
        }
        return this;
    }
    setInclude(include) {
        throw new Error("Not implemented.");
    }
}
exports.DataView = DataView;
//# sourceMappingURL=dataview.js.map