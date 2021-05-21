/**
 * Jwt
 */
import path from "path";
import fs from "fs";
import http from "http";
import urlModule from "url";
import queryString from "querystring";
import { HttpError } from "./httperror";
import * as jwt from "./jwt";
import * as urlHandler from "./urlhandler";
import * as credential from "./credentials";

// `consumerId`
// DEBUG: keytool -exportcert -alias androiddebugkey -keystore ~/.android/debug.keystore | openssl sha1 -binary | openssl base64
// RELESE: keytool -exportcert -alias <RELEASE_KEY_ALIAS> -keystore <RELEASE_KEY_PATH> | openssl sha1 -binary | openssl base64
//
// generateSecret: generate

const DEFAULT_NAME = "Json Web Token";

const CREDENTIALS_REGEXP = /^ *(?:[Bb][Aa][Ss][Ii][Cc]) +([A-Za-z0-9._~+/-]+=*) *$/;
const USER_PASS_REGEXP = /^([^:]*):(.*)$/;

export interface Pattern {
  pattern: string;
}

export interface Config {
  readonly secretKey: string;
  readonly secureSecret: string;
  readonly algorithm?: string;
  readonly expiresIn?: string;
  readonly ignoreUrls?: [string|Pattern];
  readonly checkUrls?: [string|Pattern];
  readonly tokenUrl?: string;

  readonly credentialsFile?: string;
  readonly credentials: [jwt.JwtCredential];
}

interface BaiscAuthCredential {
  key: string;
  secret: string;
}

function getRootPath() {
  if (process.env.APP_ROOT_PATH) {
    return process.env.APP_ROOT_PATH;
  }
  const getRoot = function(dir: string): string {
    try {
      const isPkgJson = fs.accessSync(path.join(dir, "./package.json"));
      const is_node_modules = fs.accessSync(path.join(dir, "./node_modules"));
    } catch (e) {
      if (dir === "/") {
        throw new Error("Project root (package.json & node_modules location)");
      }
      return getRoot(path.join(dir, ".."));
    }
    return dir;
  };

  return getRoot(__dirname);
}

export class JwtAuth {
  private jwtInstance: jwt.Jwt;
  private credentials: credential.Credentials;
  private ignoreUrls?: [string|Pattern];
  private checkUrls?: [string|Pattern];
  private tokenUrl: string;
  private handler: urlHandler.UrlHandler;

  constructor(config: Config) {
    const rootPath = getRootPath();

    const algorithm = config.algorithm || "HS256";
    const expiresIn = config.expiresIn || "1h";

    this.ignoreUrls = config.ignoreUrls;
    this.checkUrls = config.checkUrls;

    if (config.credentialsFile) {
      this.credentials = new credential.Credentials(rootPath, config.credentialsFile);
    } else {
      this.credentials = new credential.Credentials(rootPath, config.credentials);
    }
    this.tokenUrl = config.tokenUrl || "/jwt/token";

    const findCredential = (id: string) => {
      return this.credentials.findCredential({ id: id });
    };

    const jwtConfig = {
      secretOrPrivateKey: config.secretKey,
      secretOrPublicKey: config.secretKey,
      secureSecret: config.secureSecret,
      checkCredentialExistence: true,

      credentials: config.credentials || findCredential,

      signOptions: {
        algorithm: algorithm,
        expiresIn: expiresIn
      },
      verifyOptions: {
        algorithms: [algorithm]
      }
    };

    this.jwtInstance = new jwt.Jwt(rootPath, jwtConfig);


    this.handler = new urlHandler.UrlHandler();
    this.handler.get(`${this.tokenUrl}/secret`, this.generateSecret());
    this.handler.get(`${this.tokenUrl}/credential`, this.generateCredential());
    this.handler.get(`${this.tokenUrl}`, this.generateToken());
  }

  public handle(): (req: http.IncomingMessage, res: http.ServerResponse, next: Function) => void {
    const self = this;

    return (req: http.IncomingMessage, res: http.ServerResponse, next: Function) => {
      (<any>req).jwtToken = (credentialId: string): Promise<string> => {
        const name: string = DEFAULT_NAME;
        return self.jwtInstance.generateToken(credentialId, name, false);
      };

      const url: string = req.url;
      self.handler.handle(req, res, (err?: any) => {
        if (typeof err == "object") {
          next(err);

        } else if (self.isIgnored(url)) {
          next();

        } else if (self.canCheck(url)) {
          self.verify()(req, res, next);

        } else {
          next();
        }
      });
    };
  }

  private isIgnored(url: string): boolean {
    if (this.ignoreUrls && this.ignoreUrls.length) {
      const parsed = urlModule.parse(url);
      const pathName = parsed.pathname;

      for (const i in this.ignoreUrls) {
        const ignore = this.ignoreUrls[i];
        if (typeof ignore == "string") {
          if (ignore == pathName) return true;

        } else if (typeof ignore == "object") {
          const ignoreObj: any = ignore;
          const regex = new RegExp(ignoreObj.pattern, "i");
          if (regex.test(pathName)) return true;
        }
      }
    }
    return false;
  }

