import {alignBytes, BYTES_PER_REF, functionHeaderByteLength, ID, IDatablockHeader, IFunctionHeader, IORef, ITask, REF} from './ControllerDataTypes.js'

export interface IFunctionBlockData extends IFunctionHeader
{
    ioFlags:        number[]
    ioValues:       number[]
    inputRefs:      IORef[]
}

export interface ICircuitData
{
    callIDList:     number[]
    outputRefs:     IORef[]
}

export interface ISystemSector
{
    id:                         number
    version:                    number
    totalMemSize:               number
    dataMemSize:                number
    datablockTablePtr:          number
    datablockTableLength:       number
    dataBlockTableLastUsedID:   number
    datablockTableVersion:      number
    taskListPtr:                number
    taskListLength:             number
}

export interface Message
{
    id:         number
    code:       MessageCode
    params:     unknown
}

export interface MessageResponse
{
    id:         number
    code:       number
    success:    boolean
    data?:      unknown
    error?:     string
}

export const enum MessageCode {
    Undefined,

    CreateController,
    StartController,
    StopController,
    StepController,

    CreateTask,
    SetTaskCallTarget,

    CreateCircuit,
    ConnectCircuitOutput,

    CreateFunctionBlock,
    SetFunctionBlockIOValue,
    SetFunctionBlockIOFlags,
    ConnectFunctionBlockInput,

    GetSystemSector,
    
    GetTaskList,
    GetTask,

    GetDatablockTable,
    GetDatablockHeader,
    GetDatablockRef,
    GetDatablockID,

    GetFunctionBlockHeader,
    GetFunctionBlockData,
    GetFunctionBlockIOValues,
    GetCircuitData,
}

export const MessageCodeNames = [
    'Undefined',

    'CreateController',
    'StartController',
    'StopController',
    'StepController',

    'CreateTask',
    'SetTaskCallTarget',

    'CreateCircuit',
    'ConnectCircuitOutput',

    'CreateFunctionBlock',
    'SetFunctionBlockIOValue',
    'SetFunctionBlockIOFlags',
    'ConnectFunctionBlockInput',

    'GetSystemSector',
    
    'GetTaskList',
    'GetTask',

    'GetDatablockTable',
    'GetDatablockHeader',
    'GetDatablockRef',
    'GetDatablockID',

    'GetFunctionBlockHeader',
    'GetFunctionBlockData',
    'GetFunctionBlockIOValues',
    'GetCircuitData',
]

export interface ICreateControllerParams { dataMemSize: number, datablockTableLength?: number, taskListLength?: number, id?: number }
export interface IStepControllerParams { interval: number, numSteps?: number }
export interface ICreateTaskParams { callTargetID: ID, interval: number, offset?: number }
export interface ISetTaskCallTargetParams { taskID: ID, callTargetID: ID }
export interface ICreateCircuitParams { inputCount: number, outputCount: number, funcCallCount: number }
export interface IConnectCircuitOutputParams { circID: ID, outputNum: number, sourceID: ID, sourceIONum: number }
export interface ICreateFunctionBlockParams { library: number, opcode: number, circuitID?: ID, callIndex?: number, inputCount?: number, outputCount?: number, staticCount?: number }
export interface ISetFunctionBlockIOValueParams { funcID: ID, ioNum: number, value: number }
export interface ISetFunctionBlockIOFlagsParams { funcID: ID, ioNum: number, flags: number }
export interface IConnectFunctionBlockInputParams { targetID: ID, targetInputNum: number, sourceID: ID, sourceIONum: number, inverted?: boolean }


export default interface IControllerInterface
{
///////////////////
//  SYSTEM
//

    createController( dataMemSize: number, datablockTableLength?: number, taskListLength?: number, id?: number ): Promise<boolean>
    startController( interval: number ): Promise<boolean>
    stopController(): Promise<boolean>
    stepController( interval: number, numSteps?: number ): Promise<boolean>

///////////////////
//  MODIFY
//
    // TASK
    createTask( callTargetID: ID, interval: number, offset?: number ): Promise<ID>
    setTaskCallTarget( taskID: ID, callTargetID: ID ): Promise<boolean>

    // CIRCUIT
    createCircuit( inputCount: number, outputCount: number, funcCallCount: number ): Promise<ID>
    connectCircuitOutput( circID: ID, outputNum: number, sourceID: ID, sourceIONum: number ): Promise<boolean>

    // FUNCTION BLOCK
    createFunctionBlock( library: number, opcode: number, circuitID?: ID, callIndex?: number, inputCount?: number, outputCount?: number, staticCount?: number ): Promise<ID>
    setFunctionBlockIOValue( funcID: ID, ioNum: number, value: number ): Promise<boolean>
    setFunctionBlockIOFlags( funcID: ID, ioNum: number, flags: number ): Promise<boolean>
    connectFunctionBlockInput( targetID: ID, targetInputNum: number, sourceID: ID, sourceIONum: number, inverted?: boolean ): Promise<boolean>

///////////////////
//  QUERY
//
    // CONTROLLER
    getSystemSector(): Promise<ISystemSector>

    // TASK
    getTaskList(): Promise<ID[]>
    getTask(id: ID ): Promise<ITask>
    
    // DATA BLOCK
    getDatablockTable(): Promise<REF[]>
    getDatablockHeader(id: ID ): Promise<IDatablockHeader>
    getDatablockRef(id: ID ): Promise<REF>
    getDatablockID(ref: REF ): Promise<ID>
    
    // FUNCTION BLOCK
    getFunctionBlockHeader(id: ID ): Promise<IFunctionHeader>
    getFunctionBlockData(id: ID ): Promise<IFunctionBlockData>
    getFunctionBlockIOValues(id: ID ): Promise<number[]>

    // CIRCUIT
    getCircuitData( id: ID ): Promise<ICircuitData>
}


export function calcFunctionSize(inputCount, outputCount, staticCount): number {
    const ioCount = inputCount + outputCount
    let byteLength = functionHeaderByteLength                  // Function header
    byteLength += alignBytes(ioCount)                          // IO flags
    byteLength += inputCount * BYTES_PER_REF                   // Input references
    byteLength += (ioCount + staticCount) * BYTES_PER_REF      // IO and static values

    return byteLength
}

export function calcCircuitSize(inputCount: number, outputCount: number, staticCount: number): number {
    let byteLength = calcFunctionSize(inputCount, outputCount, staticCount);
    byteLength += outputCount * BYTES_PER_REF                  // output references
    
    return byteLength;
}