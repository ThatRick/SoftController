import { BlockEventType, FunctionBlock, FunctionBlockInterface, FunctionInstanceDefinition } from "./FunctionBlock.js"
import { IOPinSource } from './IOPin.js'
import { getFunctionBlock } from './FunctionLib.js'
import { EventEmitter } from "../Lib/Events.js"
import { OnlineCircuitInterface } from "./OnlineConnection.js"

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
    circuitOutputSources: { [name: string]: IOPinSource }
}

export interface CircuitInterface
{
    readonly blocks: FunctionBlockInterface[]
    readonly mode: 'online' | 'offline'

    addBlock(blockDef: FunctionInstanceDefinition, index?: number)
    removeBlock(block: FunctionBlockInterface)
    update(dt: number)
    remove()
    getBlockIndex(block: FunctionBlockInterface): number
    setBlockIndex(block: FunctionBlockInterface, newIndex: number)

    setMode(mode: 'online' | 'offline', onlineConnection?: OnlineCircuitInterface): void
}

export default class Circuit implements CircuitInterface
{
    addBlock(def: FunctionInstanceDefinition, index?: number) {
        const block = getFunctionBlock(def)
        block.parentCircuit = this
        if (index != null) {
            this.blocks.splice(index, 0, block)            
            this.blocks.forEach(block => block.events.emit(BlockEventType.CallIndexChanged))
        } else {
            this.blocks.push(block)
        }

        return block
    }

    removeBlock(block: FunctionBlock) {
        // Remove connections to other blocks
        this.blocks.forEach(otherBlock => {
            otherBlock.inputs.forEach(input => {
                if (block.outputs.includes(input.sourceIO)) {
                    input.setSource(null)
                    console.log('connection cleared to removed block')
                }
            })
        })
        const index = this.getBlockIndex(block)
        console.log('removing block with index', index)
        if (index > -1) this.blocks.splice(index, 1)
        this.blocks.forEach(block => block.events.emit(BlockEventType.CallIndexChanged))
    }

    getBlockIndex(block: FunctionBlockInterface) {
        return this.blocks.indexOf(block as FunctionBlock)
    }

    setBlockIndex(block: FunctionBlockInterface, newIndex: number) {
        newIndex = Math.min(newIndex, this.blocks.length - 1)
        newIndex = Math.max(newIndex, 0)
        const currentIndex = this.getBlockIndex(block)
        this.blocks.splice(currentIndex, 1)
        this.blocks.splice(newIndex, 0, block as FunctionBlock)
        this.blocks.forEach(block => block.events.emit(BlockEventType.CallIndexChanged))
    }

    update(dt: number) {
        this.blocks.forEach(block => block.update(dt))
    }

    remove() {
        this.blocks.forEach(block => {
            block.parentCircuit = null
            block.remove()
        })
        this.events.emit(CircuitEventType.Removed)
        this.events.clear()
        
        this.blocks = null
        this.circuitBlock = null
        this.events = null
    }

    get mode() { return this._mode }
    
    setMode(mode: 'online' | 'offline', onlineConnection?: OnlineCircuitInterface) {
        this._onlineConnection ??= onlineConnection
        if (mode == 'offline' ||
            mode == 'online' && this._onlineConnection) {
            this._mode = mode
        }
    }

    blocks: FunctionBlock[]

    events = new EventEmitter<CircuitEvent>(this)

    constructor(def: CircuitDefinition, circuitBlock: FunctionBlock)
    {
        this.circuitBlock = circuitBlock
        // Create blocks
        const blocks = def.blocks.map(funcDef => getFunctionBlock(funcDef))
        // Set this as parent circuit
        blocks.forEach(block => block.parentCircuit = this)

        // Connect block input sources if defined
        def.blocks.forEach((block, blockIndex) => {
            if (block.inputs) {
                Object.entries(block.inputs).forEach(([inputName, inputDef]) => {
                    if (inputDef.source) {
                        const input = blocks[blockIndex].inputs.find(input => input.name == inputName)
                        if (!input) console.error('Invalid input name in block instance definition:', inputName)
                        else {
                            const { blockNum, outputNum, inverted=false } = inputDef.source
                            // Connect to circuit input when blockNum = -1 or block output when blockNum >= 0
                            const sourcePin = (blockNum == -1)
                                ? circuitBlock.inputs[outputNum]
                                : blocks[blockNum].outputs[outputNum]
                            input.setSource(sourcePin)
                            input.setInversion(inverted)
                        }
                    }
                })
            }
        })
        // Connect circuit outputs
        Object.entries(def.circuitOutputSources).forEach(([outputName, sourceIO]) => {
            const output = circuitBlock.outputs.find(output => output.name == outputName)
            if (!output) console.error('Invalid circuit output name in circuit definition:', outputName)
            else {
                const { blockNum, outputNum, inverted=false } = sourceIO
                // Connect to circuit input (blockNum = -1) or block output (blockNum = 0..n)
                const sourcePin = (blockNum == -1)
                    ? circuitBlock.inputs[outputNum]
                    : blocks[blockNum].outputs[outputNum]
                output.setSource(sourcePin)
                output.setInversion(inverted)
            }
        })
        this.blocks = blocks

        console.log(this.blocks)
    }

    protected circuitBlock: FunctionBlock

    protected _mode: 'online' | 'offline' = 'offline'
    protected _onlineConnection: OnlineCircuitInterface
}