/**
 * Test
 */
var request = require('supertest');
// var app = require("../dist/app").default;

function escapeRegExp(str) {
  const specials = ["-", "[", "]", "/", "{", "}", "(", ")", "*", "+", "?", ".", "\\", "^", "$", "|"];
  const matchOperatorsRe = RegExp(`[${specials.join("\\")}]`, "g");
  return str.replace(matchOperatorsRe, "\\$&");
}

describe("GET /", function() {
  it("test", function(done) {
    console.log(escapeRegExp("/jwt/token"));
    setImmediate(done);
  });
});

// var dateAndTime = require("../dist/lib/date-and-time").default;

// var timezoneRegEx = new RegExp("(" + [
//   "?:[PMCEA][SDP]T",
//   "(?:Pacific|Mountain|Central|Eastern|Atlantic) (?:Standard|Daylight|Prevailing) Time",
//   "(?:GMT|UTC)(?:[-+]\\d{4})",
//   "(?:[-+][\\d:]{2,5})",
//   "(?:A|B|C|C†|D|D†|E|E†|E\\*|F|F†|G|H|H†|H\\*|I|I†|K|K†|L|M|M\\*|M†|N|O|P|P†|Q|R|S|T|U|V|V†|W|X|Y|Z)"
// ].join("|") + "?)$", "g");

// var timezone = /(?:[PMCEA][SDP]T|(?:Pacific|Mountain|Central|Eastern|Atlantic) (?:Standard|Daylight|Prevailing) Time|(?:[-+][\d:]{2,5})|(?:GMT|UTC)(?:[-+]\d{4})?)$/;
// timezone = /(?:[ABCDEFGHIKLMNOPQRSTUVWXYZ])(?:[†\*])$/;

// describe("CHECK DateAndTime", function() {
//   it("", function(done) {
//     const dString = "2018-12-02 06:00:00.000H*";
//     const match = timezone.exec(dString);
//     console.log(match);
//     // const dateObj = dateAndTime.parse(dString, "YYYY-MM-DD HH:mm:ss.S", true);
//     // console.log(dateObj);
//     setImmediate(done);
//   });
// });