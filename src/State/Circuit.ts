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
    update(dt: number)

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

    update(dt: number) {
        this._blocks.forEach(block => block.update(dt))
    }

    remove() {
        this.emitEvent(CircuitEventType.Removed)
        this.subscribers.clear()
    }

    constructor(def: CircuitDefinition)
    {
        // Create blocks
        const blocks = def.blocks.map(funcDef => getFunctionBlock(funcDef))
        // Set block input sources
        def.blocks.forEach((block, blockIndex) => {
            block.inputs.forEach((input, inputIndex) => {
                if (input.source) {
                    const { blockNum, outputNum } = input.source
                    const sourcePin = blocks[blockNum].outputs[outputNum]
                    blocks[blockIndex].inputs[inputIndex].setSource(sourcePin)
                }
            })
        })
        this._blocks = new Set(blocks)
    }

    protected _blocks: Set<FunctionBlock>

    protected subscribers = new Set<Subscriber<CircuitEvent>>()
    
    protected emitEvent(type: CircuitEventType) {
        const event = { type, target: this }
        this.subscribers.forEach(fn => fn(event))
    }
}