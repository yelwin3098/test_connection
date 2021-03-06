"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/** @module cacheManager/caching */
/*jshint maxcomplexity:15*/
const callback_filler_1 = require("./callback_filler");
/**
 * Generic caching interface that wraps any caching library with a compatible interface.
 *
 * @param {object} args
 * @param {object|string} args.store - The store must at least have `set` and a `get` functions.
 * @param {function} [args.isCacheableValue] - A callback function which is called
 *   with every value returned from cache or from a wrapped function. This lets you specify
 *   which values should and should not be cached. If the function returns true, it will be
 *   stored in cache. By default it caches everything except undefined.
 */
function caching(args) {
    args = args || {};
    const self = {};
    if (typeof args.store === "object") {
        if (args.store.create) {
            self.store = args.store.create(args);
        }
        else {
            self.store = args.store;
        }
    }
    else {
        const storeName = args.store || "memory";
        self.store = require(`./stores/${storeName}`).create(args);
    }
    // do we handle a cache error the same as a cache miss?
    self.ignoreCacheErrors = args.ignoreCacheErrors || false;
    const callbackFiller = new callback_filler_1.CallbackFiller();
    if (typeof args.isCacheableValue === "function") {
        self._isCacheableValue = args.isCacheableValue;
    }
    else if (typeof self.store.isCacheableValue === "function") {
        self._isCacheableValue = self.store.isCacheableValue;
    }
    else {
        self._isCacheableValue = (value) => {
            return value !== undefined;
        };
    }
    function wrapPromise(key, promise, options) {
        return new Promise((resolve, reject) => {
            self.wrap(key, function (cb) {
                Promise.resolve()
                    .then(promise)
                    .then((result) => {
                    cb(undefined, result);
                })
                    .catch((err) => {
                    cb(err, undefined);
                });
            }, options, (err, result) => {
                if (err) {
                    return reject(err);
                }
                resolve(result);
            });
        });
    }
    /**
     * Wraps a function in cache. I.e., the first time the function is run,
     * its results are stored in cache so subsequent calls retrieve from cache
     * instead of calling the function.
     *
     * @function
     * @name wrap
     *
     * @param {string} key - The cache key to use in cache operations
     * @param {function} work - The function to wrap
     * @param {object} [options] - options passed to `set` function
     * @param {function} cb
     *
     * @example
     *   var key = 'user_' + userId;
     *   cache.wrap(key, function(cb) {
     *       User.get(userId, cb);
     *   }, function(err, user) {
     *       console.log(user);
     *   });
     */
    self.wrap = function (key, work, options, cb) {
        if (typeof options === "function") {
            cb = options;
            options = {};
        }
        if (!cb) {
            return wrapPromise(key, work, options);
        }
        const hasKey = callbackFiller.has(key);
        callbackFiller.add(key, { cb: cb });
        if (hasKey) {
            return;
        }
        self.store.get(key, options, (err, result) => {
            if (err && (!self.ignoreCacheErrors)) {
                callbackFiller.fill(key, err);
            }
            else if (self._isCacheableValue(result)) {
                callbackFiller.fill(key, undefined, result);
            }
            else {
                work((err, data) => {
                    if (err) {
                        callbackFiller.fill(key, err);
                        return;
                    }
                    if (!self._isCacheableValue(data)) {
                        callbackFiller.fill(key, undefined, data);
                        return;
                    }
                    if (options && typeof options.ttl === "function") {
                        options.ttl = options.ttl(data);
                    }
                    self.store.set(key, data, options, (err) => {
                        if (err && (!self.ignoreCacheErrors)) {
                            callbackFiller.fill(key, err);
                        }
                        else {
                            callbackFiller.fill(key, undefined, data);
                        }
                    });
                });
            }
        });
    };
    /**
     * Binds to the underlying store's `get` function.
     * @function
     * @name get
     */
    self.get = self.store.get.bind(self.store);
    /**
     * Binds to the underlying store's `set` function.
     * @function
     * @name set
     */
    self.set = self.store.set.bind(self.store);
    /**
     * Binds to the underlying store's `del` function if it exists.
     * @function
     * @name del
     */
    if (typeof self.store.del === "function") {
        self.del = self.store.del.bind(self.store);
    }
    /**
     * Binds to the underlying store's `setex` function if it exists.
     * @function
     * @name setex
     */
    if (typeof self.store.setex === "function") {
        self.setex = self.store.setex.bind(self.store);
    }
    /**
     * Binds to the underlying store's `reset` function if it exists.
     * @function
     * @name reset
     */
    if (typeof self.store.reset === "function") {
        self.reset = self.store.reset.bind(self.store);
    }
    /**
     * Binds to the underlying store's `keys` function if it exists.
     * @function
     * @name keys
     */
    if (typeof self.store.keys === "function") {
        self.keys = self.store.keys.bind(self.store);
    }
    /**
     * Binds to the underlying store's `ttl` function if it exists.
     * @function
     * @name ttl
     */
    if (typeof self.store.ttl === "function") {
        self.ttl = self.store.ttl.bind(self.store);
    }
    return self;
}
exports.caching = caching;
//# sourceMappingURL=caching.js.map