  private canCheck(url: string): boolean {
    if (this.checkUrls && this.checkUrls.length) {
      const parsed = urlModule.parse(url);
      const pathName = parsed.pathname;

      for (const i in this.checkUrls) {
        const check = this.checkUrls[i];
        if (typeof check == "string") {
          if (check == pathName) return true;

        } else if (typeof check == "object") {
          const checkObj: any = check;
          const regex = new RegExp(checkObj.pattern, "i");
          if (regex.test(pathName)) return true;
        }
      }
      return false;
    }
    return true;
  }

  private decodeBase64(str: string) {
    return Buffer.from(str, "base64").toString();
  }

  private parseConsumer(req: http.IncomingMessage): BaiscAuthCredential {
    if (!req.headers || typeof req.headers !== "object") {
      throw new TypeError("argument req is required to have headers property");
    }
    const authorization = req.headers.authorization;
    const match = CREDENTIALS_REGEXP.exec(authorization);
    if (!match) {
      return undefined;
    }
    const userPass = USER_PASS_REGEXP.exec(this.decodeBase64(match[1]));
    if (!userPass) {
      return undefined;
    }

    return {
      key: userPass[1],
      secret: userPass[2]
    };
  }

  /**
   * Generate jwt token
   * GET /jwt/token
   *    headers [
   *        BasicAuth { username: ${consumerKey}, password: ${keySecret} }
   *    ]
   * Response { "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1NTJkOWVhMi1mMmE0LTQ2N2QtODA5YS01MTk3MmZlY2U1ZGEiLCJuYW1lIjoiSnNvbiBXZWIgVG9rZW4iLCJpYXQiOjQ5MzYxNCwiZXhwIjo0OTcyMTR9.o-OoZ7HYaKYHoN1rxvps8dxQcsHRBNXrCIDHf6uYDOU" }
   */
  private generateToken() {
    const self: JwtAuth = this;

    return (req: http.IncomingMessage, res: http.ServerResponse, next: Function) => {
      const consumer = self.parseConsumer(req);
      if (consumer) {
        const credentials = self.credentials.findCredential({ consumerKey: consumer.key, secret: consumer.secret });

        if (credentials) {
          const name: string = DEFAULT_NAME;
          const credentialId: string = credentials.id;
          self.jwtInstance.generateToken(credentialId, name)
            .then((result) => {
              self.response(res, undefined, { accessToken: result });
            })
            .catch((err) => {
              self.response(res, err);
            });

        } else {
          self.response(res, new HttpError(401, "Consumer not found"));
        }
      } else {
          self.response(res, new HttpError(401, "Invalid Consumer"));
      }
    };
  }

  /**
   * Generate random secret key
   * GET /jwt/token/secret
   * Response { "key":"Ht2T9Qm9Lr", "secret":"lBz_a30qLgHUDQhblA8k2bqLuP4ezZBwbqgce49qeZg" }
   */
  private generateSecret() {
    const self = this;
    const secret: string[] = this.credentials.generateCode(10, 3) as string[];
    const keySecret = this.credentials.createHmac(secret[0], secret.join(""));

    return (req: http.IncomingMessage, res: http.ServerResponse, next: Function) => {
      self.response(res, undefined, {
        key: secret[0],
        secret: keySecret
      });
    };
  }

  /**
   * Generate Credential object for config.credentials
   * GET /jwt/token/credential?secret=${secret|consumerId}
   * Response {"id":"552d9ea2-f2a4-467d-809a-51972fece5da","consumerKey":"lBz_a30qLgHUDQhblA8k2bqLuP4ezZBwbqgce49qeZg","keyId":"Jzr3KLWRpv_t5l9QgeiFezc08ZLNLuS_x3kWADBbikY","keySecret":"pDXSown7DtlOwmuK","isActive":true}
   */
  private generateCredential() {
    const self = this;
    return (req: http.IncomingMessage, res: http.ServerResponse, next: Function) => {
      const parsedUrl = urlModule.parse(req.url);
      const parsed = queryString.decode(parsedUrl.query);

      if (parsed) {
        const consumerKey = `${parsed["key"] || parsed["secret"] || parsed["consumer"]}`;
        if (consumerKey) {
          const credential = self.credentials.generate(consumerKey, true);
          self.response(res, undefined, credential);

        } else {
          self.response(res, new Error("Invalid key"));
        }

      } else {
        self.response(res, new Error("Invalid key"));
      }
    };
  }

  /**
   * Jwt verify
   * GET *
   *    headers [
   *      authorization "Bearer ${accessToken}"
   *    ]
   */
  private verify() {
    const self = this;
    return (req: http.IncomingMessage, res: http.ServerResponse, next: Function) => {
      self.jwtInstance.verifyHandle(req, (err?: any, result?: any) => {
        if (err) {
          self.response(res, err);
        } else if (result) {
          next();
        } else {
          self.response(res, new HttpError(401, "Unauthorized"));
        }
      });
    };
  }

  private response(res: http.ServerResponse, err?: any, data?: any) {
    if (err) {
      const code = err.code || err.status || 500;
      if (err instanceof Error) {
        data = {
          "error": {
            "code": code,
            "name": err.name,
            "message": err.message
          }
        };
      } else if (typeof err == "object") {
        data = { "error": err };
      } else {
        data = { "error": `${err}` };
      }
    }

    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.write(JSON.stringify(data));
    res.end();
  }
}