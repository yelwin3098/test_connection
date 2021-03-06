"use strict";
/**
 * Yallist
 */
Object.defineProperty(exports, "__esModule", { value: true });
class Yallist {
    constructor(list) {
        this.length = 0;
        this.tail = undefined;
        this.head = undefined;
        this.length = 0;
        if (list && typeof list.forEach === "function") {
            list.forEach((item) => {
                this.push(item);
            });
        }
        else if (arguments.length > 0) {
            for (let i = 0, l = arguments.length; i < l; i++) {
                this.push(arguments[i]);
            }
        }
    }
    removeNode(node) {
        if (node.list !== this) {
            throw new Error("removing node which does not belong to this list");
        }
        const next = node.next;
        const prev = node.prev;
        if (next) {
            next.prev = prev;
        }
        if (prev) {
            prev.next = next;
        }
        if (node === this.head) {
            this.head = next;
        }
        if (node === this.tail) {
            this.tail = prev;
        }
        node.list.length--;
        node.next = undefined;
        node.prev = undefined;
        node.list = undefined;
    }
    unshiftNode(node) {
        if (node === this.head) {
            return;
        }
        if (node.list) {
            node.list.removeNode(node);
        }
        const head = this.head;
        node.list = this;
        node.next = head;
        if (head) {
            head.prev = node;
        }
        this.head = node;
        if (!this.tail) {
            this.tail = node;
        }
        this.length++;
    }
    pushNode(node) {
        if (node === this.tail) {
            return;
        }
        if (node.list) {
            node.list.removeNode(node);
        }
        const tail = this.tail;
        node.list = this;
        node.prev = tail;
        if (tail) {
            tail.next = node;
        }
        this.tail = node;
        if (!this.head) {
            this.head = node;
        }
        this.length++;
    }
    push(...args) {
        for (let i = 0, l = args.length; i < l; i++) {
            push(this, args[i]);
        }
        return this.length;
    }
    unshift(...args) {
        for (let i = 0, l = args.length; i < l; i++) {
            unshift(this, args[i]);
        }
        return this.length;
    }
    pop() {
        if (!this.tail) {
            return undefined;
        }
        const res = this.tail.value;
        this.tail = this.tail.prev;
        if (this.tail) {
            this.tail.next = undefined;
        }
        else {
            this.head = undefined;
        }
        this.length--;
        return res;
    }
    shift() {
        if (!this.head) {
            return undefined;
        }
        const res = this.head.value;
        this.head = this.head.next;
        if (this.head) {
            this.head.prev = undefined;
        }
        else {
            this.tail = undefined;
        }
        this.length--;
        return res;
    }
    forEach(fn, thisp) {
        thisp = thisp || this;
        let i;
        let walker;
        for (walker = this.head, i = 0; walker !== null; i++) {
            fn.call(thisp, walker.value, i, this);
            walker = walker.next;
        }
    }
    forEachReverse(fn, thisp) {
        thisp = thisp || this;
        let i;
        let walker;
        for (walker = this.tail, i = this.length - 1; walker !== null; i--) {
            fn.call(thisp, walker.value, i, this);
            walker = walker.prev;
        }
    }
    get(n) {
        let i;
        let walker;
        for (i = 0, walker = this.head; walker !== null && i < n; i++) {
            // abort out of the list early if we hit a cycle
            walker = walker.next;
        }
        if (i === n && walker !== null) {
            return walker.value;
        }
    }
    getReverse(n) {
        let i;
        let walker;
        for (i = 0, walker = this.tail; walker !== null && i < n; i++) {
            // abort out of the list early if we hit a cycle
            walker = walker.prev;
        }
        if (i === n && walker !== null) {
            return walker.value;
        }
    }
    map(fn, thisp) {
        thisp = thisp || this;
        const res = new Yallist();
        for (let walker = this.head; walker !== null;) {
            res.push(fn.call(thisp, walker.value, this));
            walker = walker.next;
        }
        return res;
    }
    mapReverse(fn, thisp) {
        thisp = thisp || this;
        const res = new Yallist();
        for (let walker = this.tail; walker !== null;) {
            res.push(fn.call(thisp, walker.value, this));
            walker = walker.prev;
        }
        return res;
    }
    reduce(fn, initial) {
        let acc;
        let walker = this.head;
        if (arguments.length > 1) {
            acc = initial;
        }
        else if (this.head) {
            walker = this.head.next;
            acc = this.head.value;
        }
        else {
            throw new TypeError("Reduce of empty list with no initial value");
        }
        for (let i = 0; walker !== null; i++) {
            acc = fn(acc, walker.value, i);
            walker = walker.next;
        }
        return acc;
    }
    reduceReverse(fn, initial) {
        let acc;
        let walker = this.tail;
        if (arguments.length > 1) {
            acc = initial;
        }
        else if (this.tail) {
            walker = this.tail.prev;
            acc = this.tail.value;
        }
        else {
            throw new TypeError("Reduce of empty list with no initial value");
        }
        for (let i = this.length - 1; walker !== null; i--) {
            acc = fn(acc, walker.value, i);
            walker = walker.prev;
        }
        return acc;
    }
    toArray() {
        const arr = new Array(this.length);
        for (let i = 0, walker = this.head; walker !== null; i++) {
            arr[i] = walker.value;
            walker = walker.next;
        }
        return arr;
    }
    toArrayReverse() {
        const arr = new Array(this.length);
        for (let i = 0, walker = this.tail; walker !== null; i++) {
            arr[i] = walker.value;
            walker = walker.prev;
        }
        return arr;
    }
    slice(from, to) {
        to = to || this.length;
        if (to < 0) {
            to += this.length;
        }
        from = from || 0;
        if (from < 0) {
            from += this.length;
        }
        const ret = new Yallist();
        if (to < from || to < 0) {
            return ret;
        }
        if (from < 0) {
            from = 0;
        }
        if (to > this.length) {
            to = this.length;
        }
        let i;
        let walker;
        for (i = 0, walker = this.head; walker !== null && i < from; i++) {
            walker = walker.next;
        }
        for (; walker !== null && i < to; i++, walker = walker.next) {
            ret.push(walker.value);
        }
        return ret;
    }
    sliceReverse(from, to) {
        to = to || this.length;
        if (to < 0) {
            to += this.length;
        }
        from = from || 0;
        if (from < 0) {
            from += this.length;
        }
        const ret = new Yallist();
        if (to < from || to < 0) {
            return ret;
        }
        if (from < 0) {
            from = 0;
        }
        if (to > this.length) {
            to = this.length;
        }
        let i;
        let walker;
        for (i = this.length, walker = this.tail; walker !== null && i > to; i--) {
            walker = walker.prev;
        }
        for (; walker !== null && i > from; i--, walker = walker.prev) {
            ret.push(walker.value);
        }
        return ret;
    }
    reverse() {
        const head = this.head;
        const tail = this.tail;
        for (let walker = head; walker !== null; walker = walker.prev) {
            const p = walker.prev;
            walker.prev = walker.next;
            walker.next = p;
        }
        this.head = tail;
        this.tail = head;
        return this;
    }
}
exports.Yallist = Yallist;
function push(self, item) {
    self.tail = new Node(item, self.tail, undefined, self);
    if (!self.head) {
        self.head = self.tail;
    }
    self.length++;
}
function unshift(self, item) {
    self.head = new Node(item, undefined, self.head, self);
    if (!self.tail) {
        self.tail = self.head;
    }
    self.length++;
}
class Node {
    constructor(value, prev, next, list) {
        this.list = list;
        this.value = value;
        if (prev) {
            prev.next = this;
            this.prev = prev;
        }
        else {
            this.prev = undefined;
        }
        if (next) {
            next.prev = this;
            this.next = next;
        }
        else {
            this.next = undefined;
        }
    }
}
exports.Node = Node;
//# sourceMappingURL=yallist.js.map