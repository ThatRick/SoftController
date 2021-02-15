export type Subscriber<T> = (event: T) => void

interface Event {
    type:   unknown
    target: object
} 

export class EventEmitter<T extends Event, Type = Event['type']>
{
    subscribe(obj: Subscriber<T>, eventTypes?: Type[]): void {

    }
    unsubscribe(obj: Subscriber<Event>): void {

    }

    protected emitEvent(type: Type) {
        const event = { type, target: this }
        this.subscribers.forEach(fn => fn(event))
    }

    protected subscribers = new Set<Subscriber<Event>>()
} 