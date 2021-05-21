/**
 * Main Application
 */
import * as express from "express";
import cookieParser from "cookie-parser";
import * as path from "path";
import * as session from "express-session";
import uuid from "uuid/v4";
import { ExpressApplication } from "./lib/express-application";
import * as passport from "./config/passport-config";
import * as RestApi from "./lib/restapi";
import config from "../data/config.json";
import * as filerouter from "./routes/file";
// import { Auth } from "./lib/auth";
import { JwtAuth } from "./lib/jwt";

class MainApp extends ExpressApplication {
  constructor() {
    super(__dirname);

    // uncomment after under construction
    // this.isUnderConstruction = true;
    this.urlencodedOptions.extended = true;
  }

  public onUseViewEngine(app: express.Express): void {
    // view engine setup
    this.set("views", path.join(__dirname, "../views/pages"));
    this.set("view engine", "pug");
  }

  public onUseMiddleWares(app: express.Express): void {
    this.use(cookieParser());
    this.useStatic("../public");
    this.use(session.default({
      genid: (req) => { return uuid(); },
      secret: config.sessionsecret,
      resave: true,
      saveUninitialized: true
    })); // session secret

    this.use(passport.default.initialize());
    this.use(passport.default.session());

    // const auth = new Auth();
    // this.use(auth.handle("csrf"));

    const auth = new JwtAuth(config.jwt);
    this.use(auth.handle());

    config.restapi.modelBasePath = path.join(__dirname, "models");
    // console.log("config.restapi (app.ts) >>> ", config.restapi);
    this.use("/api", RestApi.init(config.restapi, (err, api) => {
      // console.log("api in (app.ts) >>> ", api);
      if (api) {
        // console.log("api.applyModel(['citylist']) (app.ts) >>> ", api.applyModel(["citylist"]));
        api.applyModel(["citylist"]);
      }
    }));

    this.use("/file", filerouter.default.init());
  }

  public onUseRouter(app: express.Express): void {
    this.loadRouters("./routes/pages");
  }
}

const app = new MainApp();
export default app.create();