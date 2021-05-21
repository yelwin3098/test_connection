"use strict";
/**
 * REST API Splitter class
 */
Object.defineProperty(exports, "__esModule", { value: true });
class Splitter {
    constructor(options = {}) {
        if (typeof options === "string" || Array.isArray(options)) {
            options = { brackets: options };
        }
        this.delimiter = options.delimiter;
        this.brackets = options.brackets ? (Array.isArray(options.brackets) ? options.brackets : [options.brackets]) : ["''", "{}", "[]", "()"];
        this.escape = options.escape || "___";
    }
    flatten(arr) {
        let result = "";
        for (const i in arr) {
            if (Array.isArray(arr[i])) {
                result += this.flatten(arr[i]);
            }
            else {
                result += arr[i];
            }
        }
        return result;
    }
    // transform references to tree
    nest(str, refs) {
        const re = new RegExp(`\\${this.escape}([0-9]+)`);
        const res = [];
        let match;
        let a = 0;
        while (match = re.exec(str)) {
            if (a++ > 10e3) {
                throw Error("Circular references in parenthesis");
            }
            res.push(str.slice(0, match.index));
            res.push(this.nest(refs[match[1]], refs));
            str = str.slice(match.index + match[0].length);
        }
        res.push(str);
        return res;
    }
    split(res) {
        const d = [];
        let isInner = false;
        for (let i = 0; i < res.length; i++) {
            const s = res[i];
            if (Array.isArray(s)) {
                const flated = `${d[d.length - 1]}` + this.flatten(s);
                d[d.length - 1] = flated;
                isInner = true;
            }
            else {
                const arr = s.split(this.delimiter);
                for (const a in arr) {
                    if (isInner) {
                        const flated = `${d[d.length - 1]}${arr[a]}`;
                        d[d.length - 1] = flated;
                        isInner = false;
                    }
                    else {
                        d.push(arr[a]);
                    }
                }
            }
        }
        return d;
    }
    parse(str) {
        // pretend non-string parsed per-se
        let res = [str];
        this.brackets.forEach((bracket) => {
            // create parenthesis regex
            const pRE = new RegExp(["\\", bracket[0], "[^\\", bracket[0], "\\", bracket[1], "]*\\", bracket[1]].join(""));
            let ids = [];
            const replaceToken = (token, idx, str) => {
                // save token to res
                const refId = res.push(token.slice(bracket[0].length, -bracket[1].length)) - 1;
                ids.push(refId);
                return `${this.escape}${refId}`;
            };
            res.forEach((str, i) => {
                let prevStr;
                // replace paren tokens till there’s none
                let a = 0;
                while (str != prevStr) {
                    prevStr = str;
                    str = str.replace(pRE, replaceToken);
                    if (a++ > 10e3) {
                        throw Error("References have circular dependency. Please, check them.");
                    }
                }
                res[i] = str;
            });
            // wrap found refs to brackets
            ids = ids.reverse();
            res = res.map((str) => {
                ids.forEach((id) => {
                    str = str.replace(new RegExp(`(\\${this.escape}${id}(?![0-9]))`, "g"), `${bracket[0]}$1${bracket[1]}`);
                });
                return str;
            });
        });
        res = this.nest(res[0], res);
        if (this.delimiter) {
            res = this.split(res);
        }
        return res;
    }
}
exports.Splitter = Splitter;
//# sourceMappingURL=splitter.js.map