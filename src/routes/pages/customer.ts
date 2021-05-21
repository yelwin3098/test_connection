/**
 * Customer Routes
 */
import * as express from "express";
import { ExpressRouter } from "../../lib/express-application";
import { Utils } from "../../lib/utils";
import config from "../../../data/config.json";
import * as RestApi from "../../lib/restapi";
import * as comfunc from "../../lib/comfunc";

const jwtCredentialId = config.jwt.defCredentialId;

class CustomerRouter extends ExpressRouter {
  constructor() {
    super();

    this.route("/customer").all(this.onLoad).get(this.getList);
    this.route("/customer/entry").all(this.onLoad).get(this.getEntry).post(this.postEntry);
    this.route("/customer/edit/:id").all(this.onLoad).get(this.getEdit).post(this.postEdit);
    this.route("/customer/delete/:id").all(this.onLoad).post(this.postDelete);
  }

  public onLoad(req: express.Request, res: express.Response, next: express.NextFunction) {
    if (req.isAuthenticated()) {
      next();
    } else {
      res.redirect(`/login?url=${req.url}`);
    }
  }

  public getList(req: express.Request, res: express.Response, next: express.NextFunction) {
    const params: any = { title: config.appname };
    params.login = req.isAuthenticated();
    if (typeof (<any>req).jwtToken == "function") {
      (<any>req).jwtToken(jwtCredentialId)
        .then((result: string) => {
          params.token = result;
          res.render("dashboard/customer", params);
        })
        .catch((err: any) => {
          next(err);
        });

    } else {
      res.render("dashboard/customer", params);
    }
  }

  public getEntry(req: express.Request, res: express.Response, next: express.NextFunction) {
    const params: any = { title: config.appname, postUrl: "/customer/entry", params: {}, listUrl: "/customer" };
    params.login = req.isAuthenticated();

    if (typeof (<any>req).jwtToken == "function") {
      (<any>req).jwtToken(jwtCredentialId)
        .then((result: string) => {
          params.token = result;
          res.render("dashboard/customer-entry", params);
        })
        .catch((err: any) => {
          next(err);
        });

    } else {
      res.render("dashboard/customer-entry", params);
    }
  }

  public postEntry(req: express.Request, res: express.Response, next: express.NextFunction) {
    const data = comfunc.fillDefaultFields(req.body);
    delete (data.id);

    const db = RestApi.getDb("customer");
    db.insert(data, "id")
      .then((result) => {
        res.json({ "success": result });
      })
      .catch((err) => {
        console.log(`${err}`);
        res.json({ "error": err });
      });
  }

  public getEdit(req: express.Request, res: express.Response, next: express.NextFunction) {
    const data = { id: req.params.id };
    if (Utils.isEmpty(data.id)) {
      return comfunc.sendForbidden(next);
    }
    const postUrl = `/customer/edit/${data.id}`;
    const params: any = { title: config.appname, postUrl: postUrl, listUrl: "/customer", params: data };
    params.login = req.isAuthenticated();

    RestApi.getDb("customer").where({ id: data.id }).select()
      .then((result) => {
        params.params = Utils.mixin(data, result[0]);

        if (typeof (<any>req).jwtToken == "function") {
          return (<any>req).jwtToken(jwtCredentialId);
        } else {
          return Promise.resolve("");
        }
      })
      .then((result) => {
        params.token = result;
        res.render("dashboard/customer-entry", params);
      })
      .catch((err) => {
        console.log(`${err}`);
        next({ "error": err });
      });
  }

  public postEdit(req: express.Request, res: express.Response, next: express.NextFunction) {
    const data = comfunc.fillDefaultFields(req.body);

    let db = RestApi.getDb("customer");
    if (Utils.isEmpty(data.id)) {
      return comfunc.sendForbidden(res);
    }

    db = db.where({ id: data.id });
    delete (data.id);
    db.update(data, "id")
      .then((result) => {
        res.json({ "success": result });
      })
      .catch((err) => {
        console.log(`${err}`);
        res.json({ "error": err });
      });
  }

  public postDelete(req: express.Request, res: express.Response, next: express.NextFunction) {
    const data = { id: req.params.id };
    if (Utils.isEmpty(data.id)) {
      return comfunc.sendForbidden(res);
    }
    let db = RestApi.getDb("customer");
    db = db.where({ id: data.id });
    db.delete("id")
      .then((result) => {
        res.json({ "success": result });
      })
      .catch((err) => {
        console.log(`${err}`);
        res.json({ "error": err });
      });
  }
}

export default new CustomerRouter();