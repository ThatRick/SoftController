import { FunctionBlockInterface } from "./FunctionBlock.js";


///////////////////////////////
//          Circuit
///////////////////////////////


enum CircuitEvent {
    BlockAdded,
    BlockRemoved
}
export interface ICircuit extends FunctionBlockInterface
{
    blocks: FunctionBlockInterface[]
}