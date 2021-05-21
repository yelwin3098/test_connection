"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const RestApi = __importStar(require("../lib/restapi"));
class CityList {
    constructor() { }
    index(args, cb) {
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
exports.CityList = CityList;
exports.default = new CityList();
//# sourceMappingURL=citylist.js.map