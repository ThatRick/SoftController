import { EventEmitter } from "../Lib/Events.js"
import Circuit, { CircuitDefinition, CircuitInterface } from "./Circuit.js"
import { Subscriber } from "./CommonTypes.js"
import { FunctionTypeName } from "./FunctionLib.js"
import { IOPin, IOPinDefinition, IOPinInstanceDefinition, IOPinInterface } from "./IOPin.js"


///////////////////////////////
//      Function Block
///////////////////////////////


export interface FunctionTypeDefinition
{
    name:               string
    inputs:             { [name: string]: IOPinDefinition }
    outputs:            { [name: string]: IOPinDefinition }
    symbol?:            string
    description?:       string
    variableInputs?:    VariableIOCountDefinition
    variableOutputs?:   VariableIOCountDefinition
    statics?:           { [name: string]: number }
    circuit?:           CircuitDefinition
}

export interface FunctionInstanceDefinition
{
    typeName:       FunctionTypeName
    inputs?:        IOPinInstanceDefinition[]
    outputs?:       IOPinInstanceDefinition[]
}

interface VariableIOCountDefinition {
    min:            number
    max:            number
    initialCount:   number
    structSize?:    number
}

export const enum BlockEventType {
    InputCount,
    OutputCount,
    Removed,
    Test
}

export interface BlockEvent {
    type:   BlockEventType
    target: FunctionBlockInterface
}

export interface FunctionBlockInterface
{
    readonly typeName:          string
    readonly symbol?:           string
    readonly description:       string
    readonly inputs:            IOPinInterface[]
    readonly outputs:           IOPinInterface[]
    readonly circuit?:          CircuitInterface
    readonly parentCircuit?:    FunctionBlockInterface
    readonly variableInputs?:   VariableIOCountDefinition
    readonly variableOutputs?:  VariableIOCountDefinition
    readonly typeDef:           FunctionTypeDefinition
    readonly events:            EventEmitter<BlockEvent>

    setVariableInputCount(n: number): void
    setVariableOutputCount(n: number): void
    update(dt: number): void

    remove(): void
}


export abstract class FunctionBlock implements FunctionBlockInterface
{
    get         typeName()         { return this._typeName }
    get         symbol()           { return this._symbol }
    get         description()      { return this._description }
    readonly    inputs:            IOPinInterface[]
    readonly    outputs:           IOPinInterface[]
    readonly    circuit?:          CircuitInterface
    get         parentCircuit()    { return this._parentCircuit }
    readonly    variableInputs?:   VariableIOCountDefinition
    readonly    variableOutputs?:  VariableIOCountDefinition
    readonly    typeDef:           FunctionTypeDefinition
    readonly    events =           new EventEmitter<BlockEvent>()


    setVariableInputCount(n: number) {
        if (!this.variableInputs) return
        const { min, max, initialCount: initial, structSize=1 } = this.variableInputs
        if (n < min) n = min
        if (n > max) n = max
        const staticInputsCount = Object.keys(this.typeDef.inputs).length - initial * structSize
        const currentVariableInputsCount = (this.inputs.length - staticInputsCount) / structSize
        console.assert(currentVariableInputsCount % 1 == 0)
        const addition = n - currentVariableInputsCount
        if (addition == 0) return
        // Remove inputs
        if (addition < 0) {     
            const newLength = staticInputsCount + n * structSize
            while (this.inputs.length > newLength) {
                const input = this.inputs.pop()
                input.remove()
            }
        }
        // Add inputs
        if (addition > 0) {    
            const initialInputs = Object.values(this.typeDef.inputs).map(input => {
                const name = input.name ? splitToStringAndNumber(input.name || '')[0] : ''
                return { name, value: input.value, dataType: input.dataType }
            })
            const initialStruct = initialInputs.slice(staticInputsCount, staticInputsCount + structSize)
            const currentLastIndex = this.inputs.length - structSize
            const numberingStart = splitToStringAndNumber(this.inputs[currentLastIndex].name)[1] + 1
            for (let i = 0; i < addition; i++) {
                const numbering = numberingStart + i
                const newInputs = initialStruct.map(({name, value, dataType}) => {
                    return new IOPin('input', value, name+numbering, dataType, this, this.getIONum )
                })
                this.inputs.push(...newInputs)
            }
        }
        this.events.emit(BlockEventType.InputCount)
    }

