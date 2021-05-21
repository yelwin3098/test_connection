"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("./utils");
class Commands {
    constructor(dataView) {
        this.dataView = dataView;
    }
    // Select
    execGetCommand(db) {
        let query = db(this.dataView.tableName).withSchema(this.dataView.dbName);
        if (!utils_1.Utils.isEmpty(this.dataView.columns)) {
            const cols = [];
            const buildColumn = (prefix, column) => {
                if (prefix != "") {
                    const colObj = {};
                    colObj[prefix] = column;
                    return colObj;
                }
                return column;
            };
            for (const col of this.dataView.columns) {
                if (col.func != "") {
                    if (!!~["avg", "count", "min", "max", "sum"].indexOf(col.func)) {
                        query = query[col.func](buildColumn(col.prefix, col.column));
                    }
                    else if (col.func == "raw") {
                        cols.push(buildColumn(col.prefix, db.raw(`${col.column}`)));
                    }
                }
                else if (/[^\(\)\.]/g.test(col.column) && col.table != "") {
                    cols.push(buildColumn(col.prefix, `${col.table}.${col.column}`));
                }
                else {
                    cols.push(buildColumn(col.prefix, `${col.column}`));
                }
            }
            if (this.dataView.distinct) {
                query = query.distinct(cols);
            }
            else {
                query = query.column(cols);
            }
        }
        else if (this.dataView.distinct) {
            query = query.distinct();
        }
        query = query.select();
        if (!utils_1.Utils.isEmpty(this.dataView.joins)) {
            for (const j of this.dataView.joins) {
                if (typeof j === "object") {
                    let str = `${j.type} ${j.table}`;
                    if (j.condition && j.condition != "") {
                        str += ` ON ${j.condition}`;
                    }
                    query = query.joinRaw(str);
                }
                else if (typeof j === "string") {
                    query = query.joinRaw(j);
                }
            }
        }
        const where = this.dataView.where;
        if (!utils_1.Utils.isEmpty(where)) {
            query = query.whereRaw(where);
        }
        if (!utils_1.Utils.isEmpty(this.dataView.groupBy)) {
            query = query.groupBy(this.dataView.groupBy);
        }
        if (!utils_1.Utils.isEmpty(this.dataView.having)) {
            query = query.havingRaw(this.dataView.having);
        }
        if (!utils_1.Utils.isEmpty(this.dataView.orderBy)) {
            query = query.orderByRaw(this.dataView.orderBy);
        }
        if (this.dataView.offset) {
            query = query.offset(this.dataView.offset);
        }
        if (this.dataView.limit) {
            query = query.limit(this.dataView.limit);
        }
        // console.log(`\x1b[34mGET SQL\x1b[39m ${query.toQuery()}`);
        return new Promise((resolve, reject) => {
            query.asCallback((err, result) => {
                if (!utils_1.Utils.isEmpty(err)) {
                    reject(err);
                }
                else {
                    resolve(result);
                }
            });
        });
    }
    // Insert
    execPostCommand(db) {
        let query;
        if (Array.isArray(this.dataView.values)) {
            query = db.batchInsert(`${this.dataView.dbName}.${this.dataView.tableName}`, this.dataView.values, 30);
            if (!utils_1.Utils.isEmpty(this.dataView.primaryKey)) {
                query = query.returning(this.dataView.primaryKey.name);
            }
        }
        else {
            query = db(this.dataView.tableName).withSchema(this.dataView.dbName);
            if (!utils_1.Utils.isEmpty(this.dataView.primaryKey)) {
                query = query.returning(this.dataView.primaryKey.name);
            }
            query.insert(this.dataView.values);
        }
        return new Promise((resolve, reject) => {
            query.asCallback((err, result) => {
                if (!utils_1.Utils.isEmpty(err)) {
                    reject(err);
                }
                else {
                    resolve(result);
                }
            });
        });
    }
    // Update
    execPatchCommand(db) {
        let query = db(this.dataView.tableName).withSchema(this.dataView.dbName);
        const where = this.dataView.where;
        if (!utils_1.Utils.isEmpty(where)) {
            query = query.whereRaw(where);
        }
        return new Promise((resolve, reject) => {
            query.update(this.dataView.values).asCallback((err, result) => {
                if (!utils_1.Utils.isEmpty(err)) {
                    reject(err);
                }
                else {
                    resolve(result);
                }
            });
        });
    }
    // Insert / Update
    execPutCommand(db) {
        const where = this.dataView.where;
        if (utils_1.Utils.isEmpty(where)) {
            return this.execPostCommand(db);
        }
        else {
            return new Promise((resolve, reject) => {
                this.execPatchCommand(db)
                    .then((result) => {
                    if (result > 0) {
                        return resolve(result);
                    }
                    else {
                        return this.execPostCommand(db);
                    }
                })
                    .then((result) => {
                    resolve(result);
                })
                    .catch((err) => {
                    reject(err);
                });
            });
        }
    }
    // Delete
    execDeleteCommand(db) {
        let query = db(this.dataView.tableName).withSchema(this.dataView.dbName);
        const where = this.dataView.where;
        if (!utils_1.Utils.isEmpty(where)) {
            query = query.whereRaw(where);
        }
        return new Promise((resolve, reject) => {
            query.del().asCallback((err, result) => {
                if (!utils_1.Utils.isEmpty(err)) {
                    reject(err);
                }
                else {
                    resolve(result);
                }
            });
        });
    }
}
exports.Commands = Commands;
class OptionsCommand {
    constructor(settings, schema) {
        this.typesGroup = {
            "numeric": ["tinyint", "smallint", "mediumint", "int", "bigint", "decimal", "float", "double", "real", "bit", "boolean", "serial"],
            "date": ["date", "datetime", "timestamp", "time", "year"],
            "string": ["char", "varchar", "tinytext", "text", "mediumtext", "longtext", "binary", "varbinary", "tinyblob", "mediumblob", "blob", "longblob", "enum", "set"],
            "spatial": ["geometry", "point", "linestring", "polygon", "multipoint", "multilinestring", "multipolygon", "geometrycollection"],
            "json": ["json"]
        };
        this.settings = settings;
        this.schema = schema;
        this.optionData = this.build();
    }
    findType(dataType) {
        for (const k in this.typesGroup) {
            if (!!~this.typesGroup[k].indexOf(dataType.toLowerCase())) {
                return k;
            }
        }
        return dataType.toLowerCase();
    }
    build() {
        const optRes = {
            title: `RestAPI for '${this.settings.maindb}'`
        };
        const settingData = {};
        for (const i in this.settings) {
            if (i != "connection") {
                settingData[i] = this.settings[i];
            }
        }
        optRes.settings = settingData;
        const routes = {};
        const types = {};
        for (const name in this.schema[this.settings.maindb]) {
            const table = this.schema[this.settings.maindb][name];
            const properties = {};
            for (const cIdx in table.columns) {
                const col = table.columns[cIdx];
                properties[col.name] = {
                    required: col.nullable == "NO",
                    type: this.findType(col.dataType),
                    format: col.dataType,
                    extra: col.extra
                };
                if (col.maxLength) {
                    properties[col.name].maxLength = col.maxLength;
                }
            }
            types[name] = {
                type: "object",
                displayName: table.name,
                description: table.comment,
                properties: properties
            };
            const queryParameters = {
                "filter": {
                    "type": "(field,sign,value)",
                    "example": `${name}?columns=col1,eq,aaa`
                },
                "columns": {
                    "type": "string",
                    "example": `${name}?filter=col1,col2,col3`
                },
                "distinct": {
                    "type": "boolean",
                    "default": false,
                    "example": `${name}?distinct=true`
                },
                "exclude": {
                    "type": "string",
                    "example": `${name}?exclude=col1,col2,col3`
                },
                "order": {
                    "type": "(field,asc/desc)",
                    "example": `${name}?order=id,desc`
                },
                "page": {
                    "type": "number | [number,number]",
                    "example": [`${name}?page=0`, `${name}?page=0,10`]
                },
                "start": {
                    "type": "number",
                    "example": `${name}?start=10`
                },
                "length": {
                    "type": "number",
                    "example": `${name}?length=10`
                },
                "join": {
                    "type": "(joinType,table,field,sign,field)",
                    "example": `${name}?group=id`
                },
                "group": {
                    "type": "string",
                    "example": `${name}?group=id`
                },
                "having": {
                    "type": "(field,sign,value)",
                    "example": `${name}?having=id,eq,1`
                }
            };
            routes[`/${name}`] = {
                "get": {
                    "description": `Return the ${name} entities.`,
                    "queryParameters": queryParameters,
                    "responses": {
                        "200": {
                            "body": {
                                "application/json": {
                                    "type": `${name}[]`
                                }
                            }
                        }
                    }
                },
                "post": {
                    "description": `Insert the ${name} entities.`,
                    "body": {
                        "type": `${name} | ${name}[]`
                    },
                    "responses": {
                        "200": {
                            "body": {
                                "type": `number | number[]`,
                                "description": "inserted id(s)"
                            }
                        }
                    }
                },
                "put": {
                    "description": `Save the ${name} entities.`,
                    "body": {
                        "type": `${name} | ${name}[]`
                    },
                    "responses": {
                        "200": {
                            "body": {
                                "type": `number | number[]`,
                                "description": "number of affected rows"
                            }
                        }
                    }
                }
            };
            if (table.primary) {
                routes[`/${name}`][`/\{${table.primary}\}`] = {
                    "get": {
                        "description": `Get the ${name} entity with ${table.primary}.`,
                        "queryParameters": queryParameters,
                        "responses": {
                            "200": {
                                "body": {
                                    "application/json": {
                                        "type": `${name}`
                                    }
                                }
                            }
                        }
                    },
                    "patch": {
                        "description": `Update the ${name} entity with ${table.primary}.`,
                        "body": { "type": name },
                        "responses": {
                            "200": {
                                "body": {
                                    "type": `number | number[]`,
                                    "description": "number of affected rows"
                                }
                            }
                        }
                    },
                    "delete": {
                        "description": `Delete the ${name} entity with ${table.primary}.`,
                        "responses": {
                            "200": {
                                "body": {
                                    "type": `number | number[]`,
                                    "description": "number of affected rows"
                                }
                            }
                        }
                    }
                };
            }
        }
        optRes.types = types;
        return utils_1.Utils.mixin(optRes, routes);
    }
    valueOf() {
        return this.optionData;
    }
}
exports.OptionsCommand = OptionsCommand;
//# sourceMappingURL=commands.js.map