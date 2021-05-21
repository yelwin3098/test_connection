/**
 * OAuth2 Class
 * https://github.com/oauthjs/node-oauth2-server
 */
import * as crypto from "crypto";
import * as url from "url";
import { IncomingMessage, ServerResponse } from "http";

/**
 * InMemoryModel Class
 */
export class InMemoryModel {
  private clients: any[];
  private tokens: any[];
  private users: any[];

  constructor() {
    this.clients = [{ clientId : "thom", clientSecret : "nightworld", redirectUris : [""] }];
    this.users = [{ id : "123", username: "thomseddon", password: "nightworld" }];
    this.tokens = [];
  }

  /*
   * Get access token.
   */
  public getAccessToken(bearerToken: string) {
    const tokens = this.tokens.filter((token) => {
      return token.accessToken === bearerToken;
    });

    return tokens.length ? tokens[0] : false;
  }

  /**
   * Get refresh token.
   */
  public getRefreshToken(bearerToken: string) {
    const tokens = this.tokens.filter((token) => {
      return token.refreshToken === bearerToken;
    });

    return tokens.length ? tokens[0] : false;
  }

  /**
   * Get client.
   */
  public getClient(clientId: string, clientSecret: string) {
    const clients = this.clients.filter((client) => {
      return client.clientId === clientId && client.clientSecret === clientSecret;
    });

    return clients.length ? clients[0] : false;
  }

  /**
   * Save token.
   */
  public saveToken(token: any, client: any, user: any) {
    this.tokens.push({
      accessToken: token.accessToken,
      accessTokenExpiresAt: token.accessTokenExpiresAt,
      clientId: client.clientId,
      refreshToken: token.refreshToken,
      refreshTokenExpiresAt: token.refreshTokenExpiresAt,
      userId: user.id
    });
  }

  /**
   * Get user.
   */
  public getUser(username: string, password: string) {
    const users = this.users.filter((user) => {
      return user.username === username && user.password === password;
    });

    return users.length ? users[0] : false;
  }
}

/**
 * OAuth2Error Class
 */
export class OAuth2Error extends Error {
  public code: number;

  constructor(code: number, name: string, message: string) {
    super(message);
    this.code = code;
    this.name = name;
  }
}

/**
 * OAuth2 Class
 */
export class OAuth2 {
  private options: any = {};

  constructor(options: any = {}) {
    if (!options.model) {
      options.model = new InMemoryModel();
    }
    this.options = options;
  }

  private getAccessToken(req: IncomingMessage, res: ServerResponse, model: any) {
    let token: string;
    const headerToken = req.headers["authorization"] || req.headers["Authorization"];
    if (headerToken) {
      const matches = `${headerToken}`.match(/Bearer\s(\S+)/);
      if (matches) {
        token = matches[1];
      }
    }

    const request: any = req as any;
    if (!request.body) {
      request.body = {};
    }
    if (!request.query) {
      request.query = {};
    }

    token = token || request.query.access_token || request.body.access_token;
    if (!token || token == "") {
      res.setHeader("WWW-Authenticate", "Bearer realm=\"Service\"");
      throw new OAuth2Error(401, "unauthorized_request", "Unauthorized request: no authentication given");
    }

    const accessToken: any = model.getAccessToken(token);
    if (!(accessToken.accessTokenExpiresAt instanceof Date)) {
      throw new OAuth2Error(503, "server_error", "Server error: `accessTokenExpiresAt` must be a Date instance");
    }

    if (accessToken.accessTokenExpiresAt.valueOf() < (new Date()).valueOf()) {
      throw new OAuth2Error(401, "invalid_token", "Invalid token: access token has expired");
    }

    return accessToken;
  }

  /**
   * Authentication Middleware.
   *
   * Returns a middleware that will validate a token.
   *
   * (See: https://tools.ietf.org/html/rfc6749#section-7)
   */
  public authenticate(req: IncomingMessage, res: ServerResponse, options: any = {}): any {
    if (typeof options === "string") {
      options = { scope: options };
    }

    options = mixin({
      addAcceptedScopesHeader: true,
      addAuthorizedScopesHeader: true,
      allowBearerTokensInQueryString: false
    }, this.options, options);

    let scope: string;
    const accessToken: any = this.getAccessToken(req, res, options.model);

    if (options.scope) {
      scope = options.model.verifyScope(accessToken, options.scope);
      if (!scope) {
        throw new OAuth2Error(400, "invalid_scope", "Insufficient scope: authorized scope is insufficient");
      }
    }

    if (scope && this.options.addAcceptedScopesHeader) {
      res.setHeader("X-Accepted-OAuth-Scopes", scope);
    }

    if (scope && this.options.addAuthorizedScopesHeader) {
      res.setHeader("X-OAuth-Scopes", accessToken.scope);
    }

    return accessToken;
  }

