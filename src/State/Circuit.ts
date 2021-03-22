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
    update(dt: number)

    remove(): void
}

export default class Circuit implements CircuitInterface
{
    get blocks() { return Array.from(this._blocks.values()) }

    addBlock(def: FunctionInstanceDefinition) {
        const block = getFunctionBlock(def)
        block.parentCircuit = this
        this._blocks.add(block)
        return block
    }

    removeBlock(block: FunctionBlock) {
        // Remove connections to other blocks
        this._blocks.forEach(otherBlock => {
            otherBlock.inputs.forEach(input => {
                if (block.outputs.includes(input.sourcePin)) {
                    input.setSource(null)
                    console.log('connection cleared to removed block')
                }
            })
        })
        this._blocks.delete(block)
    }

    update(dt: number) {
        this._blocks.forEach(block => block.update(dt))
    }

    remove() {
        this._blocks.forEach(block => block.remove())
        this._blocks.clear()
        this._blocks = null
        this.events.emit(CircuitEventType.Removed)
        this.events.clear()
        this.events = null

        this.circuitBlock = null
    }

    events = new EventEmitter<CircuitEvent>(this)

    constructor(def: CircuitDefinition, circuitBlock: FunctionBlock)
    {
        this.circuitBlock = circuitBlock
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
                                ? circuitBlock.inputs[outputNum]
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

    protected circuitBlock: FunctionBlock

    protected _blocks: Set<FunctionBlock>

}