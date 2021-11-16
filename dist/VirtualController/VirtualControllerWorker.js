import VirtualController from './VirtualControllerCPU.js';
import { EventID } from '../Controller/ControllerInterface.js';
class Ticker {
    cpu;
    constructor(cpu) {
        this.cpu = cpu;
    }
    timer;
    start(interval) {
        if (this.timer)
            this.stop();
        this.timer = setInterval(() => {
            this.cpu.tick(interval);
        }, interval);
    }
    stop() {
        clearTimeout(this.timer);
        this.timer = null;
    }
    step(interval, numSteps = 1) {
        if (numSteps == 1) {
            this.cpu.tick(interval);
            return;
        }
        this.timer = setInterval(() => {
            this.cpu.tick(interval);
            if (--numSteps == 0)
                this.stop();
        }, interval);
    }
}
let ticker;
let cpu;
// Respond with resolve
function respondResolve(id, code, data) {
    const response = { id, code, success: true, data };
    sendMessage(response);
}
// Respond with reject
function respondReject(id, code, error) {
    const response = { id, code, success: false, error };
    sendMessage(response);
}
function handleControllerEvent(code, data) {
    const event = { id: EventID, code, success: true, data };
    sendMessage(event);
}
// Post message
function sendMessage(msg) {
    self.postMessage(msg);
}
// Handle incoming messages
onmessage = (e) => {
    const msg = e.data;
    let response;
    let error;
    if (msg == undefined) {
        console.error('Worker: Invalid message, no data found.', e);
        return;
    }
    if (msg.code == undefined) {
        console.error('Worker: Invalid message, no message code defined.', msg);
        return;
    }
    if (!cpu && msg.code > 1 /* CreateController */) {
        respondReject(msg.id, msg.code, 'Controller does not exist');
        return;
    }
    switch (msg.code) {
        case 1 /* CreateController */:
            {
                const params = msg.params;
                if (cpu) {
                    error = 'Controller already created.';
                    break;
                }
                cpu = new VirtualController(params.dataMemSize, params.datablockTableLength, params.taskListLength, params.id);
                if (!cpu) {
                    error = 'Controller could not be created.';
                    break;
                }
                // Handle CPU events
                cpu.onControllerEvent = handleControllerEvent.bind(this);
                ticker = new Ticker(cpu);
                response = true;
                break;
            }
        case 2 /* StartController */:
            {
                const interval = msg.params;
                ticker.start(interval);
                response = true;
                break;
            }
        case 3 /* StopController */:
            {
                ticker.stop();
                response = true;
                break;
            }
        case 4 /* StepController */:
            {
                const params = msg.params;
                ticker.step(params.interval, params.numSteps);
                response = true;
                break;
            }
        case 5 /* SetMonitoring */:
            {
                const enabled = msg.params;
                cpu.monitoringEnabled = enabled;
                response = true;
                break;
            }
        case 6 /* CreateTask */:
            {
                const par = msg.params;
                const id = cpu.createTask(par.callTargetID, par.interval, par.offset);
                if (id > 0)
                    response = id;
                break;
            }
        case 7 /* SetTaskCallTarget */:
            {
                const par = msg.params;
                response = cpu.setTaskCallTarget(par.taskID, par.callTargetID);
                break;
            }
        case 8 /* CreateCircuit */:
            {
                const par = msg.params;
                const id = cpu.createCircuit(par.inputCount, par.outputCount, par.funcCallCount);
                if (id > 0)
                    response = id;
                break;
            }
        case 9 /* ConnectCircuitOutput */:
            {
                const par = msg.params;
                response = cpu.connectCircuitOutput(par.circID, par.outputNum, par.sourceID, par.sourceIONum);
                break;
            }
        case 10 /* SetFunctionCallIndex */:
            {
                const par = msg.params;
                response = cpu.setFunctionCallIndex(par.circID, par.funcID, par.index);
                break;
            }
        case 11 /* CreateFunctionBlock */:
            {
                const par = msg.params;
                const id = cpu.createFunctionBlock(par.library, par.opcode, par.circuitID, par.callIndex, par.inputCount, par.outputCount, par.staticCount);
                if (id > 0)
                    response = id;
                break;
            }
        case 12 /* DeleteFunctionBlock */:
            {
                const id = msg.params;
                response = cpu.deleteDatablock(id);
                break;
            }
        case 13 /* SetFunctionBlockFlag */:
            {
                const par = msg.params;
                response = cpu.setFunctionFlag(par.funcID, par.flag, par.enabled);
                break;
            }
        case 16 /* SetFunctionBlockIOFlag */:
            {
                const par = msg.params;
                response = cpu.setFunctionIOFlag(par.funcID, par.ioNum, par.flag, par.enabled);
                break;
            }
        case 15 /* SetFunctionBlockIOFlags */:
            {
                const par = msg.params;
                response = cpu.setFunctionIOFlags(par.funcID, par.ioNum, par.flags);
                break;
            }
        case 14 /* SetFunctionBlockIOValue */:
            {
                const par = msg.params;
                response = cpu.setFunctionIOValue(par.funcID, par.ioNum, par.value);
                break;
            }
        case 17 /* ConnectFunctionBlockInput */:
            {
                const par = msg.params;
                response = cpu.connectFunctionInput(par.targetID, par.targetInputNum, par.sourceID, par.sourceIONum, par.inverted);
                break;
            }
        case 18 /* GetSystemSector */:
            {
                const systemSector = cpu.getSystemSector();
                const data = {
                    id: systemSector[0],
                    version: systemSector[1],
                    totalMemSize: systemSector[2],
                    dataMemSize: systemSector[3],
                    datablockTablePtr: systemSector[4],
                    datablockTableLength: systemSector[5],
                    dataBlockTableLastUsedID: systemSector[6],
                    datablockTableVersion: systemSector[7],
                    taskListPtr: systemSector[8],
                    taskListLength: systemSector[9],
                };
                response = data;
                break;
            }
        case 19 /* GetTaskList */:
            {
                response = cpu.getTaskIDList();
                break;
            }
        case 20 /* GetTask */:
            {
                const id = msg.params;
                response = cpu.getTaskByID(id);
                break;
            }
        case 21 /* GetDatablockTable */:
            {
                response = cpu.getDatablockTable();
                break;
            }
        case 22 /* GetDatablockHeader */:
            {
                const id = msg.params;
                response = cpu.getDatablockHeaderByID(id);
                break;
            }
        case 23 /* GetDatablockRef */:
            {
                const id = msg.params;
                response = cpu.getDatablockRef(id);
                break;
            }
        case 24 /* GetDatablockID */:
            {
                const ref = msg.params;
                response = cpu.getDatablockID(ref);
                break;
            }
        case 25 /* GetFunctionBlockHeader */:
            {
                const id = msg.params;
                response = cpu.readFunctionHeaderByID(id);
                break;
            }
        case 26 /* GetFunctionBlockData */:
            {
                const id = msg.params;
                const funcHeader = cpu.readFunctionHeaderByID(id);
                if (!funcHeader) {
                    error = 'Header not found for ID ' + id;
                    break;
                }
                const ioFlags = Array.from(cpu.readFunctionIOFlagsByID(id));
                const ioValues = Array.from(cpu.readFunctionIOValuesByID(id));
                const inputRefs = Array.from(cpu.readFunctionInputRefsByID(id)).map(ioRef => cpu.solveIOReference(ioRef));
                const data = {
                    ...funcHeader,
                    ioFlags,
                    ioValues,
                    inputRefs
                };
                response = data;
                break;
            }
        case 27 /* GetFunctionBlockIOValues */:
            {
                const id = msg.params;
                const values = cpu.readFunctionIOValuesByID(id);
                if (!values) {
                    error = 'Could not read IO values for ID ' + id;
                    break;
                }
                response = Array.from(values);
                break;
            }
        case 28 /* GetCircuitData */:
            {
                const id = msg.params;
                if (cpu.getDatablockHeaderByID(id).type != 3 /* CIRCUIT */) {
                    error = 'Invalid circuit ID ' + id;
                    break;
                }
                const outputRefs = Array.from(cpu.readCircuitOutputRefsByID(id)).map(ioRef => cpu.solveIOReference(ioRef));
                const refList = cpu.readCircuitCallRefListByID(id);
                const last = refList.lastIndexOf(0);
                const refs = refList.slice(0, last);
                const callIDList = Array.from(refs).map(ref => cpu.getDatablockID(ref));
                const data = {
                    outputRefs,
                    callIDList
                };
                response = data;
                break;
            }
        default:
            {
                console.error('Worker: Invalid message code');
                error = 'Invalid message code ' + msg.code;
            }
    }
    (response)
        ? respondResolve(msg.id, msg.code, response)
        : respondReject(msg.id, msg.code, error);
};
