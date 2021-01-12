import SoftController from './SoftController.js'
import { ICircuitData, ICreateControllerParams, IFunctionBlockData, IStepControllerParams, ISystemSector, Message, MessageCode, MessageResponse } from './ControllerInterface.js'
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
    if (msg == undefined) {
        console.error('Worker: Invalid message, no data found.', e); return
    }
    if (msg.code == undefined) {
        console.error('Worker: Invalid message, no message code defined.', msg); return
    }

    let response: any
    let error: string

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
            if (!ticker) { error = 'Could not start non-existent controller.'; break }
            const interval = msg.params as number
            ticker.start(interval)
            response = true
            break
        }
        case MessageCode.StopController:
        {
            if (!ticker) { error = 'Could not stop non-existent controller.'; break }
            ticker.stop()
            response = true
            break
        }
        case MessageCode.StepController:
        {
            if (!ticker) { error = 'Could not step non-existent controller.'; break }
            const params = msg.params as IStepControllerParams
            ticker.step(params.interval, params.numSteps)
            response = true
            break
        }
        case MessageCode.CreateTask:
        {
            
            break
        }
        case MessageCode.SetTaskCallTarget:
        {
            break
        }
        case MessageCode.CreateCircuit:
        {
            break
        }
        case MessageCode.ConnectCircuitOutput:
        {
            break
        }
        case MessageCode.CreateFunctionBlock:
        {
            break
        }
        case MessageCode.SetFunctionBlockIOValue:
        {
            break
        }
        case MessageCode.SetFunctionBlockIOFlags:
        {
            break
        }
        case MessageCode.ConnectFunctionBlockInput:
        {
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
            break
        }
        case MessageCode.GetTask:
        {
            break
        }
        case MessageCode.GetDatablockList:
        {
            break
        }
        case MessageCode.GetDatablockHeader:
        {
            break
        }
        case MessageCode.GetDatablockRef:
        {
            break
        }
        case MessageCode.GetDatablockID:
        {
            break
        }
        case MessageCode.GetFunctionBlockHeader:
        {
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
                callList
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
