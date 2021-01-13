import IControllerInterface, {
    ICircuitData,
    IConnectCircuitOutputParams,
    IConnectFunctionBlockInputParams,
    ICreateCircuitParams,
    ICreateControllerParams,
    ICreateFunctionBlockParams,
    ICreateTaskParams,
    IFunctionBlockData,
    ISetFunctionBlockIOFlagsParams,
    ISetFunctionBlockIOValueParams,
    ISetTaskCallTargetParams,
    IStepControllerParams,
    ISystemSector,
    Message,
    MessageCode,
    MessageCodeNames,
    MessageResponse,
} from "../Controller/ControllerInterface.js";

import { ID, IDatablockHeader, IFunctionHeader, ITask } from "../Controller/ControllerDataTypes.js";

const debugLogging = false
function logInfo(...args: any[]) { debugLogging && console.info('LINK: ', ...args)}
function logError(...args: any[]) { console.error('LINK: ', ...args)}

type PromiseCallback = (value: any) => void

export default class VirtualControllerLink implements IControllerInterface
{
    constructor() {
        this.worker = new Worker('./VirtualController/VirtualControllerWorker.js', {type: 'module'})

        this.worker.onmessage = (e) => this.handleResponse(e)
    }
    
    private worker: Worker
    private _msgID = 1

    getMessageID() { return this._msgID++ }

    messagesCallbacks = new Map< number, { resolve: PromiseCallback, reject: PromiseCallback }>()

    sendMessage(code: MessageCode, params: unknown, resolve: PromiseCallback, reject: PromiseCallback ) {
        const id = this.getMessageID()
        const message: Message = { id, code, params }
        
        this.messagesCallbacks.set( id, { resolve, reject } )

        this.worker.postMessage(message)

        logInfo('Sent message:', MessageCodeNames[code], message)
    }

    handleResponse(e: MessageEvent) {
        if (!e.data) {
            logError('Bad message response, no data found', e)
        }
        const response = e.data as MessageResponse
        
        (response.success ? logInfo : logError)('Received message:', response)

        const callbacks = this.messagesCallbacks.get(response.id)
        this.messagesCallbacks.delete(response.id)

        response.success ? callbacks.resolve(response.data) : callbacks.reject(response.error)
    }

//////////////////////
//  SYSTEM MESSAGES
//
    createController( dataMemSize: number, datablockTableLength?: number, taskListLength?: number, id?: number ): Promise<boolean> {
        const params: ICreateControllerParams = { dataMemSize, datablockTableLength, taskListLength, id }
        const promise = new Promise<boolean>((resolve, reject) => {
            this.sendMessage( MessageCode.CreateController, params, resolve, reject )
        })
        return promise
    }
    startController( interval: number ): Promise<boolean> {
        const params = interval
        const promise = new Promise<boolean>((resolve, reject) => {
            this.sendMessage( MessageCode.StartController, params, resolve, reject )
        })
        return promise
    }
    stopController(): Promise<boolean> {
        const promise = new Promise<boolean>((resolve, reject) => {
            this.sendMessage( MessageCode.StopController, null, resolve, reject )
        })
        return promise
    }
    stepController( interval: number, numSteps?: number ): Promise<boolean> {
        const params: IStepControllerParams = { interval, numSteps }
        const promise = new Promise<boolean>((resolve, reject) => {
            this.sendMessage( MessageCode.StepController, params, resolve, reject )
        })
        return promise
    }

//////////////////////
//  MODIFY MESSAGES
//


