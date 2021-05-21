"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * PseudoMap
 */
const hasOwnProperty = Object.prototype.hasOwnProperty;
// Either identical, or both NaN
function same(a, b) {
    return a === b || a !== a && b !== b;
}
class Entry {
    constructor(k, v, i) {
        this.key = k;
        this.value = v;
        this._index = i;
    }
}
exports.Entry = Entry;
function find(data, k) {
    let i;
    let s;
    let key;
    for (i = 0, s = `_${k}`, key = s; hasOwnProperty.call(data, key); key = s + i++) {
        if (same(data[key].key, k))
            return data[key];
    }
}
function set(data, k, v) {
    let i;
    let s;
    let key;
    for (i = 0, s = `_${k}`, key = s; hasOwnProperty.call(data, key); key = s + i++) {
        if (same(data[key].key, k)) {
            data[key].value = v;
            return;
        }
    }
    data.size++;
    data[key] = new Entry(k, v, key);
}
class PseudoMap {
    constructor(set) {
        this.clear();
        if (set) {
            if (set instanceof PseudoMap) {
                set.forEach((value, key) => {
                    this.set(key, value);
                }, this);
            }
            else if (typeof Map === "function" && set instanceof Map) {
                set.forEach((value, key, map) => {
                    this.set(key, value);
                }, this);
            }
            else if (Array.isArray(set)) {
                set.forEach((kv) => {
                    this.set(kv[0], kv[1]);
                }, this);
            }
            else {
                throw new TypeError("invalid argument");
            }
        }
    }
    forEach(fn, thisp) {
        thisp = thisp || this;
        Object.keys(this._data).forEach(function (k) {
            if (k !== "size")
                fn.call(thisp, this._data[k].value, this._data[k].key);
        }, this);
    }
    has(k) {
        return !!find(this._data, k);
    }
    get(k) {
        const res = find(this._data, k);
        return res && res.value;
    }
    set(k, v) {
        set(this._data, k, v);
    }
    delete(k) {
        const res = find(this._data, k);
        if (res) {
            delete this._data[res._index];
            this._data.size--;
        }
    }
    clear() {
        const data = Object.create({});
        data.size = 0;
        this._data = {
            value: data,
            enumerable: false,
            configurable: true,
            writable: false
        };
    }
    get size() {
        return this._data.size;
    }
    get values() {
        throw new Error("iterators are not implemented in this version");
    }
    get keys() {
        throw new Error("iterators are not implemented in this version");
    }
    get entries() {
        throw new Error("iterators are not implemented in this version");
    }
}
exports.PseudoMap = PseudoMap;
//# sourceMappingURL=pseudomap.js.map