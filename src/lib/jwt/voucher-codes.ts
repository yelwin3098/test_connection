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
export function charset(name: string): string {
  const charsets: any = {
    numbers: "0123456789",
    alphabetic: "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ",
    alphanumeric: "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"
  };
  return charsets[name];
}

function repeat(str: string, count: number): string {
  let res = "";
  for (let i = 0; i < count; i++) {
    res += str;
  }
  return res;
}

class Config {
  public count: number;
  public length: number;
  public charset: string;
  public prefix: string;
  public postfix: string;
  public pattern: string;

  constructor(config: any) {
    this.count = config.count || 1;
    this.length = config.length || 8;
    this.charset = config.charset || charset("alphanumeric");
    this.prefix = config.prefix || "";
    this.postfix = config.postfix || "";
    this.pattern = config.pattern || repeat("#", this.length);
  }
}

class VoucherCodes {
  constructor() {}

  private randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private randomElem(arr: string): string {
    return arr[this.randomInt(0, arr.length - 1)];
  }

  private generateOne(config: Config): string {
    const code = config.pattern.split("").map((char) => {
      if (char === "#") {
        return this.randomElem(config.charset);
      } else {
        return char;
      }
    }).join("");
    return config.prefix + code + config.postfix;
  }

  private isFeasible(charset: string, pattern: string, count: number): boolean {
    return Math.pow(charset.length, (pattern.match(/#/g) || []).length) >= count;
  }

  public charset(name: string): string {
    return charset(name);
  }

  public generate(options: any = {}) {
    const config = new Config(options);
    let count = config.count;
    if (!this.isFeasible(config.charset, config.pattern, config.count)) {
      throw new Error("Not possible to generate requested number of codes.");
    }

    const codes: any = {};
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

export default new VoucherCodes();