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
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const path = __importStar(require("path"));
const session = __importStar(require("express-session"));
const v4_1 = __importDefault(require("uuid/v4"));
const express_application_1 = require("./lib/express-application");
const passport = __importStar(require("./config/passport-config"));
const RestApi = __importStar(require("./lib/restapi"));
const config_json_1 = __importDefault(require("../data/config.json"));
const filerouter = __importStar(require("./routes/file"));
// import { Auth } from "./lib/auth";
const jwt_1 = require("./lib/jwt");
class MainApp extends express_application_1.ExpressApplication {
    constructor() {
        super(__dirname);
        // uncomment after under construction
        // this.isUnderConstruction = true;
        this.urlencodedOptions.extended = true;
    }
    onUseViewEngine(app) {
        // view engine setup
        this.set("views", path.join(__dirname, "../views/pages"));
        this.set("view engine", "pug");
    }
    onUseMiddleWares(app) {
        this.use(cookie_parser_1.default());
        this.useStatic("../public");
        this.use(session.default({
            genid: (req) => { return v4_1.default(); },
            secret: config_json_1.default.sessionsecret,
            resave: true,
            saveUninitialized: true
        })); // session secret
        this.use(passport.default.initialize());
        this.use(passport.default.session());
        // const auth = new Auth();
        // this.use(auth.handle("csrf"));
        const auth = new jwt_1.JwtAuth(config_json_1.default.jwt);
        this.use(auth.handle());
        config_json_1.default.restapi.modelBasePath = path.join(__dirname, "models");
        // console.log("config.restapi (app.ts) >>> ", config.restapi);
        this.use("/api", RestApi.init(config_json_1.default.restapi, (err, api) => {
            // console.log("api in (app.ts) >>> ", api);
            if (api) {
                // console.log("api.applyModel(['citylist']) (app.ts) >>> ", api.applyModel(["citylist"]));
                api.applyModel(["citylist"]);
            }
        }));
        this.use("/file", filerouter.default.init());
    }
    onUseRouter(app) {
        this.loadRouters("./routes/pages");
    }
}
const app = new MainApp();
exports.default = app.create();
//# sourceMappingURL=app.js.map