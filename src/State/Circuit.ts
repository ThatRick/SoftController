import { FunctionBlock, FunctionBlockInterface, FunctionInstanceDefinition } from "./FunctionBlock.js";
import { IOPinInterface } from './IOPin.js';
import { FunctionTypeName, getFunctionBlock } from './FunctionLib.js'
import { Subscriber } from "./CommonTypes.js";

///////////////////////////////
//          Circuit
///////////////////////////////

enum CircuitEventType
{
    BlockAdded,
    BlockRemoved,
    Connected,
    Disconnected,
    Removed
}

interface CircuitEvent {
    target: CircuitInterface
    type: CircuitEventType
}

export interface CircuitDefinition
{
    blocks: FunctionInstanceDefinition[]
}

export interface CircuitInterface
{
    readonly blocks: FunctionBlockInterface[]
    addBlock(blockDef: FunctionInstanceDefinition)
    removeBlock(block: FunctionBlockInterface)
    connect(inputPin: IOPinInterface, outputPin: IOPinInterface, inverted?: boolean)
    disconnect(inputPin: IOPinInterface)

    subscribe(obj: Subscriber<CircuitEvent>): void
    unsubscribe(obj: Subscriber<CircuitEvent>): void

    remove(): void
}

export default class Circuit implements CircuitInterface
{
    get blocks() { return Array.from(this._blocks.values()) }
    addBlock(def: FunctionInstanceDefinition) {
        const block = getFunctionBlock(def)
        this._blocks.add(block)
    }
    removeBlock(block: FunctionBlockInterface) {}
    connect(inputPin: IOPinInterface, outputPin: IOPinInterface, inverted?: boolean) {}
    disconnect(inputPin: IOPinInterface) {}
    subscribe(obj: Subscriber<CircuitEvent>) {
        this.subscribers.add(obj)
    }
    unsubscribe(obj: Subscriber<CircuitEvent>) {
        this.subscribers.delete(obj)
    }

    remove() {
        this.emitEvent(CircuitEventType.Removed)
        this.subscribers.clear()
    }

    constructor(def: CircuitDefinition)
    {
        def.blocks.forEach(funcDef => {
            const block = getFunctionBlock(funcDef)
            this._blocks.add(block)
        })
    }

    protected _blocks = new Set<FunctionBlock>()

    protected subscribers = new Set<Subscriber<CircuitEvent>>()
    
    protected emitEvent(type: CircuitEventType) {
        const event = { type, target: this }
        this.subscribers.forEach(fn => fn(event))
    }
}