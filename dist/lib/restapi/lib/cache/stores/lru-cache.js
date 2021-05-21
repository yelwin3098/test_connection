"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * LRUCache
 */
// This will be a proper iterable 'Map' in engines that support it,
// or a fakey-fake PseudoMap in older versions.
const pseudomap_1 = require("./pseudomap");
const util = __importStar(require("util"));
// A linked list to keep track of recently-used-ness
const yallist_1 = require("./yallist");
// use symbols if possible, otherwise just _props
const symbols = {};
const hasSymbol = typeof Symbol === "function";
let makeSymbol;
if (hasSymbol) {
    makeSymbol = function (key) {
        return Symbol.for(key);
    };
}
else {
    makeSymbol = function (key) {
        return `_${key}`;
    };
}
function priv(obj, key, val) {
    let sym;
    if (symbols[key]) {
        sym = symbols[key];
    }
    else {
        sym = makeSymbol(key);
        symbols[key] = sym;
    }
    if (arguments.length === 2) {
        return obj[sym];
    }
    else {
        obj[sym] = val;
        return val;
    }
}
function naiveLength() {
    return 1;
}
// lruList is a yallist where the head is the youngest
// item, and the tail is the oldest.  the list contains the Hit
// objects as the entries.
// Each Hit object has a reference to its Yallist.Node.  This
// never changes.
//
// cache is a Map (or PseudoMap) that matches the keys to
// the Yallist.Node object.
class LRUCache {
    constructor(options) {
        if (typeof options === "number") {
            options = { max: options };
        }
        if (!options) {
            options = {};
        }
        const max = priv(this, "max", options.max);
        // Kind of weird to have a default max of Infinity, but oh well.
        if (!max || !(typeof max === "number") || max <= 0) {
            priv(this, "max", Infinity);
        }
        let lc = options.length || naiveLength;
        if (typeof lc !== "function") {
            lc = naiveLength;
        }
        priv(this, "lengthCalculator", lc);
        priv(this, "allowStale", options.stale || false);
        priv(this, "maxAge", options.maxAge || 0);
        priv(this, "dispose", options.dispose);
        this.reset();
    }
    // resize the cache when the max changes.
    get max() {
        return priv(this, "max");
    }
    set max(mL) {
        if (!mL || !(typeof mL === "number") || mL <= 0) {
            mL = Infinity;
        }
        priv(this, "max", mL);
        trim(this);
    }
    get allowStale() {
        return priv(this, "allowStale");
    }
    set allowStale(allowStale) {
        priv(this, "allowStale", !!allowStale);
    }
    get maxAge() {
        return priv(this, "maxAge");
    }
    set maxAge(mA) {
        if (!mA || !(typeof mA === "number") || mA < 0) {
            mA = 0;
        }
        priv(this, "maxAge", mA);
        trim(this);
    }
    get lengthCalculator() {
        return priv(this, "lengthCalculator");
    }
    set lengthCalculator(lC) {
        if (typeof lC !== "function") {
            lC = naiveLength;
        }
        if (lC !== priv(this, "lengthCalculator")) {
            priv(this, "lengthCalculator", lC);
            priv(this, "length", 0);
            priv(this, "lruList").forEach((hit) => {
                hit.length = priv(this, "lengthCalculator").call(this, hit.value, hit.key);
                priv(this, "length", priv(this, "length") + hit.length);
            }, this);
        }
        trim(this);
    }
    get length() {
        return priv(this, "length");
    }
    get itemCount() {
        return priv(this, "lruList").length;
    }
    rforEach(fn, thisp) {
        thisp = thisp || this;
        for (let walker = priv(this, "lruList").tail; walker !== null;) {
            const prev = walker.prev;
            LRUCache.forEachStep(this, fn, walker, thisp);
            walker = prev;
        }
    }
    static forEachStep(self, fn, node, thisp) {
        let hit = node.value;
        if (isStale(self, hit)) {
            del(self, node);
            if (!priv(self, "allowStale")) {
                hit = undefined;
            }
        }
        if (hit) {
            fn.call(thisp, hit.value, hit.key, self);
        }
    }
    forEach(fn, thisp) {
        thisp = thisp || this;
        for (let walker = priv(this, "lruList").head; walker !== null;) {
            const next = walker.next;
            LRUCache.forEachStep(this, fn, walker, thisp);
            walker = next;
        }
    }
    keys() {
        return priv(this, "lruList").toArray().map((k) => {
            return k.key;
        }, this);
    }
    values() {
        return priv(this, "lruList").toArray().map((k) => {
            return k.value;
        }, this);
    }
    reset() {
        if (priv(this, "dispose") &&
            priv(this, "lruList") &&
            priv(this, "lruList").length) {
            priv(this, "lruList").forEach((hit) => {
                priv(this, "dispose").call(this, hit.key, hit.value);
            }, this);
        }
        priv(this, "cache", new pseudomap_1.PseudoMap()); // hash of items by key
        priv(this, "lruList", new yallist_1.Yallist()); // list of items in order of use recency
        priv(this, "length", 0); // length of items in the list
    }
    dump() {
        return priv(this, "lruList").map((hit) => {
            if (!isStale(this, hit)) {
                return {
                    k: hit.key,
                    v: hit.value,
                    e: hit.now + (hit.maxAge || 0)
                };
            }
        }, this).toArray().filter((h) => {
            return h;
        });
    }
    dumpLru() {
        return priv(this, "lruList");
    }
    inspect(n, opts) {
        let str = "LRUCache {";
        let extras = false;
        const as = priv(this, "allowStale");
        if (as) {
            str += "\n  allowStale: true";
            extras = true;
        }
        const max = priv(this, "max");
        if (max && max !== Infinity) {
            if (extras) {
                str += ",";
            }
            str += "\n  max: " + util.inspect(max, opts);
            extras = true;
        }
        const maxAge = priv(this, "maxAge");
        if (maxAge) {
            if (extras) {
                str += ",";
            }
            str += "\n  maxAge: " + util.inspect(maxAge, opts);
            extras = true;
        }
        const lc = priv(this, "lengthCalculator");
        if (lc && lc !== naiveLength) {
            if (extras) {
                str += ",";
            }
            str += "\n  length: " + util.inspect(priv(this, "length"), opts);
            extras = true;
        }
        let didFirst = false;
        priv(this, "lruList").forEach((item) => {
            if (didFirst) {
                str += ",\n  ";
            }
            else {
                if (extras) {
                    str += ",\n";
                }
                didFirst = true;
                str += "\n  ";
            }
            const key = util.inspect(item.key).split("\n").join("\n  ");
            let val = { value: item.value };
            if (item.maxAge !== maxAge) {
                val.maxAge = item.maxAge;
            }
            if (lc !== naiveLength) {
                val.length = item.length;
            }
            if (isStale(this, item)) {
                val.stale = true;
            }
            val = util.inspect(val, opts).split("\n").join("\n  ");
            str += `${key} => ${val}`;
        });
        if (didFirst || extras) {
            str += "\n";
        }
        str += "}";
        return str;
    }
    set(key, value, maxAge) {
        maxAge = maxAge || priv(this, "maxAge");
        const now = maxAge ? Date.now() : 0;
        const len = priv(this, "lengthCalculator").call(this, value, key);
        if (priv(this, "cache").has(key)) {
            if (len > priv(this, "max")) {
                del(this, priv(this, "cache").get(key));
                return false;
            }
            const node = priv(this, "cache").get(key);
            const item = node.value;
            // dispose of the old one before overwriting
            if (priv(this, "dispose")) {
                priv(this, "dispose").call(this, key, item.value);
            }
            item.now = now;
            item.maxAge = maxAge;
            item.value = value;
            priv(this, "length", priv(this, "length") + (len - item.length));
            item.length = len;
            this.get(key);
            trim(this);
            return true;
        }
        const hit = new Entry(key, value, len, now, maxAge);
        // oversized objects fall out of cache automatically.
        if (hit.length > priv(this, "max")) {
            if (priv(this, "dispose")) {
                priv(this, "dispose").call(this, key, value);
            }
            return false;
        }
        priv(this, "length", priv(this, "length") + hit.length);
        priv(this, "lruList").unshift(hit);
        priv(this, "cache").set(key, priv(this, "lruList").head);
        trim(this);
        return true;
    }
    has(key) {
        if (!priv(this, "cache").has(key))
            return false;
        const hit = priv(this, "cache").get(key).value;
        if (isStale(this, hit)) {
            return false;
        }
        return true;
    }
    get(key) {
        return get(this, key, true);
    }
    peek(key) {
        return get(this, key, false);
    }
    pop() {
        const node = priv(this, "lruList").tail;
        if (!node)
            return undefined;
        del(this, node);
        return node.value;
    }
    del(key) {
        del(this, priv(this, "cache").get(key));
    }
    load(arr) {
        // reset the cache
        this.reset();
        const now = Date.now();
        // A previous serialized cache has the most recent items first
        for (let l = arr.length - 1; l >= 0; l--) {
            const hit = arr[l];
            const expiresAt = hit.e || 0;
            if (expiresAt === 0) {
                // the item was created without expiration in a non aged cache
                this.set(hit.k, hit.v);
            }
            else {
                const maxAge = expiresAt - now;
                // dont add already expired items
                if (maxAge > 0) {
                    this.set(hit.k, hit.v, maxAge);
                }
            }
        }
    }
    prune() {
        const self = this;
        priv(this, "cache").forEach((value, key) => {
            get(self, key, false);
        });
    }
}
exports.LRUCache = LRUCache;
function get(self, key, doUse) {
    const node = priv(self, "cache").get(key);
    let hit;
    if (node) {
        hit = node.value;
        if (isStale(self, hit)) {
            del(self, node);
            if (!priv(self, "allowStale"))
                hit = undefined;
        }
        else {
            if (doUse) {
                priv(self, "lruList").unshiftNode(node);
            }
        }
        if (hit)
            hit = hit.value;
    }
    return hit;
}
function isStale(self, hit) {
    if (!hit || (!hit.maxAge && !priv(self, "maxAge"))) {
        return false;
    }
    let stale = false;
    const diff = Date.now() - hit.now;
    if (hit.maxAge) {
        stale = diff > hit.maxAge;
    }
    else {
        stale = priv(self, "maxAge") && (diff > priv(self, "maxAge"));
    }
    return stale;
}
function trim(self) {
    if (priv(self, "length") > priv(self, "max")) {
        for (let walker = priv(self, "lruList").tail; priv(self, "length") > priv(self, "max") && walker !== null;) {
            // We know that we're about to delete this one, and also
            // what the next least recently used key will be, so just
            // go ahead and set it now.
            const prev = walker.prev;
            del(self, walker);
            walker = prev;
        }
    }
}
function del(self, node) {
    if (node) {
        const hit = node.value;
        if (priv(self, "dispose")) {
            priv(self, "dispose").call(this, hit.key, hit.value);
        }
        priv(self, "length", priv(self, "length") - hit.length);
        priv(self, "cache").delete(hit.key);
        priv(self, "lruList").removeNode(node);
    }
}
// classy, since V8 prefers predictable objects.
class Entry {
    constructor(key, value, length, now, maxAge) {
        this.key = key;
        this.value = value;
        this.length = length;
        this.now = now;
        this.maxAge = maxAge || 0;
    }
}
exports.Entry = Entry;
//# sourceMappingURL=lru-cache.js.map