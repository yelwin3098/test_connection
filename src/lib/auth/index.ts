/**
 * Dashboard Router
 */
import * as pathModule from "path";
import * as fs from "fs";
import * as crypto from "crypto";
import { IncomingMessage, ServerResponse } from "http";

import { OAuth2 } from "./oauth2";
import { BasicAuth } from "./basic-auth";
import { Tokens, Csrf } from "./csrf";

function mixin(dest: any, src: any, redefine: boolean = true) {
  if (!dest) {
    throw new TypeError("argument dest is required");
  }
  if (!src) {
    throw new TypeError("argument src is required");
  }
  const hasOwnProperty = Object.prototype.hasOwnProperty;
  Object.getOwnPropertyNames(src).forEach((name) => {
    if (!redefine && hasOwnProperty.call(dest, name)) {
      return;
    }
    const descriptor = Object.getOwnPropertyDescriptor(src, name);
    Object.defineProperty(dest, name, descriptor);
  });
  return dest;
}

class AuthModel {
  private data: any;

  constructor() {
    this.data = this.load();
  }

  private get authFilePath() {
    return pathModule.join(__dirname, "../../data/system-account.json");
  }

  private load() {
    const filename = this.authFilePath;
    const fileData = fs.readFileSync(filename, "utf8");
    if (fileData && typeof fileData == "string") {
      return JSON.parse(fileData);
    }
    return false;
  }

  private md5(str: string) {
    return crypto.createHash("md5").update(str, "ascii").digest("hex").toUpperCase();
  }

  public getAccessToken(bearerToken: string) {
    if (this.data) {
      const tokens = this.data.tokens.filter((token: any) => {
        return token.accessToken == bearerToken;
      });

      return tokens.length ? tokens[0] : false;
    }
    return false;
  }

  public getRefreshToken(bearerToken: string) {
    if (this.data) {
      const tokens = this.data.tokens.filter((token: any) => {
        return token.refreshToken == bearerToken;
      });

      return tokens.length ? tokens[0] : false;
    }
    return false;
  }

  public getClient(clientId: string, clientSecret: string) {
    if (this.data) {
      const clients = this.data.clients.filter((client: any) => {
        return client.clientId == clientId && client.clientSecret == clientSecret;
      });

      return clients.length ? clients[0] : false;
    }
    return false;
  }

  public saveToken(token: any, client: any, user: any) {
    if (!this.data.tokens) {
      this.data.tokens = [];
    }
    const tokenData: any = {
      accessToken: token.accessToken,
      accessTokenExpiresAt: token.accessTokenExpiresAt,
      clientId: client.clientId,
      refreshToken: token.refreshToken,
      refreshTokenExpiresAt: token.refreshTokenExpiresAt,
      userId: user.id
    };
    this.data.tokens.push(tokenData);

    const filename = this.authFilePath;
    fs.writeFileSync(filename, JSON.stringify(this.data));

    token.client = {
      id: client.clientId
    };
    token.user = {
      id: user.username || user.clientId
    };
    return token;
  }

  public getUser(username: string, password: string) {
    if (this.data) {
      const pass = this.md5(`${password}`);
      const users = this.data.users.filter((user: any) => {
        return user.username == username && user.password == pass;
      });

      return users.length ? users[0] : false;
    }
    return false;
  }

  public getUserFromClient(client: any) {
    if (this.data) {
      const clients = this.data.clients.filter((client: any) => {
        return client.clientId == client.clientId && client.clientSecret == client.clientSecret;
      });

      return clients.length ? clients[0] : false;
    }
    return false;
  }
}

export class Auth {
  private model: AuthModel;
  private oauth2: OAuth2;
  private csrfTokens: Tokens;
  private csrf: Csrf;

  constructor(options: any = {}) {
    this.model = new AuthModel();
    this.csrfTokens = new Tokens();

    this.csrf = new Csrf(mixin({
      "sessionKey": "authCsrfSession"
    }, options, true));

    this.oauth2 = new OAuth2(mixin({ "model": this.model }, options, true));
  }

  public handle(type: string) {
    const self = this;
    return function(req: IncomingMessage, res: ServerResponse, next: Function) {
      const url: string = req.url;
      if (/^\/csrf\/secret/.test(url)) {
        self.csrfSecret(self, req, res, next);
      } else if (/^\/csrf\/token/.test(url)) {
        self.csrfToken(self, req, res, next);
      } else if (/^\/oauth2\/token/.test(url)) {
        self.oauth2Token(self, req, res, next);
      } else if (type == "basic") {
        self.basicHandle(self, req, res, next);
      } else if (type == "csrf") {
        self.csrf.handle(req, res, next);
      } else if (type == "oauth2") {
        self.oauth2Authenticate(self, req, res, next);
      } else {
        next();
      }
    };
  }

  private basicHandle(self: Auth, req: IncomingMessage, res: ServerResponse, next: Function) {
    const basic = new BasicAuth(req);
    const user = self.model.getUser(basic.name, basic.pass);
    if (user) {
      next();
    } else {
      res.writeHead(401, {
        "WWW-Authenticate": "Basic realm=\"Basic Authentication\"",
        "Content-Type": "application/json; charset=utf-8"
      });
      res.write(JSON.stringify({ "error": "Authorization is needed" }));
      res.end();
    }
  }

  private csrfSecret(self: Auth, req: IncomingMessage, res: ServerResponse, next: Function) {
    self.csrfTokens.secret()
      .then((result) => {
        self.response(res, undefined, { "secret": result });
      }).catch((err) => {
        self.response(res, err);
      });
  }

  private csrfToken(self: Auth, req: IncomingMessage, res: ServerResponse, next: Function) {
    const reqData: any = (<any>req).body || (<any>req).query;

    const secret: string = reqData.secret || reqData._secret ||
      (req.headers["csrf-secret"]) ||
      (req.headers["xsrf-secret"]) ||
      (req.headers["x-csrf-secret"]) ||
      (req.headers["x-xsrf-secret"]) || "";

    self.csrfTokens.create(secret)
      .then((result) => {
        self.response(res, undefined, { "secret": secret, "token": result });
      }).catch((err) => {
        self.response(res, err);
      });
  }

  private oauth2Token(self: Auth, req: IncomingMessage, res: ServerResponse, next: Function) {
    const token = self.oauth2.token(req, res);
    self.response(res, undefined, { "token": token });
  }

  private oauth2Authenticate(self: Auth, req: IncomingMessage, res: ServerResponse, next: Function) {
    try {
      const accessToken = self.oauth2.authenticate(req, res);
      (<any>req).token = accessToken;
      next();
    } catch (err) {
      self.response(res, err);
    }
  }

  private response(res: ServerResponse, err: any, data?: any) {
    if (err) {
      const code = err.code || err.status || 500;
      if (err instanceof Error) {
        data = {
          "error": {
            "code": code,
            "name": err.name,
            "message": err.message,
            "stack": err.stack
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