  /**
   * Authorization Middleware.
   *
   * Returns a middleware that will authorize a client to request tokens.
   *
   * (See: https://tools.ietf.org/html/rfc6749#section-3.1)
   */
  public authorize(req: IncomingMessage, res: ServerResponse, options: any = {}): url.UrlWithParsedQuery {
    options = mixin({
      allowEmptyState: false,
      authorizationCodeLifetime: 5 * 60   // 5 minutes.
    }, this.options, options);

    const request: any = req as any;
    if (!request.body) {
      request.body = {};
    }
    if (!request.query) {
      request.query = {};
    }

    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + options.authorizationCodeLifetime);

    const clientId = request.body.client_id || request.query.client_id;
    const redirectUri = request.body.redirect_uri || request.query.redirect_uri;
    const client = options.model.getClient(clientId, undefined);
    if (!~client.redirectUris.indexOf(redirectUri)) {
      throw new OAuth2Error(400, "invalid_client", "Invalid client: `redirect_uri` does not match client value");
    }

    const accessToken: any = this.getAccessToken(req, res, options.model);
    const user = accessToken.user;
    const scope = request.body.scope || request.query.scope;

    let authorizationCode: any;
    if (options.model.generateAuthorizationCode) {
      authorizationCode = options.model.generateAuthorizationCode(client, user, scope);
    } else {
      const buf = crypto.randomBytes(256);
      authorizationCode = crypto.createHash("sha1").update(buf).digest("hex");
    }

    const state = request.body.state || request.query.state;
    if (!options.allowEmptyState && !state) {
      throw new OAuth2Error(500, "invalid_argument", "Missing parameter: `state`");
    }

    const responseType = request.body.response_type || request.query.response_type;
    if (!~["code"].indexOf(responseType)) {
      throw new OAuth2Error(400, "unsupported_response_type", "Unsupported response type: `response_type` is not supported");
    }

    const uri = url.parse(redirectUri, true);
    uri.query.code = authorizationCode;
    uri.search = undefined;

    if (state) {
      uri.query.state = state;
    }

    return uri;
  }

  /**
   * Grant Middleware.
   *
   * Returns middleware that will grant tokens to valid requests.
   *
   * (See: https://tools.ietf.org/html/rfc6749#section-3.2)
   */
  public token(req: IncomingMessage, res: ServerResponse, options: any = {}): any {
    options = mixin({
      accessTokenLifetime: 60 * 60,             // 1 hour.
      refreshTokenLifetime: 60 * 60 * 24 * 14,  // 2 weeks.
      allowExtendedTokenAttributes: false,
      requireClientAuthentication: {}           // defaults to true for all grant types
    }, this.options, options);

    const tokenType = new BearerToken(req, options);
    return tokenType.valueOf();
  }
}

function mixin(redefine: any, ...others: any[]): any {
  if (!others || others.length == 0) {
    throw new OAuth2Error(500, "invalid_argument", "Invalid argument: argument objects is required");
  }

  let dest: any = {};
  if (typeof redefine === "object") {
    dest = redefine;
    redefine = true;
  } else if (typeof redefine === "boolean") {
    dest = others.shift();
  }
  const hasOwnProperty = Object.prototype.hasOwnProperty;

  for (const i in others) {
    const src = others[i];
    Object.getOwnPropertyNames(src).forEach((name) => {
      if (!redefine && hasOwnProperty.call(dest, name)) {
        return;
      }
      const descriptor = Object.getOwnPropertyDescriptor(src, name);
      Object.defineProperty(dest, name, descriptor);
    });
  }
  return dest;
}

/**
 * GrantType Class
 */
class GrantType {
  private grantType: string;
  private accessTokenLifetime: number;
  private model: any;
  private refreshTokenLifetime: number;
  private alwaysIssueNewRefreshToken: boolean;

