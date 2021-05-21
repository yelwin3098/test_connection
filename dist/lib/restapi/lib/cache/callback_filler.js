"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class CallbackFiller {
    constructor() {
        this.queues = {};
    }
    fill(key, err, data) {
        const waiting = this.queues[key];
        delete this.queues[key];
        if (waiting && waiting.length) {
            waiting.forEach((task) => {
                (task.cb)(err, data);
            });
        }
    }
    has(key) {
        return this.queues[key];
    }
    add(key, funcObj) {
        if (this.queues[key]) {
            this.queues[key].push(funcObj);
        }
        else {
            this.queues[key] = [funcObj];
        }
    }
}
exports.CallbackFiller = CallbackFiller;
//# sourceMappingURL=callback_filler.js.map