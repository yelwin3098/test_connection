/*!
 * basic-auth
 * Copyright(c) 2013 TJ Holowaychuk
 * Copyright(c) 2014 Jonathan Ong
 * Copyright(c) 2015-2016 Douglas Christopher Wilson
 * MIT Licensed
 */
import { IncomingMessage } from "http";

/**
 * RegExp for basic auth credentials
 *
 * credentials = auth-scheme 1*SP token68
 * auth-scheme = "Basic" ; case insensitive
 * token68     = 1*( ALPHA / DIGIT / "-" / "." / "_" / "~" / "+" / "/" ) *"="
 * @private
 */
const CREDENTIALS_REGEXP = /^ *(?:[Bb][Aa][Ss][Ii][Cc]) +([A-Za-z0-9._~+/-]+=*) *$/;

/**
 * RegExp for basic auth user/pass
 *
 * user-pass   = userid ":" password
 * userid      = *<TEXT excluding ":">
 * password    = *TEXT
 * @private
 */
const USER_PASS_REGEXP = /^([^:]*):(.*)$/;

export class BasicAuth {
  public name: string;
  public pass: string;

  /**
   * Parse the Authorization header field of a request.
   *
   * @param {object} req
   * @return {object} with .name and .pass
   * @public
   */
  constructor(req: IncomingMessage) {
    if (!req) {
      throw new TypeError("argument req is required");
    }
    if (typeof req !== "object") {
      throw new TypeError("argument req is required to be an object");
    }

    // get header
    const header = this.getAuthorization(req);

    // parse header
    const credentials = this.parse(header);
    this.name = credentials.name;
    this.pass = credentials.pass;
  }

  /**
   * Parse basic auth to object.
   *
   * @param {string} string
   * @return {object}
   * @public
   */
  public parse(str: string) {
    // parse header
    const match = CREDENTIALS_REGEXP.exec(str);

    if (!match) {
      return undefined;
    }

    // decode user pass
    const userPass = USER_PASS_REGEXP.exec(this.decodeBase64(match[1]));

    if (!userPass) {
      return undefined;
    }

    // return credentials object
    return {
      name: userPass[1],
      pass: userPass[2]
    };
  }

  /**
   * Decode base64 string.
   * @private
   */
  private decodeBase64(str: string) {
    return new Buffer(str, "base64").toString();
  }

  /**
   * Get the Authorization header from request object.
   * @private
   */
  private getAuthorization(req: IncomingMessage) {
    if (!req.headers || typeof req.headers !== "object") {
      throw new TypeError("argument req is required to have headers property");
    }
    return req.headers.authorization;
  }
}
