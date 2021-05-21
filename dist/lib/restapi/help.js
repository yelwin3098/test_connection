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
 * REST API Help and Readme
 */
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const accepts_1 = require("./lib/accepts");
class Help {
    constructor() { }
    static templateEngine(html, options) {
        const evaluate = /<%([^%>]+)?%>/g;
        const codeBlock = /(^( )?(if|for|else|switch|case|break|{|}))(.*)?/g;
        let code = "var r=[];\n";
        let cursor = 0;
        let match;
        const add = (line, js = false) => {
            if (js) {
                code += line.match(codeBlock) ? `${line}\n` : `r.push(${line});\n`;
            }
            else {
                code += line != "" ? `r.push("${line.replace(/"/g, '\\"')}");\n` : "";
            }
            return add;
        };
        while (match = evaluate.exec(html)) {
            add(html.slice(cursor, match.index))(match[1], true);
            cursor = match.index + match[0].length;
        }
        add(html.substr(cursor, html.length - cursor));
        code += "return r.join(\"\");";
        code = code.replace(/[\r\t\n]/g, "");
        return new Function(code).apply(options);
    }
    static renderReadMe(basedir) {
        return (req, res, next) => {
            const filePath = path.join(basedir, "readme.html");
            if (fs.existsSync(filePath)) {
                const stat = fs.statSync(filePath);
                const file = fs.createReadStream(filePath);
                const header = {
                    "Content-Length": stat.size,
                    "Content-Type": "text/html"
                };
                res.writeHead(200, header);
                file.pipe(res);
                file.on("close", () => {
                    res.end(0);
                });
            }
            else {
                next(new Error("File not found."));
            }
        };
    }
    static schemaRenderable(schema) {
        const d = [];
        for (const db in schema) {
            const dbObj = {
                "Database": db,
                "Tables": []
            };
            for (const table in schema[db]) {
                const t = schema[db][table];
                const primarykey = t.primary;
                const tableObj = {
                    "Table": t.name,
                    "Comment": t.comment,
                    "Columns": []
                };
                for (const c in t.columns) {
                    const col = t.columns[c];
                    let type = col.dataType;
                    if (col.maxLength && type != "text") {
                        type += `(${col.maxLength})`;
                    }
                    tableObj.Columns.push({
                        "Field": col.name,
                        "Type": type,
                        "Key": (col.name == primarykey) ? "PRI" : "",
                        "Null": col.nullable,
                        "Default": col.defaultValue,
                        "Extra": col.extra,
                        "Comment": ""
                    });
                }
                if (primarykey) {
                    tableObj.Indexes = [];
                    tableObj.Indexes.push({
                        "Key": "Primary",
                        "Column": primarykey,
                        "Comment": ""
                    });
                }
                dbObj.Tables.push(tableObj);
            }
            d.push(dbObj);
        }
        return d;
    }
    static renderSchema(schema) {
        return (req, res, next) => {
            const accept = new accepts_1.Accepts(req);
            const type = accept.type("html", "json", "text");
            if (type == "text") {
                const json = Help.schemaRenderable(schema);
                const text = JSON.stringify(json);
                res.writeHead(200, {
                    "Content-Type": "text/plain"
                });
                res.write(text);
                res.end(0);
            }
            else if (type == "json") {
                const json = JSON.stringify(schema);
                res.writeHead(200, {
                    "Content-Type": "application/json"
                });
                res.write(json);
                res.end(0);
            }
            else {
                const json = Help.schemaRenderable(schema);
                let data = "";
                for (const i in json) {
                    const database = json[i].Database;
                    const result = json[i].Tables;
                    let tableData = "";
                    for (const j in result) {
                        tableData += Help.templateEngine(Help.TABLE_TEMPLETE.join(""), result[j]);
                    }
                    data += Help.templateEngine(Help.DATABASE_TEMPLETE.join(""), { "Database": database, "data": tableData });
                }
                const html = Help.templateEngine(Help.HTML_TEMPLETE.join(""), { data: data });
                res.writeHead(200, {
                    "Content-Type": "text/html"
                });
                res.write(html);
                res.end(0);
            }
        };
    }
}
Help.HTML_TEMPLETE = [
    "<!DOCTYPE html>",
    "<html>",
    "<head>",
    "<meta charset=utf-8>",
    "<meta content='IE=edge' http-equiv=X-UA-Compatible>",
    "<meta content='width=device-width,initial-scale=1' name='viewport'>",
    "<title>Data Schema</title>",
    "<style type='text/css'>",
    ".container { width: 934px; margin: auto; padding: 8px 16px; overflow-x: auto; }",
    ".pagetitle { display: block; width: 100%; border: 1px solid #ccc; margin-bottom: 16px; border-radius: 8px; }",
    ".pagetitle h2 { font-weight: bold; font-size: 14pt; padding: 0px 0px; text-align: center; }",
    ".table-content { margin-top: 16px; }",
    ".header { display: block; width: 100%; height: 16px; font-weight: bold; color: #fff; background: #337ab7; border-bottom: 1px solid #ccc; border-radius: 8px 8px 0 0; text-align: center; padding: 6px 0; cursor: pointer; }",
    "input[type=checkbox].toggle { display: none; }",
    "input[type=checkbox].toggle + table { display: none; }",
    "input[type=checkbox].toggle:checked + table { display: table; }",
    "table { width: 100%; }",
    "td { padding: 4px 8px; }",
    "td { border-right: 1px solid #ccc; border-bottom: 1px solid #ccc; }",
    "td:first-child { border-left: 1px solid #ccc; }",
    "td.subhead { background: #e7e7e7; }",
    "td.subtitle { background: #f0f0f0; font-size: 9pt; }",
    "tr td.subhead:first-child { font-weight: 600; }",
    "</style>",
    "</head>",
    "<body>",
    "<div class='container'>",
    "<% this.data %>",
    "</div>",
    "</body>",
    "</html>"
];
Help.DATABASE_TEMPLETE = [
    "<div class='row'>",
    "<div class='pagetitle'><h2><% this.Database %> - Tables Structure</h2></div>",
    "<% this.data %>",
    "</div>",
];
Help.TABLE_TEMPLETE = [
    "<div id=\"table-<% this.Table %>\" class=\"table-content\">",
    "<label class=\"header\" for=\"<% this.Table %>-toggle\"><% this.Table %></label>",
    "<input id=\"<% this.Table %>-toggle\" class=\"toggle\" type=\"checkbox\" checked />",
    "<table cellspacing=\"0\" cellpadding=\"0\">",
    "<tbody>",
    "<tr>",
    "<td colspan=\"7\" class=\"subhead\">Columns</td>",
    "</tr>",
    "<tr>",
    "<td class=\"subtitle\">Name</td>",
    "<td class=\"subtitle\">Type</td>",
    "<td class=\"subtitle\">Null</td>",
    "<td class=\"subtitle\">Key</td>",
    "<td class=\"subtitle\">Default</td>",
    "<td class=\"subtitle\">Extra</td>",
    "<td class=\"subtitle\">Comment</td>",
    "</tr>",
    "<% for(var c in this.Columns) { %>",
    "<tr>",
    "<td><% this.Columns[c].Field %></td>",
    "<td><% this.Columns[c].Type %></td>",
    "<td><% this.Columns[c].Null %></td>",
    "<td><% this.Columns[c].Key %></td>",
    "<td><% this.Columns[c].Default %></td>",
    "<td><% this.Columns[c].Extra %></td>",
    "<td><% this.Columns[c].Comment %></td>",
    "</tr>",
    "<% } %>",
    "<tr>",
    "<td colspan=\"7\" class=\"subhead\">Indexes</td>",
    "</tr>",
    "<tr>",
    "<td colspan=\"2\" class=\"subtitle\">Key</td>",
    "<td colspan=\"2\" class=\"subtitle\">Column</td>",
    "<td colspan=\"3\" class=\"subtitle\">Comment</td>",
    "</tr>",
    "<% for(var i in this.Indexes) { %>",
    "<tr>",
    "<td colspan=\"2\"><% this.Indexes[i].Key %></td>",
    "<td colspan=\"2\"><% this.Indexes[i].Column %></td>",
    "<td colspan=\"3\"><% this.Indexes[i].Comment %></td>",
    "</tr>",
    "<% } %>",
    "<tr>",
    "<td colspan=\"2\" class=\"subhead\">Comments</td>",
    "<td colspan=\"5\" class=\"subhead\"><% this.Comment %></td>",
    "</tr>",
    "</tbody>",
    "</table>",
    "</div>"
];
exports.Help = Help;
//# sourceMappingURL=help.js.map