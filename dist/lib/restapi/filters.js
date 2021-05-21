"use strict";
/**
 * REST API filters parser
 */
Object.defineProperty(exports, "__esModule", { value: true });
const defaultSigns = {
    "or": function (sender, filter, quote) {
        return filter.replace(/\|or\|/gi, "|OR|");
    },
    "and": function (sender, filter, quote) {
        return filter.replace(/\|and\|/gi, "|AND|");
    },
    "cs": function (sender, filter, quote) {
        return filter.replace(/\|cs\|([^\|]+)\|/gi, (x, x1) => {
            const v = sender.getValue(x1, quote);
            return `|LIKE '%${sender.likeEscape(v)}%'|`;
        });
    },
    "sw": function (sender, filter, quote) {
        return filter.replace(/\|sw\|([^\|]+)\|/gi, (x, x1) => {
            const v = sender.getValue(x1, quote);
            return `|LIKE '${sender.likeEscape(v)}%'|`;
        });
    },
    "ew": function (sender, filter, quote) {
        return filter.replace(/\|ew\|([^\|]+)\|/gi, (x, x1) => {
            const v = sender.getValue(x1, quote);
            return `|LIKE '%${sender.likeEscape(v)}'|`;
        });
    },
    "eq": function (sender, filter, quote) {
        return filter.replace(/\|eq\|([^\|]+)\|/gi, (x, x1) => {
            const v = sender.getValue(x1, quote);
            return `|= ${v}|`;
        });
    },
    "lt": function (sender, filter, quote) {
        return filter.replace(/\|lt\|([^\|]+)\|/gi, (x, x1) => {
            const v = sender.getValue(x1, quote);
            return `|< ${v}|`;
        });
    },
    "le": function (sender, filter, quote) {
        return filter.replace(/\|le\|([^\|]+)\|/gi, (x, x1) => {
            const v = sender.getValue(x1, quote);
            return `|<= ${v}|`;
        });
    },
    "ge": function (sender, filter, quote) {
        return filter.replace(/\|ge\|([^\|]+)\|/gi, (x, x1) => {
            const v = sender.getValue(x1, quote);
            return `|>= ${v}|`;
        });
    },
    "gt": function (sender, filter, quote) {
        return filter.replace(/\|gt\|([^\|]+)\|/gi, (x, x1) => {
            const v = sender.getValue(x1, quote);
            return `|> ${v}|`;
        });
    },
    "bt": function (sender, filter, quote) {
        return filter.replace(/\|bt\|([^\|]+)\|([^\|]+)\|/gi, (x, x1, x2) => {
            const v1 = sender.getValue(x1, quote);
            const v2 = sender.getValue(x2, quote);
            return `|BETWEEN ${v1} AND ${v2}|`;
        });
    },
    "in": function (sender, filter, quote) {
        return filter.replace(/\|in\|([^\|]+)\|/gi, (x, x1) => {
            const v = sender.getValue(x1, quote);
            return `|IN (${v})|`;
        });
    },
    "is": function (sender, filter, quote) {
        return filter.replace(/\|is\|/gi, (x) => {
            return "|IS NULL|";
        });
    },
    "ncs": function (sender, filter, quote) {
        return filter.replace(/\|ncs\|([^\|]+)\|/gi, (x, x1) => {
            const v = sender.getValue(x1, quote);
            return `|NOT LIKE '%${sender.likeEscape(v)}%'|`;
        });
    },
    "nsw": function (sender, filter, quote) {
        return filter.replace(/\|nsw\|([^\|]+)\|/gi, (x, x1) => {
            const v = sender.getValue(x1, quote);
            return `|NOT LIKE '${sender.likeEscape(v)}%'|`;
        });
    },
    "new": function (sender, filter, quote) {
        return filter.replace(/\|new\|([^\|]+)\|/gi, (x, x1) => {
            const v = sender.getValue(x1, quote);
            return `|NOT LIKE '%${sender.likeEscape(v)}'|`;
        });
    },
    "neq": function (sender, filter, quote) {
        return filter.replace(/\|neq\|([^\|]+)\|/gi, (x, x1) => {
            const v = sender.getValue(x1, quote);
            return `|<> ${v}|`;
        });
    },
    "nlt": function (sender, filter, quote) {
        return filter.replace(/\|nlt\|([^\|]+)\|/gi, (x, x1) => {
            const v = sender.getValue(x1, quote);
            return `|>= ${v}|`;
        });
    },
    "nle": function (sender, filter, quote) {
        return filter.replace(/\|nle\|([^\|]+)\|/gi, (x, x1) => {
            const v = sender.getValue(x1, quote);
            return `|> ${v}|`;
        });
    },
    "nge": function (sender, filter, quote) {
        return filter.replace(/\|nge\|([^\|]+)\|/gi, (x, x1) => {
            const v = sender.getValue(x1, quote);
            return `|< ${v}|`;
        });
    },
    "ngt": function (sender, filter, quote) {
        return filter.replace(/\|ngt\|([^\|]+)\|/gi, (x, x1) => {
            const v = sender.getValue(x1, quote);
            return `|<= ${v}|`;
        });
    },
    "nbt": function (sender, filter, quote) {
        return filter.replace(/\|nbt\|([^\|]+)\|/gi, (x, x1) => {
            const v = sender.getValue(x1, quote);
            const val = v.split(",");
            return (val.length == 2) ? `|NOT BETWEEN ${val[0]} AND ${val[1]}|` : "|";
        });
    },
    "nin": function (sender, filter, quote) {
        return filter.replace(/\|nin\|([^\|]+)\|/gi, (x, x1) => {
            const v = sender.getValue(x1, quote);
            return `|NOT IN (${v})|`;
        });
    },
    "nis": function (sender, filter, quote) {
        return filter.replace(/\|nis\|/gi, (x) => {
            return "|IS NOT NULL|";
        });
    }
};
/**
 * Filters class
 */
