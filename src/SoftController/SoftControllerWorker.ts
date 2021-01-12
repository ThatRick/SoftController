import SoftController from './SoftController.js'
import { ICircuitData, IConnectCircuitOutputParams, IConnectFunctionBlockInputParams, ICreateCircuitParams, ICreateControllerParams, ICreateFunctionBlockParams, ICreateTaskParams, IFunctionBlockData, ISetFunctionBlockIOFlagsParams, ISetFunctionBlockIOValueParams, ISetTaskCallTargetParams, IStepControllerParams, ISystemSector, Message, MessageCode, MessageResponse } from './ControllerInterface.js'
import { DatablockType, ID } from './SoftTypes.js'

let cpu: SoftController

type Tickable = { tick: (dt: number) => void }

class Ticker
{
    constructor(private cpu: Tickable) {}
 
    timer: number
    start(interval: number) {
        this.timer = setInterval(() => {
            cpu.tick(interval)
        }, interval)
    }
    stop() {
        clearTimeout(this.timer)
    }
    step(interval: number, numSteps = 1) {
        this.timer = setInterval(() => {
            cpu.tick(interval)
            if (--numSteps == 0) this.stop();
        }, interval)
    }
}

let ticker: Ticker

onmessage = (e) =>
{
    const msg = e.data as Message

    let response: any
    let error: string

    if (msg == undefined) {
        console.error('Worker: Invalid message, no data found.', e); return
    }
    if (msg.code == undefined) {
        console.error('Worker: Invalid message, no message code defined.', msg); return
    }
    if (!cpu && msg.code > MessageCode.CreateController) {
        respondReject(msg.id, msg.code, 'Controller does not exist')
        return
    }

    switch (msg.code) {
        case MessageCode.CreateController:
        {
            const params = msg.params as ICreateControllerParams

            if (cpu) { error = 'Controller already created.'; break }
            cpu = new SoftController(
                params.dataMemSize,
                params.datablockTableLength,
                params.taskListLength,
                params.id
            )
            if (!cpu) { error = 'Controller could not be created.'; break }
            ticker = new Ticker(cpu)
            response = true
            break
        }
        case MessageCode.StartController:
        {
            const interval = msg.params as number
            ticker.start(interval)
            response = true
            break
        }
        case MessageCode.StopController:
        {
            ticker.stop()
            response = true
            break
        }
        case MessageCode.StepController:
        {
            const params = msg.params as IStepControllerParams
            ticker.step(params.interval, params.numSteps)
            response = true
            break
        }
        case MessageCode.CreateTask:
        {
            const par = msg.params as ICreateTaskParams
            const id = cpu.createTask(par.callTargetID, par.interval, par.offset)
            if (id > 0) response = id
            break
        }
        case MessageCode.SetTaskCallTarget:
        {
            const par = msg.params as ISetTaskCallTargetParams
            response = cpu.setTaskCallTarget(par.taskID, par.callTargetID)
            break
        }
        case MessageCode.CreateCircuit:
        {
            const par = msg.params as ICreateCircuitParams
            const id = cpu.createCircuit(par.inputCount, par.outputCount, par.funcCallCount)
            if (id > 0) response = id
            break
        }
        case MessageCode.ConnectCircuitOutput:
        {
            const par = msg.params as IConnectCircuitOutputParams
            response = cpu.connectCircuitOutput(par.circID, par.outputNum, par.sourceID, par.sourceIONum)
            break
        }
        case MessageCode.CreateFunctionBlock:
        {
            const par = msg.params as ICreateFunctionBlockParams
            const id = cpu.createFunctionBlock(par.library, par.opcode, par.circuitID, par.callIndex, par.inputCount, par.outputCount, par.staticCount)
            if (id > 0) response = id
            break
        }
        case MessageCode.SetFunctionBlockIOValue:
        {
            const par = msg.params as ISetFunctionBlockIOValueParams
            response = cpu.setFunctionIOValue(par.funcID, par.ioNum, par.value)
            break
        }
        case MessageCode.SetFunctionBlockIOFlags:
        {
            const par = msg.params as ISetFunctionBlockIOFlagsParams
            response = cpu.setFunctionIOFlags(par.funcID, par.ioNum, par.flags)
            break
        }
        case MessageCode.ConnectFunctionBlockInput:
        {
            const par = msg.params as IConnectFunctionBlockInputParams
            response = cpu.connectFunctionInput(par.targetID, par.targetInputNum, par.sourceID, par.sourceIONum)
            break
        }
        case MessageCode.GetSystemSector:
        {
            const systemSector = cpu.getSystemSector()
            const data: ISystemSector = {
                id:                         systemSector[0],
                version:                    systemSector[1],
                totalMemSize:               systemSector[2],
                dataMemSize:                systemSector[3],
                datablockTablePtr:          systemSector[4],
                datablockTableLength:       systemSector[5],
                dataBlockTableLastUsedID:   systemSector[6],
                datablockTableVersion:      systemSector[7],
                taskListPtr:                systemSector[8],
                taskListLength:             systemSector[9],
            }
            response = data
            break
        }
        case MessageCode.GetTaskList:
        {
            response = cpu.getTaskIDList()
            break
        }
        case MessageCode.GetTask:
        {
            const id = msg.params as ID
            response = cpu.getTaskByID(id)
            break
        }
        case MessageCode.GetDatablockList:
        {
            response = cpu.getDatablockTable()
            break
        }
        case MessageCode.GetDatablockHeader:
        {
            const id = msg.params as ID
            response = cpu.getDatablockHeaderByID(id)
            break
        }
        case MessageCode.GetDatablockRef:
        {
            const id = msg.params as ID
            response = cpu.getDatablockRef(id)
            break
        }
        case MessageCode.GetDatablockID:
        {
            const ref = msg.params as number
            response = cpu.getDatablockID(ref)
            break
        }
        case MessageCode.GetFunctionBlockHeader:
        {
            const id = msg.params as ID
            response = cpu.readFunctionHeaderByID(id)
            break
        }

        case MessageCode.GetFunctionBlockData:
        {
            const id = msg.params as ID
            const funcHeader = cpu.readFunctionHeaderByID(id)
            if (!funcHeader) { error = 'Header not found for ID ' + id; break }
    
            const ioFlags = Array.from(cpu.readFunctionIOFlagsByID(id))
            const ioValues = Array.from(cpu.readFunctionIOValuesByID(id))
            const inputRefs = Array.from(cpu.readFunctionInputRefsByID(id)).map(ioRef => cpu.solveIOReference(ioRef))
        
            const data: IFunctionBlockData = {
                ...funcHeader,
                ioFlags,
                ioValues,
                inputRefs
            }
            response = data
            break
        }
        
        case MessageCode.GetFunctionBlockIOValues:
        {
            const id = msg.params as ID
            const values = cpu.readFunctionIOValuesByID(id)
            if (!values) { error = 'Could not read IO values for ID ' + id; break }
            response = Array.from(values)
            break
        }
        
        case MessageCode.GetCircuitData:
        {
            const id = msg.params as ID
            if (cpu.getDatablockHeaderByID(id).type != DatablockType.CIRCUIT) { error = 'Invalid circuit ID ' + id; break }
            
            const outputRefs = Array.from(cpu.readCircuitOutputRefsByID(id)).map(ioRef => cpu.solveIOReference(ioRef))
            const callList = Array.from(cpu.readCircuitCallRefListByID(id)).map(callRef => cpu.getDatablockID(callRef))
    
            const data: ICircuitData =  {
                outputRefs,
                callIDList: callList
            }
            response = data
            break
        }

        default:
        {
            console.error('Worker: Invalid message code')
            error = 'Invalid message code ' + msg.code
        }
    }

    (response)
        ? respondResolve(msg.id, msg.code, response)
        : respondReject(msg.id, msg.code, error)
}

// Respond with resolve
function respondResolve( id: number, code: number, data: unknown )
{
    const response: MessageResponse = { id, code, success: true, data };
    
    (self as unknown as Worker).postMessage(response)
}

// Respond with reject
function respondReject( id: number, code: number, error: string ) {
    const response: MessageResponse = { id, code, success: false, error };
    
    (self as unknown as Worker).postMessage(response)
}
