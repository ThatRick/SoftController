import VirtualController from './VirtualControllerCPU.js';
let cpu;
class Ticker {
    constructor(cpu) {
        this.cpu = cpu;
    }
    start(interval) {
        this.timer = setInterval(() => {
            cpu.tick(interval);
        }, interval);
    }
    stop() {
        clearTimeout(this.timer);
    }
    step(interval, numSteps = 1) {
        this.timer = setInterval(() => {
            cpu.tick(interval);
            if (--numSteps == 0)
                this.stop();
        }, interval);
    }
}
let ticker;
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
        case 5 /* CreateTask */:
            {
                const par = msg.params;
                const id = cpu.createTask(par.callTargetID, par.interval, par.offset);
                if (id > 0)
                    response = id;
                break;
            }
        case 6 /* SetTaskCallTarget */:
            {
                const par = msg.params;
                response = cpu.setTaskCallTarget(par.taskID, par.callTargetID);
                break;
            }
        case 7 /* CreateCircuit */:
            {
                const par = msg.params;
                const id = cpu.createCircuit(par.inputCount, par.outputCount, par.funcCallCount);
                if (id > 0)
                    response = id;
                break;
            }
        case 8 /* ConnectCircuitOutput */:
            {
                const par = msg.params;
                response = cpu.connectCircuitOutput(par.circID, par.outputNum, par.sourceID, par.sourceIONum);
                break;
            }
        case 9 /* CreateFunctionBlock */:
            {
                const par = msg.params;
                const id = cpu.createFunctionBlock(par.library, par.opcode, par.circuitID, par.callIndex, par.inputCount, par.outputCount, par.staticCount);
                if (id > 0)
                    response = id;
                break;
            }
        case 10 /* SetFunctionBlockIOValue */:
            {
                const par = msg.params;
                response = cpu.setFunctionIOValue(par.funcID, par.ioNum, par.value);
                break;
            }
        case 11 /* SetFunctionBlockIOFlags */:
            {
                const par = msg.params;
                response = cpu.setFunctionIOFlags(par.funcID, par.ioNum, par.flags);
                break;
            }
        case 12 /* ConnectFunctionBlockInput */:
            {
                const par = msg.params;
                response = cpu.connectFunctionInput(par.targetID, par.targetInputNum, par.sourceID, par.sourceIONum);
                break;
            }
        case 13 /* GetSystemSector */:
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
        case 14 /* GetTaskList */:
            {
                response = cpu.getTaskIDList();
                break;
            }
        case 15 /* GetTask */:
            {
                const id = msg.params;
                response = cpu.getTaskByID(id);
                break;
            }
        case 16 /* GetDatablockList */:
            {
                response = cpu.getDatablockTable();
                break;
            }
        case 17 /* GetDatablockHeader */:
            {
                const id = msg.params;
                response = cpu.getDatablockHeaderByID(id);
                break;
            }
        case 18 /* GetDatablockRef */:
            {
                const id = msg.params;
                response = cpu.getDatablockRef(id);
                break;
            }
        case 19 /* GetDatablockID */:
            {
                const ref = msg.params;
                response = cpu.getDatablockID(ref);
                break;
            }
        case 20 /* GetFunctionBlockHeader */:
            {
                const id = msg.params;
                response = cpu.readFunctionHeaderByID(id);
                break;
            }
        case 21 /* GetFunctionBlockData */:
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
        case 22 /* GetFunctionBlockIOValues */:
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
        case 23 /* GetCircuitData */:
            {
                const id = msg.params;
                if (cpu.getDatablockHeaderByID(id).type != 3 /* CIRCUIT */) {
                    error = 'Invalid circuit ID ' + id;
                    break;
                }
                const outputRefs = Array.from(cpu.readCircuitOutputRefsByID(id)).map(ioRef => cpu.solveIOReference(ioRef));
                const callList = Array.from(cpu.readCircuitCallRefListByID(id)).map(callRef => cpu.getDatablockID(callRef));
                const data = {
                    outputRefs,
                    callIDList: callList
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
// Respond with resolve
function respondResolve(id, code, data) {
    const response = { id, code, success: true, data };
    self.postMessage(response);
}
// Respond with reject
function respondReject(id, code, error) {
    const response = { id, code, success: false, error };
    self.postMessage(response);
}
