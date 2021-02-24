export class EventEmitter {
    constructor() {
        this.subscribers = new Map();
    }
    subscribe(fn, eventTypes) {
        const typeMask = eventTypes ? eventTypes.reduce((mask, type) => mask += (1 << type), 0) : null;
        this.subscribers.set(fn, typeMask);
    }
    unsubscribe(fn) {
        this.subscribers.delete(fn);
    }
    emit(type) {
        const event = { type, target: this };
        this.subscribers.forEach((typeMask, fn) => {
            if (typeMask == null || ((1 << type) & typeMask))
                fn(event);
        });
    }
    clear() {
        this.subscribers.clear();
    }
}
