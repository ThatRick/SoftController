import { IODataType } from '../Controller/ControllerDataTypes.js'

interface IOPin
{
    type: 'input' | 'output'
    value: number
    name?: string
    datatype: IODataType
    ioNum: number
    block: IFunctionBlock
    source?: { value: number }
    inverted?: boolean
}

interface IODefinition
{
    value: number,
    dataType: IODataType
    name?: string,
}

interface FunctionBlockDefinition
{
    name: string
    inputs: IODefinition[]
    outputs: IODefinition[]
}

interface IFunctionBlock {
    type: 'function' | 'circuit'
    name: string
    symbol?: string
    description: string
    inputs: IOPin[]
    outputs: IOPin[]
    parentCircuit?: ICircuit
    update(dt: number): void
}

interface ICircuit extends IFunctionBlock
{
    blocks: IFunctionBlock[]
}

type Subscriber = () => void

class IO
{
    name?: string
    get ioNum() {return this.getIONum(this)}
    source?: { value: number }
    inverted?: boolean
    
    get value() { return this._value }
    setValue(value: number) {
        if (this._value != value) {
            this._value = value
            this.subscribers.forEach(fn => fn())
        }
    }

    subscribe(fn: Subscriber) {
        this.subscribers.add(fn)
    }
    unsubscribe(fn: Subscriber) {
        this.subscribers.delete(fn)
    }

    constructor (
        public type: 'input' | 'output',
        value: number,
        public datatype: IODataType,
        public block: IFunctionBlock,
        private getIONum: (io: IO) => number,
        name?: string,
    ) {
        this.name = name
        this._value = value
    }
    private _value: number

    private subscribers = new Set<Subscriber>()
}


export class FunctionBlock implements IFunctionBlock
{
    type: 'function'
    name: string
    symbol?: string
    description: string
    inputs: IO[]
    outputs: IO[]
    parentCircuit?: ICircuit
    
    update(dt: number) {
        this.updateInputs()
        const inputs = this.inputs.map(input => input.value)
        let outputs = this.outputs.map(outputs => outputs.value)
        outputs = this.run?.(inputs, outputs, dt)
        outputs.forEach((value, i) => this.outputs[i].setValue(value))
    }
    protected run(inputs: number[], outputs: number[], dt: number): number[] { return }

    constructor(def: FunctionBlockDefinition) {
        this.inputs = def.inputs.map(input => {
            return new IO('input', input.value, input.dataType, this, this.getIONum, input.name )
        })
        this.outputs = def.outputs.map(output => {
            return new IO('output', output.value, output.dataType, this, this.getIONum, output.name )
        })
    }

    private updateInputs() {
        this.inputs.forEach(input => {
            if (input.source) {
                let newValue = input.source.value
                if (input.inverted) newValue = (newValue) ? 0 : 1
                else if (input.datatype == IODataType.INTEGER) newValue = Math.trunc(newValue)
                input.setValue(newValue)
            }
        })
    }

    private getIONum = (io: IO) => {
        if (io.type == 'input') return this.inputs.findIndex(input => input == io)
        else return this.outputs.findIndex(output => output == io) + this.inputs.length
    }

}

class AND extends FunctionBlock
{
    constructor() {
        super({
            name: 'AND',
            inputs: [
                { value: 1, dataType: IODataType.BINARY },
                { value: 1, dataType: IODataType.BINARY },
            ],
            outputs: [
                { value: 1, dataType: IODataType.BINARY },
            ]
        })
    }
    protected run(inputs: number[]): number[] {
        let out = inputs.reduce((output, input) => output *= input, 1) ? 1 : 0
        return [out]
    }
}

class RS extends FunctionBlock
{
    constructor() {
        super({
            name: 'RS',
            inputs: [
                { name: 'R', value: 0, dataType: IODataType.BINARY },
                { name: 'S', value: 0, dataType: IODataType.BINARY },
            ],
            outputs: [
                { value: 0, dataType: IODataType.BINARY },
            ]
        })
    }
    protected run(inputs: number[], outputs: number[]): number[] {
        const [R, S] = inputs
        let [out] = outputs
        S && (out = 1)
        R && (out = 0)
        return [out]
    }
}