  constructor(options: any) {
    this.grantType = options.grantType;
    this.accessTokenLifetime = options.accessTokenLifetime;
    this.model = options.model;
    this.refreshTokenLifetime = options.refreshTokenLifetime;
    this.alwaysIssueNewRefreshToken = options.alwaysIssueNewRefreshToken;
  }

  public handle(request: any, client: any) {
    if (this.grantType == "authorization_code") {
      const code = this.getAuthorizationCode(request, client);
      return this.saveToken(code.user, client, code.scope, code.authorizationCode);

    } else if (this.grantType == "client_credentials") {
      const scope = this.getScope(request);
      const user = this.getUserFromClient(client);
      return this.saveToken(user, client, scope);

    } else if (this.grantType == "password") {
      const scope = this.getScope(request);
      const user = this.getUser(request);
      return this.saveToken(user, client, scope);

    } else if (this.grantType == "refresh_token") {
      const token = this.getRefreshToken(request, client);
      return this.saveToken(token.user, client, token.scope);

    } else {
      throw new OAuth2Error(400, "invalid_grant", "Invalid grant: grant type is invalid");
    }
  }

  private generateRandomToken() {
    const generateAttempts: number = 1;
    for (let i = 0; i < generateAttempts; i++) {
      const buf = crypto.randomBytes(256);
      return crypto.createHash("sha1").update(buf).digest("hex");
    }
  }

  private generateAccessToken(client: any, user: any, scope: any) {
    if (this.model.generateAccessToken) {
      return this.model.generateAccessToken(client, user, scope) || this.generateRandomToken();
    }
    return this.generateRandomToken();
  }

  private generateRefreshToken(client: any, user: any, scope: any) {
    if (this.model.generateRefreshToken) {
      return this.model.generateRefreshToken(client, user, scope) || this.generateRandomToken();
    }
    return this.generateRandomToken();
  }

  private getAccessTokenExpiresAt(...args: any[]) {
    const expires = new Date();
    expires.setSeconds(expires.getSeconds() + this.accessTokenLifetime);
    return expires;
  }

  private getRefreshTokenExpiresAt() {
    const expires = new Date();
    expires.setSeconds(expires.getSeconds() + this.refreshTokenLifetime);
    return expires;
  }

  private getAuthorizationCode(request: any, client: any) {
    if (!request.body) {
      throw new OAuth2Error(500, "invalid_argument", "Missing parameter: `body`");
    }
    if (!request.body.code) {
      throw new OAuth2Error(500, "invalid_argument", "Missing parameter: `code`");
    }
    const code = this.model.getAuthorizationCode(request.body.code);
    if (!code) {
      throw new OAuth2Error(400, "invalid_grant", "Invalid grant: authorization code is invalid");
    }
    if (code.expiresAt < new Date()) {
      throw new OAuth2Error(400, "invalid_grant", "Invalid grant: authorization code has expired");
    }

    if (!code.redirectUri) {
      return;
    }

    const redirectUri = request.body.redirect_uri || request.query.redirect_uri;
    if (redirectUri !== code.redirectUri) {
      throw new OAuth2Error(400, "invalid_request", "Invalid request: `redirect_uri` is invalid");
    }

    const status = this.model.revokeAuthorizationCode(code);
    if (!status) {
      throw new OAuth2Error(400, "invalid_grant", "Invalid grant: authorization code is invalid");
    }

    return code;
  }

  private getUserFromClient(client: any) {
    const user = this.model.getUserFromClient(client);
    if (!user) {
      throw new OAuth2Error(400, "invalid_grant", "Invalid grant: user credentials are invalid");
    }
    return user;
  }

  private getUser(request: any) {
    if (!request.body) {
      throw new OAuth2Error(500, "invalid_argument", "Missing parameter: `body`");
    }
    if (!request.body.username) {
      throw new OAuth2Error(500, "invalid_argument", "Missing parameter: `username`");
    }
    if (!request.body.password) {
      throw new OAuth2Error(500, "invalid_argument", "Missing parameter: `password`");
    }

    const user = this.model.getUser(request.body.username, request.body.password);
    if (!user) {
      throw new OAuth2Error(400, "invalid_grant", "Invalid grant: user credentials are invalid");
    }
    return user;
  }

