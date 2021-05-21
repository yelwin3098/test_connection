import url from "url";
import http from "http";

function parseAuthHeader(hdrValue: string): { scheme: string; value: string } {
  const matches = hdrValue.match(/(\S+)\s+(\S+)/);
  return matches && {
    scheme: matches[1],
    value: matches[2]
  };
}

const AUTH_HEADER = "authorization";
const LEGACY_AUTH_SCHEME = "JWT";
const BEARER_AUTH_SCHEME = "bearer";

export type ExtractorFunction = (request: http.IncomingMessage) => string;

class Extractors {
  public header: (name: string) => ExtractorFunction;
  public query: (name: string) => ExtractorFunction;
  public authScheme: (name: string) => ExtractorFunction;
  public authBearer: (name: string) => ExtractorFunction;

  constructor() {
    this.header = this.fromHeader;
    this.query = this.fromUrlQueryParameter;
    this.authScheme = this.fromAuthHeaderWithScheme;
    this.authBearer = this.fromAuthHeaderAsBearerToken;
  }

  public fromHeader(header_name: string): ExtractorFunction  {
    return (request: http.IncomingMessage): string => {
      let token: string = undefined;
      if (request.headers[header_name]) {
        token = `${request.headers[header_name]}`;
      }
      return token;
    };
  }

  private fromBodyField(field_name: string): ExtractorFunction {
    return (request: http.IncomingMessage) => {
      const req = request as any;
      let token: string = undefined;
      if (req.body && Object.prototype.hasOwnProperty.call(req.body, field_name)) {
        token = `${req.body[field_name]}`;
      }
      return token;
    };
  }

  public fromUrlQueryParameter(param_name: string): ExtractorFunction {
    return (request: http.IncomingMessage) => {
      let token: string = undefined;
      const parsed_url = url.parse(request.url, true);
      if (parsed_url.query && Object.prototype.hasOwnProperty.call(parsed_url.query, param_name)) {
        token = `${parsed_url.query[param_name]}`;
      }
      return token;
    };
  }

  public fromAuthHeaderWithScheme(auth_scheme: string): ExtractorFunction {
    const auth_scheme_lower = auth_scheme.toLowerCase();
    return (request: http.IncomingMessage) => {
      let token: string = undefined;
      // console.log("typeof request.headers['balckkey'] in fromAuthHeaderWithScheme (extractor.ts) >>> ", typeof request.headers['blackkey']);
      if (request.headers[AUTH_HEADER]) {
        const auth_params = parseAuthHeader(request.headers[AUTH_HEADER]);
        if (auth_params && auth_scheme_lower === auth_params.scheme.toLowerCase()) {
          token = auth_params.value;
        }
      }
      const secrethash: any = request.headers["secrethash"];
      // return blackkey;
      return token;
      // return request.headers['blackkey'];
    };
  }

  public fromAuthHeaderAsBearerToken(): ExtractorFunction {
    return this.fromAuthHeaderWithScheme(BEARER_AUTH_SCHEME);
  }

  public fromExtractors(extractors: Array<any>): ExtractorFunction {
    if (!Array.isArray(extractors)) {
      throw new TypeError("extractors.fromExtractors expects an array");
    }

    return (request: http.IncomingMessage) => {
      let token: string = undefined;
      let index = 0;
      while (!token && index < extractors.length) {
        token = extractors[index].call(this, request);
        index++;
      }
      return token;
    };
  }

  /**
   * This extractor mimics the behavior of the v1.*.* extraction logic.
   *
   * This extractor exists only to provide an easy transition from the v1.*.* API to the v2.0.0 API.
   *
   * This extractor first checks the auth header, if it doesn't find a token there then it checks the
   * specified body field and finally the url query parameters.
   *
   * @param options
   *          authScheme: Expected scheme when JWT can be found in HTTP Authorize header. Default is JWT.
   *          tokenBodyField: Field in request body containing token. Default is auth_token.
   *          tokenQueryParameterName: Query parameter name containing the token. Default is auth_token.
   */

  public versionOneCompatibility(options?: any): ExtractorFunction {
    const authScheme = options.authScheme || LEGACY_AUTH_SCHEME;
    const bodyField = options.tokenBodyField || "auth_token";
    const queryParam = options.tokenQueryParameterName || "auth_token";
    return (request: http.IncomingMessage) => {
      const authHeaderExtractor = this.fromAuthHeaderWithScheme(authScheme);
      let token = authHeaderExtractor(request);
      if (!token) {
        const bodyExtractor = this.fromBodyField(bodyField);
        token = bodyExtractor(request);
      }

      if (!token) {
        const queryExtractor = this.fromUrlQueryParameter(queryParam);
        token = queryExtractor(request);
      }
      return token;
    };
  }
}

export default new Extractors();