    createTask( callTargetID: ID, interval: number, offset?: number ): Promise<ID> {
        const params: ICreateTaskParams = { callTargetID, interval, offset }
        const promise = new Promise<ID>((resolve, reject) => {
            this.sendMessage( MessageCode.CreateTask, params, resolve, reject )
        })
        return promise
    }
    setTaskCallTarget( taskID: ID, callTargetID: ID ): Promise<boolean> {
        const params: ISetTaskCallTargetParams = { taskID, callTargetID }
        const promise = new Promise<boolean>((resolve, reject) => {
            this.sendMessage( MessageCode.SetTaskCallTarget, params, resolve, reject )
        })
        return promise
    }
    createCircuit( inputCount: number, outputCount: number, funcCallCount: number ): Promise<ID> {
        const params: ICreateCircuitParams = { inputCount, outputCount, funcCallCount }
        const promise = new Promise<ID>((resolve, reject) => {
            this.sendMessage( MessageCode.CreateCircuit, params, resolve, reject )
        })
        return promise
    }
    connectCircuitOutput( circID: ID, outputNum: number, sourceID: ID, sourceIONum: number ): Promise<boolean> {
        const params: IConnectCircuitOutputParams = { circID, outputNum, sourceID, sourceIONum }
        const promise = new Promise<boolean>((resolve, reject) => {
            this.sendMessage( MessageCode.ConnectCircuitOutput, params, resolve, reject )
        })
        return promise
    }
    createFunctionBlock( library: number, opcode: number, circuitID?: ID, callIndex?: number, inputCount?: number, outputCount?: number, staticCount?: number ): Promise<ID>
    {
        const params: ICreateFunctionBlockParams = { library, opcode, circuitID, callIndex, inputCount, outputCount, staticCount }
        const promise = new Promise<ID>((resolve, reject) => {
            this.sendMessage( MessageCode.CreateFunctionBlock, params, resolve, reject )
        })
        return promise
    }
    setFunctionBlockIOValue( funcID: ID, ioNum: number, value: number ): Promise<boolean> {
        const params: ISetFunctionBlockIOValueParams = { funcID, ioNum, value }
        const promise = new Promise<boolean>((resolve, reject) => {
            this.sendMessage( MessageCode.SetFunctionBlockIOValue, params, resolve, reject )
        })
        return promise
    }
    setFunctionBlockIOFlags( funcID: ID, ioNum: number, flags: number ): Promise<boolean> {
        const params: ISetFunctionBlockIOFlagsParams = { funcID, ioNum, flags }
        const promise = new Promise<boolean>((resolve, reject) => {
            this.sendMessage( MessageCode.SetFunctionBlockIOFlags, params, resolve, reject )
        })
        return promise
    }
    connectFunctionBlockInput( targetID: ID, targetInputNum: number, sourceID: ID, sourceIONum: number, inverted = false ): Promise<boolean> {
        const params: IConnectFunctionBlockInputParams = { targetID, targetInputNum, sourceID, sourceIONum, inverted }
        const promise = new Promise<boolean>((resolve, reject) => {
            this.sendMessage( MessageCode.ConnectFunctionBlockInput, params, resolve, reject )
        })
        return promise
    }

/////////////////////
//  QUERY MESSAGES
//
    // CONTROLLER
    getSystemSector(): Promise<ISystemSector> {
        const promise = new Promise<ISystemSector>((resolve, reject) => {
        this.sendMessage( MessageCode.GetSystemSector, null, resolve, reject )
    })
    return promise
    }
    getTaskList(): Promise<ID[]> {
        const promise = new Promise<[]>((resolve, reject) => {
        this.sendMessage( MessageCode.GetTaskList, null, resolve, reject )
    })
    return promise
    }
    getTask(id: ID ): Promise<ITask> {
        const params: ID = id
        const promise = new Promise<ITask>((resolve, reject) => {
        this.sendMessage( MessageCode.GetTask, params, resolve, reject )
    })
    return promise
    }
    getDatablockList(): Promise<ID[]> {
        const promise = new Promise<[]>((resolve, reject) => {
        this.sendMessage( MessageCode.GetDatablockList, null, resolve, reject )
    })
    return promise
    }
    getDatablockHeader(id: ID ): Promise<IDatablockHeader> {
        const params: ID = id
        const promise = new Promise<IDatablockHeader>((resolve, reject) => {
        this.sendMessage( MessageCode.GetDatablockHeader, params, resolve, reject )
    })
    return promise
    }
    getDatablockRef(id: ID ): Promise<number> {
        const params: ID = id
        const promise = new Promise<number>((resolve, reject) => {
        this.sendMessage( MessageCode.GetDatablockRef, params, resolve, reject )
    })
    return promise
    }
    getDatablockID(ref: number ): Promise<ID> {
        const params: number = ref
        const promise = new Promise<ID>((resolve, reject) => {
        this.sendMessage( MessageCode.GetDatablockID, params, resolve, reject )
    })
    return promise
    }
    getFunctionBlockHeader(id: ID ): Promise<IFunctionHeader> {
        const params: ID = id
        const promise = new Promise<IFunctionHeader>((resolve, reject) => {
        this.sendMessage( MessageCode.GetFunctionBlockHeader, params, resolve, reject )
    })
    return promise
    }
    getFunctionBlockData(id: ID ): Promise<IFunctionBlockData> {
        const params: ID = id
        const promise = new Promise<IFunctionBlockData>((resolve, reject) => {
        this.sendMessage( MessageCode.GetFunctionBlockData, params, resolve, reject )
    })
    return promise
    }
    getFunctionBlockIOValues(id: ID ): Promise<number[]> {
        const params: ID = id
        const promise = new Promise<[]>((resolve, reject) => {
        this.sendMessage( MessageCode.GetFunctionBlockIOValues, params, resolve, reject )
    })
    return promise
    }
    getCircuitData( id: ID ): Promise<ICircuitData> {
        const params: ID = id
        const promise = new Promise<ICircuitData>((resolve, reject) => {
        this.sendMessage( MessageCode.GetCircuitData, params, resolve, reject )
    })
    return promise
    }
}