    setVariableOutputCount(n: number) { /* todo */ }

    update(dt: number) {
        this.updateInputs()
        const inputs = this.inputs.map(input => input.value)
        const outputs = this.outputs.map(outputs => outputs.value)
        let ret = this.run(inputs, outputs, dt)
        if (typeof ret == 'object') {
            outputs.forEach((value, i) => this.outputs[i].setValue(value))
        } else {
            this.outputs[0].setValue(ret)
        }
    }

    remove() {
        this.inputs.forEach(input => input.remove())
        this.outputs.forEach(output => output.remove())
        this.events.emit(BlockEventType.Removed)
        this.events.clear()
    }

    toString() {
        let text = '';
        const addLine = (line: string) => text += (line + '\n');

        addLine('Name: ' + this.typeName)
        addLine('Symbol: ' + this.symbol)
        addLine('Description: ' + this.description)
        addLine('Inputs:')
        this.inputs.forEach(input => addLine('  ' + input.toString()))
        addLine('')
        addLine('Outputs:')
        this.outputs.forEach(output => addLine('  ' + output.toString()))
        addLine('')
        this.parentCircuit && addLine('Parent circuit: ' + this.parentCircuit)
        this.variableInputs && addLine('Variable inputs: ' + this.variableInputs.min + ' - ' + this.variableInputs.max)
        this.variableOutputs && addLine('Variable outputs: ' + this.variableOutputs.min + ' - ' + this.variableOutputs.max)

        return text
    }

    //////////////  CONSTRUCTOR /////////////////
    
    constructor(typeDef: FunctionTypeDefinition)
    {
        this.typeDef = typeDef
        this.inputs = Object.entries(typeDef.inputs).map(([name, input]) => {
            return new IOPin('input', input.value, name, input.dataType, this, this.getIONum )
        })
        this.outputs = Object.entries(typeDef.outputs).map(([name, output]) => {
            return new IOPin('output', output.value, name, output.dataType, this, this.getIONum )
        })
        this._typeName = this.typeDef.name
        this._symbol = this.typeDef.symbol
        this._description = this.typeDef.description
        this.variableInputs = typeDef.variableInputs
        this.variableOutputs = typeDef.variableOutputs
        this.statics = typeDef.statics
        
        if (typeDef.circuit) {
            this.circuit = new Circuit(typeDef.circuit)
        }
    }

    ///////////////  PROTECTED  //////////////////

    protected abstract run: (inputs: number[], outputs: number[], dt: number) => number | number[]

    protected statics: {}

    protected _typeName: string
    protected _symbol: string
    protected _description: string

    protected _parentCircuit?: FunctionBlockInterface

    protected updateInputs() {
        this.inputs.forEach(input => {
            if (input.source) {
                let newValue = input.source.value
                if (input.inverted) newValue = (newValue) ? 0 : 1
                else if (input.datatype == 'INTEGER') newValue = Math.trunc(newValue)
                input.setValue(newValue)
            }
        })
    }

    protected getIONum = (io: IOPinInterface) => {
        if (io.type == 'input') return this.inputs.findIndex(input => input == io)
        else return this.outputs.findIndex(output => output == io) + this.inputs.length
    }

}

///////////////////////////////
//     MISC Functions
///////////////////////////////

const splitToStringAndNumber = (text: string): [s: string, n: number] => {
    const matched = text.match(/(\d+)$/)
    if (!matched) return [text, 0]
    const value = parseInt(matched[0], 10)
    if (isNaN(value)) return [text, 0]
    const strEnd = text.length - matched.length
    const str = text.substring(0, strEnd)
    return [str, value]
}