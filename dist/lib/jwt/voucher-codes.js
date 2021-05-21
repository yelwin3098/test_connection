"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Copyright 2015 rspective (http://rspective.com)
 * All rights reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * https://github.com/voucherifyio/voucher-code-generator-js
 */
/*
voucherCodes.generate({
    length: 6,
    count: 3,
    charset: "0123456789"
});
*/
function charset(name) {
    const charsets = {
        numbers: "0123456789",
        alphabetic: "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ",
        alphanumeric: "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"
    };
    return charsets[name];
}
exports.charset = charset;
function repeat(str, count) {
    let res = "";
    for (let i = 0; i < count; i++) {
        res += str;
    }
    return res;
}
class Config {
    constructor(config) {
        this.count = config.count || 1;
        this.length = config.length || 8;
        this.charset = config.charset || charset("alphanumeric");
        this.prefix = config.prefix || "";
        this.postfix = config.postfix || "";
        this.pattern = config.pattern || repeat("#", this.length);
    }
}
class VoucherCodes {
    constructor() { }
    randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
    randomElem(arr) {
        return arr[this.randomInt(0, arr.length - 1)];
    }
    generateOne(config) {
        const code = config.pattern.split("").map((char) => {
            if (char === "#") {
                return this.randomElem(config.charset);
            }
            else {
                return char;
            }
        }).join("");
        return config.prefix + code + config.postfix;
    }
    isFeasible(charset, pattern, count) {
        return Math.pow(charset.length, (pattern.match(/#/g) || []).length) >= count;
    }
    charset(name) {
        return charset(name);
    }
    generate(options = {}) {
        const config = new Config(options);
        let count = config.count;
        if (!this.isFeasible(config.charset, config.pattern, config.count)) {
            throw new Error("Not possible to generate requested number of codes.");
        }
        const codes = {};
        while (count > 0) {
            const code = this.generateOne(config);
            if (codes[code] === undefined) {
                codes[code] = true;
                count--;
            }
        }
        return Object.keys(codes);
    }
}
exports.default = new VoucherCodes();
//# sourceMappingURL=voucher-codes.js.map