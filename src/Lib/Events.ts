export type Subscriber<T> = (event: T) => void

interface Event {
    type:   number
    target: object
} 

export class EventEmitter<T extends Event>
{
    subscribe(fn: Subscriber<T>, eventTypes?: number[]): void {
        const typeMask = eventTypes ? eventTypes.reduce((mask, type) => mask += (1 << type), 0) : null
        console.log('subscribe with type mask', typeMask)
        this.subscribers.set(fn, typeMask)
    }
    unsubscribe(fn: Subscriber<T>): void {
        this.subscribers.delete(fn)
    }

    emit(type: number) {
        const event = { type, target: this }
        this.subscribers.forEach((typeMask, fn) => {
            if (typeMask == null || ((1 << type) & typeMask)) fn(event)
        })
    }

    clear() {
        this.subscribers.clear()
    }

    protected subscribers = new Map<Subscriber<Event>, number>()
}