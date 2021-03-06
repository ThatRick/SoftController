import { FunctionBlock, FunctionBlockInterface, FunctionInstanceDefinition } from "./FunctionBlock.js";
import { IOPinInterface } from './IOPin.js';
import { FunctionTypeName, getFunctionBlock } from './FunctionLib.js'
import { Subscriber } from "./CommonTypes.js";
import { EventEmitter } from "../Lib/Events.js";

///////////////////////////////
//          Circuit
///////////////////////////////

export const enum CircuitEventType
{
    BlockAdded,
    BlockRemoved,
    Connected,
    Disconnected,
    Removed
}

interface CircuitEvent {
    type: CircuitEventType
    source: CircuitInterface
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

    update(dt: number) {
        this._blocks.forEach(block => block.update(dt))
    }

    remove() {
        this.events.emit(CircuitEventType.Removed)
        this.events.clear()
    }

    events = new EventEmitter<CircuitEvent>(this)

    constructor(def: CircuitDefinition, circBlock: FunctionBlock)
    {
        this.circBlock = circBlock
        // Create blocks
        const blocks = def.blocks.map(funcDef => getFunctionBlock(funcDef))
        // Set block input sources
        def.blocks.forEach((block, blockIndex) => {
            if (block.inputs) {
                Object.entries(block.inputs).forEach(([inputName, inputDef]) => {
                    if (inputDef.source) {
                        const input = blocks[blockIndex].inputs.find(input => input.name == inputName)
                        if (!input) console.error('Invalid input name in block instance definition:', inputName)
                        else {
                            const { blockNum, outputNum, inverted=false } = inputDef.source
                            // Connect to circuit input (blockNum = -1) or block output (blockNum = 0..n)
                            const sourcePin = (blockNum == -1)
                                ? circBlock.inputs[outputNum]
                                : blocks[blockNum].outputs[outputNum]
                            input.setSource(sourcePin)
                            input.setInverted(inverted)
                        }
                    }
                })
            }
        })
        this._blocks = new Set(blocks)
    }

    protected circBlock: FunctionBlock

    protected _blocks: Set<FunctionBlock>

}