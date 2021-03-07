export class EventEmitter {
    constructor(eventSource) {
        this.eventSource = eventSource;
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
        if (this.subscribers.size == 0)
            return;
        const event = { type, source: this.eventSource };
        this.subscribers.forEach((typeMask, fn) => {
            if (typeMask == null || ((1 << type) & typeMask))
                fn(event);
        });
    }
    clear() {
        this.subscribers.clear();
    }
}
