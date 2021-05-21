/**
 * Credentials class
 */
import path from "path";
import fs from "fs";
import * as crypto from "crypto";
import * as uuid from "uuid";
import voucherCode from "./voucher-codes";

export class Credentials {
  private filePath?: string;
  private credentials: any[];

  constructor(rootPath: string, fileOrObj: string|any[]) {
    if (typeof fileOrObj == "string") {
      this.filePath = path.join(rootPath, `${fileOrObj}`);
      this.loadCredentials();
      this.watchFile();

    } else {
      this.credentials = fileOrObj;
    }
  }

  private loadCredentials() {
    const json = fs.readFileSync(this.filePath, "utf8");
    this.credentials = JSON.parse(json);
  }

  private watchFile() {
    const self = this;
    fs.watchFile(this.filePath, (curr: fs.Stats, prev: fs.Stats) => {
      if (curr.mtime != prev.mtime) {
        setTimeout(() => {
          self.loadCredentials();
        }, 1000);
      }
    });
  }

  public createHmac(secret: string, str: string): string {
    return crypto.createHmac("sha256", secret)
      .update(str)
      .digest("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");
  }

  public generateCode(length: number, count: number = 1): string|string[] {
    const codes = voucherCode.generate({
      length: length,
      count: count,
      charset: voucherCode.charset("alphanumeric")
    });
    if (count == 1) {
      return codes[0];
    }
    return codes;
  }

  public generate(consumerKey: string, save: boolean = true): any {
    const secret: string = this.generateCode(16) as string;

    const keyId = this.createHmac(secret, consumerKey);

    const credential = {
      id: uuid.v4(),
      consumerKey: consumerKey,
      keyId: keyId,
      keySecret: secret,
      isActive: true
    };

    if (save) {
      this.credentials.push(credential);

      if (fs.existsSync(`${this.filePath}`)) {
        const data = JSON.stringify(this.credentials);

        fs.writeFile(this.filePath, data, "utf8", (err) => {
          if (typeof err == "object") {
            // console.log("generate credentials (cretentaila.ts) >>> ", err);
          }
        });
      }
    }

    return credential;
  }

  public findCredential(filter: { id?: string; consumerKey?: string; secret?: string; }): any {
    // console.log("filter parameter in findCredentail (credentials.ts) >>> ", filter);
    let result: any[];
    if (filter.id) {
      result = this.credentials.filter((value) => {
        return value.id == filter.id;
      });
    } else if (filter.consumerKey && filter.secret) {
      const keyId = this.createHmac(filter.secret, filter.consumerKey);
      // console.log("keyId in findCredential (credential.ts) >>> ", keyId);
      result = this.credentials.filter((value) => {
        return value.consumerKey == filter.consumerKey && value.keyId == keyId && value.keySecret == filter.secret;
      });
    }

    // console.log("result in findCredential (credential.ts) >>> ", result);
    // console.log("result[0] in findCredential (credential.ts) >>> ", result[0]);

    if (result && result.length) {
      return result[0];
    }

    return undefined;
  }
}