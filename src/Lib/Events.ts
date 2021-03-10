export type Subscriber<T> = (event: T) => void

interface Event {
    type:   number
    source: Object
} 

export class EventEmitter<T extends Event>
{
    subscribe(fn: Subscriber<T>, eventMask?: number[]): void {
        const typeMask = eventMask ? eventMask.reduce((mask, type) => mask += (1 << type), 0) : null
        this.subscribers.set(fn, typeMask)
    }
    unsubscribe(fn: Subscriber<T>): void {
        const successful = this.subscribers.delete(fn)
        if (!successful) console.error('Could not unsubscribe event listener', fn, [...this.subscribers.keys()])
    }

    emit(type: number) {
        if (this.subscribers.size == 0) return
        const event = { type, source: this.eventSource }
        this.subscribers.forEach((typeMask, fn) => {
            if (typeMask == null || ((1 << type) & typeMask)) fn(event)
        })
    }

    clear() {
        this.subscribers.clear()
    }

    constructor(protected eventSource: Object) {

    }
    
    protected subscribers = new Map<Subscriber<Event>, number>()
}