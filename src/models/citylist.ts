/**
 * City List
 */
import * as express from "express";
import * as RestApi from "../lib/restapi";
import * as uuid from "uuid";
import { Utils } from "../lib/utils";
​
export class CityList {
  constructor() {}
​
  public index(args: any, cb: Function) {
    RestApi.getDb("city")
      .select()
    //   .where({ dealerid: args.dealerid })
      .orderBy("createddate", "desc")
      .then(city_records => {
        const city = city_records;
        cb(undefined, {
          message: "success", data: city
        });
       })
      .catch((err) => {
        cb(undefined, {
          error: {
            message: err.message || "City lists error"
        }
      });
    });
  }
}

export default new CityList();