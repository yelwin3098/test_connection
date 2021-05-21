"use strict";
/**
 * @preserve date-and-time.js (c) KNOWLEDGECODE | MIT
 */
Object.defineProperty(exports, "__esModule", { value: true });
class DateTime {
    constructor() { }
    static isCommonJS() {
        return typeof module === "object" && typeof module.exports === "object";
    }
    /**
     * formatting a date
     * @param {Object} dateObj - date object
     * @param {String} formatString - format string
     * @param {Boolean} [utc] - output as UTC
     * @returns {String} the formatted string
     */
    format(dateObj, formatString, utc = false) {
        const d = this.addMinutes(dateObj, utc ? dateObj.getTimezoneOffset() : 0);
        const locale = DateTime.locales[DateTime.lang];
        const formatter = locale.formatter;
        d.utc = utc;
        return formatString.replace(/(\[[^\[\]]*]|\[.*\][^\[]*\]|YYYY|YY|MMM?M?|DD|HH|hh|mm|ss|SSS?|ddd?d?|.)/g, function (token) {
            const format = formatter[token];
            return format ? formatter.post(format.call(locale, d, formatString)) : token.replace(/\[(.*)]/, "$1");
        });
    }
    /**
     * parsing a date string
     * @param {String} dateString - date string
     * @param {String} formatString - format string
     * @param {Boolean} [utc] - input as UTC
     * @returns {Object} the constructed date
     */
    parse(dateString, formatString, utc = false) {
        const locale = DateTime.locales[DateTime.lang];
        const dString = locale.parser.pre(dateString);
        let offset = 0, keys, i, token, length, p, str, result, dateObj;
        const re = /(MMMM?|A)|(YYYY)|(SSS)|(MM|DD|HH|hh|mm|ss)|(YY|M|D|H|h|m|s|SS)|(S)|(.)/g;
        const exp = { 2: /^\d{1,4}/, 3: /^\d{1,3}/, 4: /^\d\d/, 5: /^\d\d?/, 6: /^\d/ };
        const dt = { Y: 1970, M: 1, D: 1, H: 0, m: 0, s: 0, S: 0 };
        while ((keys = re.exec(formatString))) {
            for (i = 0, length = 1, token = ""; !token;) {
                token = keys[++i];
            }
            p = token.charAt(0);
            str = dString.slice(offset);
            if (i < 2) {
                result = locale.parser[token].call(locale, str, formatString);
                dt[p] = result.index;
                if (p === "M") {
                    dt[p]++;
                }
                length = result.length;
                if (!length) {
                    return undefined;
                }
            }
            else if (i < 7) {
                str = (str.match(exp[i]) || [""])[0];
                if (!str) {
                    return undefined;
                }
                dt[p] = (p === "S" ? (str + "000").slice(0, -token.length) : str) | 0;
                length = str.length;
            }
            offset += length;
        }
        dt.Y += dt.Y < 70 ? 2000 : dt.Y < 100 ? 1900 : 0;
        dt.H = dt.H || locale.parser.h(dt.h || 0, dt.A || 0);
        dateObj = new Date(dt.Y, dt.M - 1, dt.D, dt.H, dt.m, dt.s, dt.S);
        if (dt.Y !== dateObj.getFullYear() || dt.M - 1 !== dateObj.getMonth() || dt.D !== dateObj.getDate()
            || dt.H !== dateObj.getHours() || dt.m !== dateObj.getMinutes() || dt.s !== dateObj.getSeconds()
            || dt.S !== dateObj.getMilliseconds()) {
            return undefined;
        }
        let timeZone = undefined;
        let timeZoneMatch = /GMT[\-\+][\d\:]{2,5}$/.exec(dString);
        if (!timeZoneMatch) {
            const tzCodes = Object.keys(locale.zoneOffsetCodes);
            const timeZoneRegex = new RegExp(`(${tzCodes.join("|")})$`);
            timeZoneMatch = timeZoneRegex.exec(dString);
            if (timeZoneMatch) {
                timeZone = locale.zoneOffsetCodes[timeZoneMatch[1]];
            }
        }
        else {
            timeZone = timeZoneMatch[1];
        }
        if (timeZone) {
            timeZone = timeZone.replace(/^(GMT)([\-\+])(\d{1,2})(\d{2,})$/, "$1$2$3:$4");
            const zoneMatch = timeZone.match(/^(GMT)([\-\+])(\d{1,2}):(\d{2,})$/);
            if (zoneMatch) {
                const isUtc = /^[0:]{1,2}$/.test(zoneMatch[3]) && /^[0:]{2,}$/.test(zoneMatch[4]);
                if (!isUtc) {
                    const diff = (parseInt(zoneMatch[3]) * 60) + parseInt(zoneMatch[4]);
                    if (zoneMatch[2] == "-") {
                        dateObj = this.addMinutes(dateObj, diff);
                    }
                    else {
                        dateObj = this.addMinutes(dateObj, -diff);
                    }
                }
            }
        }
        return utc ? this.addMinutes(dateObj, -dateObj.getTimezoneOffset()) : dateObj;
    }
    /**
     * validation
     * @param {String} dateString - date string
     * @param {String} formatString - format string
     * @returns {Boolean} whether the date string is a valid date
     */
    isValid(dateString, formatString) {
        return !!this.parse(dateString, formatString);
    }
    /**
     * adding years
     * @param {Object} dateObj - date object
     * @param {Number} years - adding year
     * @returns {Object} the date after adding the value
     */
    addYears(dateObj, years) {
        return this.addMonths(dateObj, years * 12);
    }
    /**
     * adding months
     * @param {Object} dateObj - date object
     * @param {Number} months - adding month
     * @returns {Object} the date after adding the value
     */
    addMonths(dateObj, months) {
        const d = new Date(dateObj.getTime());
        d.setMonth(d.getMonth() + months);
        return d;
    }
    /**
     * adding days
     * @param {Object} dateObj - date object
     * @param {Number} days - adding day
     * @returns {Object} the date after adding the value
     */
    addDays(dateObj, days) {
        return this.addMilliseconds(dateObj, days * 86400000);
    }
    /**
     * adding hours
     * @param {Object} dateObj - date object
     * @param {Number} hours - adding hour
     * @returns {Object} the date after adding the value
     */
    addHours(dateObj, hours) {
        return this.addMilliseconds(dateObj, hours * 3600000);
    }
    /**
     * adding minutes
     * @param {Object} dateObj - date object
     * @param {Number} minutes - adding minute
     * @returns {Object} the date after adding the value
     */
    addMinutes(dateObj, minutes) {
        return this.addMilliseconds(dateObj, minutes * 60000);
    }
    /**
     * adding seconds
     * @param {Object} dateObj - date object
     * @param {Number} seconds - adding second
     * @returns {Object} the date after adding the value
     */
    addSeconds(dateObj, seconds) {
        return this.addMilliseconds(dateObj, seconds * 1000);
    }
    /**
     * adding milliseconds
     * @param {Object} dateObj - date object
     * @param {Number} milliseconds - adding millisecond
     * @returns {Object} the date after adding the value
     */
    addMilliseconds(dateObj, milliseconds) {
        return new Date(dateObj.getTime() + milliseconds);
    }
    /**
     * subtracting
     * @param {Object} date1 - date object
     * @param {Object} date2 - date object
     * @returns {Object} the result object after subtracting the date
     */
    subtract(date1, date2) {
        const delta = date1.getTime() - date2.getTime();
        return {
            toMilliseconds: function () {
                return delta;
            },
            toSeconds: function () {
                return delta / 1000 | 0;
            },
            toMinutes: function () {
                return delta / 60000 | 0;
            },
            toHours: function () {
                return delta / 3600000 | 0;
            },
            toDays: function () {
                return delta / 86400000 | 0;
            }
        };
    }
    /**
     * leap year
     * @param {Object} dateObj - date object
     * @returns {Boolean} whether the year is a leap year
     */
    isLeapYear(dateObj) {
        const y = dateObj.getFullYear();
        return (!(y % 4) && !!(y % 100)) || !(y % 400);
    }
    /**
     * comparison of dates
     * @param {Object} date1 - target for comparison
     * @param {Object} date2 - target for comparison
     * @returns {Boolean} whether the dates are the same day (times are ignored)
     */
    isSameDay(date1, date2) {
        return this.format(date1, "YYYYMMDD") === this.format(date2, "YYYYMMDD");
    }
    /**
     * setting a locale
     * @param {String} [code] - language code
     * @returns {String} current language code
     */
    locale(code) {
        if (code) {
            if (code !== "en" && DateTime.isCommonJS()) {
                require(`./locale/${code}`);
            }
            DateTime.lang = code;
        }
        return DateTime.lang;
    }
    /**
     * getting a definition of locale
     * @param {String} code - language code
     * @returns {Object} definition of locale
     */
    getLocales(code) {
        return DateTime.locales[code || DateTime.lang];
    }
    /**
     * adding a new definition of locale
     * @param {String} code - language code
     * @param {Object} options - definition of locale
     * @returns {void}
     */
    setLocales(code, options) {
        const copy = function (src, proto) {
            const Locale = class {
            };
            Locale.prototype = proto;
            const dst = new Locale();
            for (const key in src) {
                if (src.hasOwnProperty(key)) {
                    dst[key] = src[key];
                }
            }
            return dst;
        }, base = DateTime.locales[code] || DateTime.locales.en, locale = copy(options, base);
        if (options.formatter) {
            locale.formatter = copy(options.formatter, base.formatter);
        }
        if (options.parser) {
            locale.parser = copy(options.parser, base.parser);
        }
        DateTime.locales[code] = locale;
    }
}
DateTime.lang = "en";
DateTime.locales = {
    en: {
        MMMM: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
        MMM: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
        dddd: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
        ddd: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
        dd: ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"],
        A: ["AM", "PM"],
        formatter: {
            YYYY: function (d) { return `000${d.getFullYear()}`.slice(-4); },
            YY: function (d) { return `0${d.getFullYear()}`.slice(-2); },
            Y: function (d) { return `${d.getFullYear()}`; },
            MMMM: function (d) { return this.MMMM[d.getMonth()]; },
            MMM: function (d) { return this.MMM[d.getMonth()]; },
            MM: function (d) { return `0${d.getMonth() + 1}`.slice(-2); },
            M: function (d) { return `${d.getMonth() + 1}`; },
            DD: function (d) { return `0${d.getDate()}`.slice(-2); },
            D: function (d) { return `${d.getDate()}`; },
            HH: function (d) { return `0${d.getHours()}`.slice(-2); },
            H: function (d) { return `${d.getHours()}`; },
            A: function (d) { return this.A[(d.getHours() > 11 ? 1 : 0)]; },
            hh: function (d) { return `0${d.getHours() % 12 || 12}`.slice(-2); },
            h: function (d) { return `${d.getHours() % 12 || 12}`; },
            mm: function (d) { return `0${d.getMinutes()}`.slice(-2); },
            m: function (d) { return `${d.getMinutes()}`; },
            ss: function (d) { return `0${d.getSeconds()}`.slice(-2); },
            s: function (d) { return `${d.getSeconds()}`; },
            SSS: function (d) { return `00${d.getMilliseconds()}`.slice(-3); },
            SS: function (d) { return `0${d.getMilliseconds() / 10 | 0}`.slice(-2); },
            S: function (d) { return `${d.getMilliseconds() / 100 | 0}`; },
            dddd: function (d) { return this.dddd[d.getDay()]; },
            ddd: function (d) { return this.ddd[d.getDay()]; },
            dd: function (d) { return this.dd[d.getDay()]; },
            Z: function (d) {
                const offset = d.utc ? 0 : d.getTimezoneOffset() / 0.6;
                return (offset > 0 ? "-" : "+") + `000${Math.abs(offset - offset % 100 * 0.4)}`.slice(-4);
            },
            post: function (str) { return str; }
        },
        parser: {
            find: function (array, str) {
                let index = -1, length = 0;
                for (let i = 0, len = array.length, item; i < len; i++) {
                    item = array[i];
                    if (!str.indexOf(item) && item.length > length) {
                        index = i;
                        length = item.length;
                    }
                }
                return { index: index, length: length };
            },
            MMMM: function (str) {
                return this.parser.find(this.MMMM, str);
            },
            MMM: function (str) {
                return this.parser.find(this.MMM, str);
            },
            A: function (str) {
                return this.parser.find(this.A, str);
            },
            h: function (h, a) { return (h === 12 ? 0 : h) + a * 12; },
            pre: function (str) { return str; }
        },
        zoneOffsetCodes: {
            "Y": "GMT-12:00", "X": "GMT-11:00", "W": "GMT-10:00", "V†": "GMT-09:30", "V": "GMT-09:00",
            "U": "GMT-08:00", "T": "GMT-07:00", "S": "GMT-06:00", "R": "GMT-05:00", "Q": "GMT-04:00",
            "P†": "GMT-03:30", "P": "GMT-03:00", "O": "GMT-02:00", "N": "GMT-01:00", "Z": "GMT-00:00",
            "A": "GMT+01:00", "B": "GMT+02:00", "C": "GMT+03:00", "C†": "GMT+03:30", "D": "GMT+04:00",
            "D†": "GMT+04:30", "E": "GMT+05:00", "E†": "GMT+05:30", "E*": "GMT+05:45", "F": "GMT+06:00",
            "F†": "GMT+06:30", "G": "GMT+07:00", "H": "GMT+08:00", "H†": "GMT+08:30", "H*": "GMT+08:45",
            "I": "GMT+09:00", "I†": "GMT+09:30", "K": "GMT+10:00", "K†": "GMT+10:30", "L": "GMT+11:00",
            "M": "GMT+12:00", "M*": "GMT+12:45", "M†": "GMT+13:00"
        }
    }
};
exports.default = new DateTime();
//# sourceMappingURL=date-and-time.js.map