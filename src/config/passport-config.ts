/**
 * passport-config.ts
 */
import * as path from "path";
import * as fs from "fs";
import * as crypto from "crypto";
import * as passport from "passport";
import * as local from "passport-local";

export function md5(str: string) {
  return crypto.createHash("md5").update(str, "ascii").digest("hex").toUpperCase();
}

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

  public get authFilePath() {
    return path.join(__dirname, "../../data/system-account.json");
  }

  serializeUserImpl(user: any, done: Function) {
    done(undefined, user);
  }

  deserializeUserImpl(user: any, done: Function) {
    done(undefined, user);
  }

  public getSystemUser(user: any, filePath?: string): Promise<any> {
    const filename = filePath || this.authFilePath;
    return new Promise((resolve, reject) => {
      fs.readFile(filename, "utf8", function(err, fileData) {
        if (fileData && typeof fileData == "string") {
          const systemAccount = JSON.parse(fileData);
          const users = systemAccount.users;
          if (Array.isArray(users)) {
            const tArr = users.filter(function(di) {
              return di.username == user.username;
            });

            if (tArr.length > 0) {
              resolve(tArr[0]);
            } else {
              resolve(undefined);
            }
          }
        } else {
          reject(new Error("Can not read user data file."));
        }
      });
    });
  }

  public updateSystemUser(user: any, filePath?: string): Promise<any> {
    const filename = filePath || this.authFilePath;
    return new Promise((resolve, reject) => {
      fs.readFile(filename, "utf8", function(err, fileData) {
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
          fs.writeFile(filename, JSON.stringify(systemAccount), "utf8", function(err) {
            if (err) {
              reject(err);
            } else {
              resolve(true);
            }
          });
        }
      });
    });
  }

  private verify(filePath?: string) {
    const filename = filePath || this.authFilePath;
    const getFunc = this.getSystemUser;
    return (username: string, password: string, done: Function) => {
      const encPassword = md5(password);
      getFunc({ username: username }, filename)
        .then((result) => {
          if (result && result.password == encPassword) {
            done(0, result);
          } else if (!result) {
            done(new Error("Invalid login user!"), undefined);
          } else {
            done(new Error("Incorrect password!"), undefined);
          }
        })
        .catch((err) => {
          done(err, undefined);
        });
    };
  }
}

export default new PassportConfig();