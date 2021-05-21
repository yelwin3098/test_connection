"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * passport-config.ts
 */
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const crypto = __importStar(require("crypto"));
const passport = __importStar(require("passport"));
const local = __importStar(require("passport-local"));
function md5(str) {
    return crypto.createHash("md5").update(str, "ascii").digest("hex").toUpperCase();
}
exports.md5 = md5;
class PassportConfig extends passport.Passport {
    constructor() {
        super();
        this.serializeUser(this.serializeUserImpl);
        this.deserializeUser(this.deserializeUserImpl);
        this.use(new local.Strategy({
            usernameField: "username",
            passwordField: "password",
            session: true
        }, this.verify()));
    }
    get authFilePath() {
        return path.join(__dirname, "../../data/system-account.json");
    }
    serializeUserImpl(user, done) {
        done(undefined, user);
    }
    deserializeUserImpl(user, done) {
        done(undefined, user);
    }
    getSystemUser(user, filePath) {
        const filename = filePath || this.authFilePath;
        return new Promise((resolve, reject) => {
            fs.readFile(filename, "utf8", function (err, fileData) {
                if (fileData && typeof fileData == "string") {
                    const systemAccount = JSON.parse(fileData);
                    const users = systemAccount.users;
                    if (Array.isArray(users)) {
                        const tArr = users.filter(function (di) {
                            return di.username == user.username;
                        });
                        if (tArr.length > 0) {
                            resolve(tArr[0]);
                        }
                        else {
                            resolve(undefined);
                        }
                    }
                }
                else {
                    reject(new Error("Can not read user data file."));
                }
            });
        });
    }
    updateSystemUser(user, filePath) {
        const filename = filePath || this.authFilePath;
        return new Promise((resolve, reject) => {
            fs.readFile(filename, "utf8", function (err, fileData) {
                const systemAccount = JSON.parse(fileData);
                const users = systemAccount.users;
                if (Array.isArray(users) && users.length > 0) {
                    for (const i in users) {
                        if (users[i].id == user.id) {
                            users[i].username = user.username;
                            users[i].password = user.password;
                            break;
                        }
                    }
                    systemAccount.users = users;
                    fs.writeFile(filename, JSON.stringify(systemAccount), "utf8", function (err) {
                        if (err) {
                            reject(err);
                        }
                        else {
                            resolve(true);
                        }
                    });
                }
            });
        });
    }
    verify(filePath) {
        const filename = filePath || this.authFilePath;
        const getFunc = this.getSystemUser;
        return (username, password, done) => {
            const encPassword = md5(password);
            getFunc({ username: username }, filename)
                .then((result) => {
                if (result && result.password == encPassword) {
                    done(0, result);
                }
                else if (!result) {
                    done(new Error("Invalid login user!"), undefined);
                }
                else {
                    done(new Error("Incorrect password!"), undefined);
                }
            })
                .catch((err) => {
                done(err, undefined);
            });
        };
    }
}
exports.default = new PassportConfig();
//# sourceMappingURL=passport-config.js.map