  private getRefreshToken(request: any, client: any) {
    if (!request.body) {
      throw new OAuth2Error(500, "invalid_argument", "Missing parameter: `body`");
    }
    if (!request.body.refresh_token) {
      throw new OAuth2Error(500, "invalid_argument", "Missing parameter: `refresh_token`");
    }

    const token = this.model.getRefreshToken(request.body.refresh_token);
    if (!token) {
      throw new OAuth2Error(400, "invalid_grant", "Invalid grant: refresh token is invalid");
    }
    if (!token.client) {
      throw new OAuth2Error(500, "server_error", "Server error: `getRefreshToken()` did not return a `client` object");
    }
    if (!token.user) {
      throw new OAuth2Error(500, "server_error", "Server error: `getRefreshToken()` did not return a `user` object");
    }
    if (token.client.id !== client.id) {
      throw new OAuth2Error(400, "Invalid grant", "Invalid grant: refresh token is invalid");
    }
    if (token.refreshTokenExpiresAt && token.refreshTokenExpiresAt < new Date()) {
      throw new OAuth2Error(400, "invalid_grant", "Invalid grant: refresh token has expired");
    }

    return token;
  }

  private getScope(request: any) {
    if (!request.body) {
      throw new OAuth2Error(500, "invalid_argument", "Missing parameter: `body`");
    }
    return request.body.scope;
  }

  private validateScope(user: any, client: any, scope: any) {
    if (this.model.validateScope) {
      return this.model.validateScope(user, client, scope);
    }
    return scope;
  }

  /**
   * Save token.
   */
  public saveToken(user: any, client: any, scope: any, authorizationCode?: any) {
    let token: any = {};

    if (this.grantType == "authorization_code") {
      token = {
        accessToken: this.generateAccessToken(client, user, scope),
        authorizationCode: authorizationCode,
        accessTokenExpiresAt: this.getAccessTokenExpiresAt(),
        refreshToken: this.generateRefreshToken(client, user, scope),
        refreshTokenExpiresAt: this.getRefreshTokenExpiresAt(),
        scope: this.validateScope(user, client, scope)
      };

    } else if (this.grantType == "client_credentials") {
      token = {
        accessToken: this.generateAccessToken(client, user, scope),
        accessTokenExpiresAt: this.getAccessTokenExpiresAt(client, user, scope),
        scope: this.validateScope(user, client, scope)
      };

    } else if (this.grantType == "password") {
      token = {
        accessToken: this.generateAccessToken(client, user, scope),
        accessTokenExpiresAt: this.getAccessTokenExpiresAt(client, user, scope),
        refreshToken: this.generateRefreshToken(client, user, scope),
        refreshTokenExpiresAt: this.getRefreshTokenExpiresAt(),
        scope: this.validateScope(user, client, scope)
      };

    } else if (this.grantType == "refresh_token") {
      token = {
        accessToken: this.generateAccessToken(client, user, scope),
        accessTokenExpiresAt: this.getAccessTokenExpiresAt(),
        scope: this.validateScope(user, client, scope)
      };

      if (this.alwaysIssueNewRefreshToken !== false) {
        token.refreshToken = this.generateRefreshToken(client, user, scope);
        token.refreshTokenExpiresAt = this.getRefreshTokenExpiresAt();
      }
    }

    return this.model.saveToken(token, client, user);
  }
}

/**
 * BearerToken Class
 */
class BearerToken {
  public accessToken: string;
  public accessTokenLifetime: number;
  public refreshToken: string;
  public scope: number;
  public customAttributes: any;

  private options: any = {};

  constructor(req: IncomingMessage, options: any = {}) {
    this.options = {
      accessTokenLifetime: options.accessTokenLifetime,
      grantTypes: options.extendedGrantTypes,
      model: options.model,
      refreshTokenLifetime: options.refreshTokenLifetime,
      allowExtendedTokenAttributes: options.allowExtendedTokenAttributes,
      requireClientAuthentication: options.requireClientAuthentication || {},
      alwaysIssueNewRefreshToken: options.alwaysIssueNewRefreshToken !== false
    };

    const request: any = req as any;
    if (!request.body) {
      throw new OAuth2Error(500, "invalid_argument", "Missing parameter: `body`");
    }

    const grantType = request.body.grant_type;
    const client = this.getClient(req, this.options.model, grantType);
    this.handelGrantType(req, client, grantType);
  }

