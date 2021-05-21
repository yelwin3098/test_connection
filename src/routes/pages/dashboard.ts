/**
 * Dashboard Router
 */
import * as express from "express";
import { ExpressRouter } from "../../lib/express-application";
import config from "../../../data/config.json";

class DashboardRouter extends ExpressRouter {
  constructor() {
    super();
    this.route("/dashboard").all(this.onLoad).get(this.getDashboard);
  }

  public onLoad(req: express.Request, res: express.Response, next: express.NextFunction): void {
    if (req.isAuthenticated()) {
      next();
    } else {
      res.redirect(`/login?url=${req.url}`);
    }
  }

  public getDashboard(req: express.Request, res: express.Response, next: express.NextFunction) {
    const params: any = { title: config.appname };
    if (typeof (<any>req).csrfToken == "function") {
      params.csrfToken = (<any>req).csrfToken();
    }
    res.render("dashboard/index", params);
  }
}

export default new DashboardRouter();