/**
 * Routes Main
 */
import * as express from "express";
import { ExpressRouter } from "../../lib/express-application";
import config from "../../../data/config.json";

class HomeRouter extends ExpressRouter {
  constructor() {
    super();
    this.get("/", this.getHome);
  }

  public getHome(req: express.Request, res: express.Response, next: express.NextFunction) {
    const params: any = { title: config.appname };
    params.login = req.isAuthenticated();
    if (typeof (<any>req).csrfToken == "function") {
      params.csrfToken = (<any>req).csrfToken();
    }
    res.render("index", params);
  }
}

export default new HomeRouter();