  private getClient(request: any, model: any, grantType: string): any {
    let clientId: string;
    let clientSecret: string;

    const credentials: any = this.parseAuth(request);
    if (credentials) {
      clientId = credentials.name;
      clientSecret = credentials.pass;

    } else if (request.body.client_id && request.body.client_secret) {
      clientId = request.body.client_id;
      clientSecret = request.body.client_secret;

    } else if (!this.isClientAuthenticationRequired(grantType)) {
      if (request.body.client_id) {
        clientId = request.body.client_id;
      }

    } else {
      throw new OAuth2Error(400, "invalid_client", "Invalid client: cannot retrieve client credentials");
    }

    return model.getClient(clientId, clientSecret);
  }

  private handelGrantType(request: any, client: any, grantType: string) {
    const accessTokenLifetime = client.accessTokenLifetime || this.options.accessTokenLifetime;
    const refreshTokenLifetime = client.refreshTokenLifetime || this.options.refreshTokenLifetime;

    const options = {
      grantType: grantType,
      accessTokenLifetime: accessTokenLifetime,
      model: this.options.model,
      refreshTokenLifetime: refreshTokenLifetime,
      alwaysIssueNewRefreshToken: this.options.alwaysIssueNewRefreshToken
    };

    let data: any = {};
    if (this.options.grantTypes && this.options.grantTypes[grantType]) {
      const Type = this.options.grantTypes[grantType];
      const typ = new Type(options);
      data = typ.handle(request, client);

    } else {
      const grantTypes = ["authorization_code", "client_credentials", "password", "refresh_token"];
      if (!!~grantTypes.indexOf(grantType)) {
        const typ = new GrantType(options);
        data = typ.handle(request, client);
      }
    }

    this.accessToken = data.accessToken;
    this.refreshToken = data.refreshToken;
    this.scope = data.scope;
    const accessTokenExpiresAt = data.accessTokenExpiresAt;

    if (this.options.allowExtendedTokenAttributes) {
      this.customAttributes = {};

      for (const key in data) {
        if (data.hasOwnProperty(key) && (!~[ "accessToken", "refreshToken", "scope" ].indexOf(key))) {
          this.customAttributes[key] = data[key];
        }
      }
    }

    if (accessTokenExpiresAt) {
      this.accessTokenLifetime = Math.floor((accessTokenExpiresAt.valueOf() - (new Date()).valueOf()) / 1000);
    }
  }

  private parseAuth(request: any): any {
    if (!request.headers) {
      throw new OAuth2Error(500, "invalid_argument", "Missing parameter: `headers`");
    }

    const CREDENTIALS_REGEXP = /^ *(?:[Bb][Aa][Ss][Ii][Cc]) +([A-Za-z0-9._~+/-]+=*) *$/;
    const USER_PASS_REGEXP = /^([^:]*):(.*)$/;
    const header = request.headers.authorization;
    const match = CREDENTIALS_REGEXP.exec(header);
    if (!match) {
      return undefined;
    }

    const buffer = new Buffer(match[1], "base64");
    const userPass = USER_PASS_REGEXP.exec(buffer.toString());
    return {
      name: userPass[1],
      pass: userPass[2]
    };
  }

  /**
   * Given a grant type, check if client authentication is required
   */
  private isClientAuthenticationRequired(grantType: string): boolean {
    if (Object.keys(this.options.requireClientAuthentication).length > 0) {
      return (typeof this.options.requireClientAuthentication[grantType] !== "undefined") ? this.options.requireClientAuthentication[grantType] : true;
    } else {
      return true;
    }
  }

  /**
   * Retrieve the value representation.
   */
  public valueOf(): any {
    const object: any = {
      access_token: this.accessToken,
      token_type: "Bearer"
    };

    if (this.accessTokenLifetime) {
      object.expires_in = this.accessTokenLifetime;
    }

    if (this.refreshToken) {
      object.refresh_token = this.refreshToken;
    }

    if (this.scope) {
      object.scope = this.scope;
    }

    for (const key in this.customAttributes) {
      if (this.customAttributes.hasOwnProperty(key)) {
        object[key] = this.customAttributes[key];
      }
    }
    return object;
  }
}