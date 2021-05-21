"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Json Web Token Helper
 *
 * https://github.com/mikenicholson/passport-jwt/
 * https://github.com/ExpressGateway/express-gateway
 * https://medium.com/@tanmay_patil/introduction-to-api-gateway-using-express-gateway-part-2-authorization-using-jwt-77b74cfd8766
 */
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const jwt = __importStar(require("jsonwebtoken"));
const extractors_1 = __importDefault(require("./extractors"));
const httperror_1 = require("./httperror");
const utils_1 = require("../utils");
class Jwt {
    constructor(rootPath, config) {
        if (config.secretOrPrivateKeyFile) {
            const filePath = path_1.default.join(rootPath, config.secretOrPrivateKeyFile);
            this.secretOrPrivateKey = fs_1.default.readFileSync(filePath, "utf8");
        }
        else if (config.secretOrPrivateKey) {
            this.secretOrPrivateKey = config.secretOrPrivateKey;
        }
        else {
            throw new Error("Required secretOrPrivateKeyFile or secretOrPrivateKey");
        }
        if (config.secretOrPublicKeyFile) {
            const filePath = path_1.default.join(rootPath, config.secretOrPublicKeyFile);
            this.secretOrPublicKey = fs_1.default.readFileSync(filePath, "utf8");
        }
        else if (config.secretOrPublicKey) {
            this.secretOrPublicKey = config.secretOrPublicKey;
        }
        else {
            throw new Error("Required secretOrPublicKeyFile or secretOrPublicKey");
        }
        if (config.secureSecret) {
            this.secureSecret = config.secureSecret;
        }
        else {
            throw new Error("Required secureSecret");
        }
        this.jwtExtractor = config.jwtExtractor || "authBearer";
        this.jwtExtractorField = config.jwtExtractorField;
        this.checkCredentialExistence = !!config.checkCredentialExistence;
        if (typeof config.credentials == "function") {
            // console.log("config.credentials as GetCredentailFunction >>> ", config.credentials as GetCredentialFunction);
            this.credentialsFun = config.credentials;
            // console.log(this.credentialsFun);
        }
        else {
            this.credentials = config.credentials;
        }
        this.jwtVerifyOptions = config.verifyOptions;
        this.jwtSignOptions = config.signOptions;
    }
    getCredential(id) {
        const self = this;
        return new Promise((resolve, reject) => {
            // const credential: any = {
            //   id: "523c71a2-9f80-434f-a555-9b193ba66444",
            //   keyId: "7dSTbOnvJ7mUF3CtNBCEst",
            //   keySecret: "7Ex0letChBSw23RfcPSqGr",
            //   isActive: true
            // };
            // resolve(credential);
            if (self.credentials && self.credentials.length) {
                const cs = self.credentials.filter((value) => {
                    return value.id == id;
                });
                if (cs && cs.length > 0) {
                    resolve(cs[0]);
                }
            }
            else if (self.credentialsFun) {
                resolve(self.credentialsFun(id));
            }
            else {
                reject(new httperror_1.HttpError(401, "Credential not found"));
            }
        });
    }
    generateToken(credentialId, name, expired = true) {
        const options = this.jwtSignOptions;
        options.algorithm = options.algorithm || "HS256";
        options.expiresIn = options.expiresIn || "1h"; // maybe for mobile due to generateToken(credentialId, name)
        const secretOrKey = this.secretOrPrivateKey;
        const iatNum = (new Date()).getTime();
        const signPayload = {
            sub: credentialId,
            name: name || "",
            iat: iatNum
        };
        if (!expired) {
            options.expiresIn = "1h"; // for web due to generateToken(credentialId, name, false);
            // delete options.expiresIn;
        }
        return new Promise((resolve, reject) => {
            this.getCredential(credentialId)
                .then((result) => {
                if (!result) {
                    return reject(new httperror_1.HttpError(401, "Credential not found"));
                }
                jwt.sign(signPayload, secretOrKey, options, (err, token) => {
                    if (err) {
                        return reject(err);
                    }
                    resolve(token);
                });
            })
                .catch((err) => {
                reject(err);
            });
        });
    }
    verifyHandle(req, done) {
        const secrethash = req.headers["secrethash"];
        const extractor = extractors_1.default[this.jwtExtractor](this.jwtExtractorField);
        const verifOpts = this.jwtVerifyOptions;
        verifOpts.algorithms = verifOpts.algorithms || ["HS256"];
        verifOpts.ignoreExpiration = !!verifOpts.ignoreExpiration;
        verifOpts.ignoreNotBefore = !!verifOpts.ignoreNotBefore;
        const secretOrKey = this.secretOrPublicKey;
        const secureSecret = this.secureSecret;
        // console.log("req in verifyHandle for extractor(req) (jwt.ts) >>> ", req);
        const token = extractor(req);
        if (!token) {
            return done(new httperror_1.HttpError(401, "Token not found"));
        }
        const secretHash = utils_1.Utils.md5(token + secureSecret).toLocaleLowerCase();
        if (secrethash !== secretHash) {
            return done(new httperror_1.HttpError(422, "Unprocessable Entity"));
            // throw new Error("secretHash Failed");
        }
        jwt.verify(token, secretOrKey, verifOpts, (jwtErr, decoded) => {
            if (jwtErr) {
                // console.log("jwt.verify", jwtErr);
                return done(jwtErr);
            }
            if (!decoded) {
                return done(new httperror_1.HttpError(401, "Invalid Token"));
            }
            if (!this.checkCredentialExistence) {
                return done(undefined, decoded);
            }
            const payload = decoded;
            if (!payload.sub) {
                return done(new httperror_1.HttpError(401, "Consumer Id not found"));
            }
            this.getCredential(payload.sub)
                .then((credential) => {
                if (!credential || !credential.isActive) {
                    return done(new httperror_1.HttpError(401, "Credential not found"));
                }
                return done(undefined, credential);
            })
                .catch((err) => {
                done(err);
            });
        });
    }
    sign(payload = {}, secretOrPrivateKey, options) {
        if (!secretOrPrivateKey) {
            secretOrPrivateKey = this.secretOrPrivateKey;
        }
        return new Promise((resolve, reject) => {
            jwt.sign(payload, secretOrPrivateKey, options, (err, encoded) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(encoded);
                }
            });
        });
    }
    decode(token, options) {
        return Promise.resolve(jwt.decode(token, options));
    }
    verify(token, secretOrPublicKey, options) {
        secretOrPublicKey ? console.log("secretOrPublicKey in verify (jwt.ts) >>> ", secretOrPublicKey) : console.log("not found secretOrPublicKey in verify (jwt.ts)");
        if (!secretOrPublicKey) {
            secretOrPublicKey = this.secretOrPublicKey;
        }
        return new Promise((resolve, reject) => {
            jwt.verify(token, secretOrPublicKey, options, (err, decoded) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(decoded);
                }
            });
        });
    }
}
exports.Jwt = Jwt;
//# sourceMappingURL=jwt.js.map