/**
 * Common Functions
 */
import * as urlModule from "url";
import express from "express";
import { HttpError } from "./errorhandler";
import { Utils } from "./utils";

export function fillDefaultFields(data: any): any {
  if (data.createddate && /^([\d\/-]+)T(.*)$/i.test(data.createddate)) {
    data.createddate = data.createddate.replace(/^([\d\/-]+)T(.*)$/i, "$1");
  }
  data.updateddate = Utils.toSqlDate(new Date());
  if (Utils.isEmpty(data.createddate)) {
    data.createddate = Utils.toSqlDate(new Date());
  }
  return data;
}

export function sendForbidden(res?: any, next?: Function) {
  const error = new HttpError(403, "Access to this resource on the server is denied!");
  if (res) {
    res.json({ "error": error });
  } else if (next) {
    next(error);
  }
}

export function rootUrl(req: express.Request) {
  const url = urlModule.format({
    protocol: req.protocol,
    host: req.get("host"),
    pathname: req.originalUrl,
  });
  return url.replace(req.url, "");
}