class Filters {
    constructor(signs) {
        this.values = [];
        this.signs = {};
        this.signs = signs;
    }
    likeEscape(val) {
        return val.replace(/\'/g, "").replace(/([%_])/g, "\\$1");
    }
    getValue(key, quote = "'") {
        let val = key;
        if (key.startsWith("#")) {
            const idx = parseInt(key.substring(1));
            val = this.values[idx];
        }
        val = val.replace(/^\[([^\[\]]+)\]$/g, "$1");
        if (/^([^\.]+)\.([^\.]+)$/.test(val)) {
            return val;
        }
        else {
            let valArr = [];
            if (!!~val.indexOf(",")) {
                valArr = val.split(",");
            }
            else {
                valArr.push(val);
            }
            for (const i in valArr) {
                valArr[i] = valArr[i].replace(/\'/g, "");
                if (!/^[\d]+$/.test(valArr[i])) {
                    valArr[i] = quote + valArr[i] + quote;
                }
            }
            return valArr.join(",");
        }
    }
    convertFilter(filter, quote = "'") {
        this.values = [];
        filter = filter.trim();
        filter = filter.replace(/(\[[^\[\]]+\])/g, (x) => {
            this.values.push(x);
            return `#${this.values.length - 1}`;
        });
        filter = filter.replace(/(\'[^\']+\')/g, (x) => {
            this.values.push(x);
            return `#${this.values.length - 1}`;
        });
        filter = (`,${filter},`).replace(/([\(\)])/g, ",$1,")
            .replace(/[,]{2,}/g, ",")
            .replace(/[^a-zA-Z0-9\-_,.*#\(\)]/g, "")
            .replace(/,/g, "|");
        for (const i in this.signs) {
            filter = this.signs[i](this, filter, quote);
        }
        return filter.replace(/\|/g, " ").trim();
    }
}
exports.Filters = Filters;
const filters = {};
filters.mssql = class MsSQL extends Filters {
    constructor() { super(defaultSigns); }
};
filters.mysql = class MySQL extends Filters {
    constructor() { super(defaultSigns); }
};
filters.pg = class PostgresSQL extends Filters {
    constructor() { super(defaultSigns); }
};
filters.sqlite3 = class SQLite3 extends Filters {
    constructor() { super(defaultSigns); }
};
filters.oracledb = class Oracle extends Filters {
    constructor() { super(defaultSigns); }
};
exports.default = filters;
//# sourceMappingURL=filters.js.map