"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * MemoryStore
 */
const lru_cache_1 = require("./lru-cache");
class MemoryStore {
    constructor(args) {
        args = args || {};
        self.name = "memory";
        const Promise = args.promiseDependency || global.Promise;
        this.usePromises = (typeof Promise === "undefined" || args.noPromises) ? false : true;
        const ttl = args.ttl;
        const lruOpts = {
            max: args.max || 500,
            maxAge: (ttl || ttl === 0) ? ttl * 1000 : undefined,
            dispose: args.dispose,
            length: args.length,
            stale: args.stale
        };
        const lruCache = new lru_cache_1.LRUCache(lruOpts);
        this.set = (key, value, options, cb) => {
            if (typeof options === "function") {
                cb = options;
                options = {};
            }
            options = options || {};
            const maxAge = (options.ttl || options.ttl === 0) ? options.ttl * 1000 : lruOpts.maxAge;
            lruCache.set(key, value, maxAge);
            if (cb) {
                process.nextTick(cb.bind(undefined, undefined));
            }
            else if (this.usePromises) {
                return Promise.resolve(value);
            }
        };
        this.get = (key, options, cb) => {
            if (typeof options === "function") {
                cb = options;
            }
            const value = lruCache.get(key);
            if (cb) {
                process.nextTick(cb.bind(undefined, undefined, value));
            }
            else if (this.usePromises) {
                return Promise.resolve(value);
            }
            else {
                return value;
            }
        };
        this.del = (key, options, cb) => {
            if (typeof options === "function") {
                cb = options;
            }
            lruCache.del(key);
            if (cb) {
                process.nextTick(cb.bind(undefined, undefined));
            }
            else if (this.usePromises) {
                return Promise.resolve();
            }
        };
        this.reset = (cb) => {
            lruCache.reset();
            if (cb) {
                process.nextTick(cb.bind(undefined, undefined));
            }
            else if (this.usePromises) {
                return Promise.resolve();
            }
        };
        this.keys = (cb) => {
            const keys = lruCache.keys();
            if (cb) {
                process.nextTick(cb.bind(undefined, undefined, keys));
            }
            else if (this.usePromises) {
                return Promise.resolve(keys);
            }
            else {
                return keys;
            }
        };
    }
}
exports.MemoryStore = MemoryStore;
const methods = {
    create: function (args) {
        return new MemoryStore(args);
    }
};
exports.default = methods;
//# sourceMappingURL=memory.js.map