import { IODataType } from "../Controller/ControllerDataTypes"
import { FunctionBlock } from "./FunctionBlock"

const FunctionInterface =
{
    AND: {
        name: 'AND',
        inputs: {
            0: { value: 1, dataType: IODataType.BINARY },
            1: { value: 1, dataType: IODataType.BINARY },
        },
        outputs: {
            out: { value: 1, dataType: IODataType.BINARY },
        }
    },

    RS: {
        name: 'RS',
        inputs: {
            R: { value: 0, dataType: IODataType.BINARY },
            S: { value: 0, dataType: IODataType.BINARY },
        },
        outputs: {
            out: { value: 0, dataType: IODataType.BINARY },
        }
    }
}

class AND extends FunctionBlock
{
    constructor() { super(FunctionInterface.AND) }
    protected run = (inputs: number[]) => [ inputs.reduce((output, input) => output *= input, 1) ? 1 : 0 ]
}

class RS extends FunctionBlock
{
    constructor() {
        super(FunctionInterface.RS)
    }
    protected run = ([R, S], [out]) => {
        S && (out = 1)
        R && (out = 0)
        return [out]
    }
}

export {
    AND,
    RS
}
