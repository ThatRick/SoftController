import SoftController from './SoftController.js';
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
    if (msg == undefined) {
        console.error('Worker: Invalid message, no data found.', e);
        return;
    }
    if (msg.code == undefined) {
        console.error('Worker: Invalid message, no message code defined.', msg);
        return;
    }
    let response;
    let error;
    switch (msg.code) {
        case 1 /* CreateController */:
            {
                const params = msg.params;
                if (cpu) {
                    error = 'Controller already created.';
                    break;
                }
                cpu = new SoftController(params.dataMemSize, params.datablockTableLength, params.taskListLength, params.id);
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
                if (!ticker) {
                    error = 'Could not start non-existent controller.';
                    break;
                }
                const interval = msg.params;
                ticker.start(interval);
                response = true;
                break;
            }
        case 3 /* StopController */:
            {
                if (!ticker) {
                    error = 'Could not stop non-existent controller.';
                    break;
                }
                ticker.stop();
                response = true;
                break;
            }
        case 4 /* StepController */:
            {
                if (!ticker) {
                    error = 'Could not step non-existent controller.';
                    break;
                }
                const params = msg.params;
                ticker.step(params.interval, params.numSteps);
                response = true;
                break;
            }
        case 5 /* CreateTask */:
            {
                break;
            }
        case 6 /* SetTaskCallTarget */:
            {
                break;
            }
        case 7 /* CreateCircuit */:
            {
                break;
            }
        case 8 /* ConnectCircuitOutput */:
            {
                break;
            }
        case 9 /* CreateFunctionBlock */:
            {
                break;
            }
        case 10 /* SetFunctionBlockIOValue */:
            {
                break;
            }
        case 11 /* SetFunctionBlockIOFlags */:
            {
                break;
            }
        case 12 /* ConnectFunctionBlockInput */:
            {
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
                break;
            }
        case 15 /* GetTask */:
            {
                break;
            }
        case 16 /* GetDatablockList */:
            {
                break;
            }
        case 17 /* GetDatablockHeader */:
            {
                break;
            }
        case 18 /* GetDatablockRef */:
            {
                break;
            }
        case 19 /* GetDatablockID */:
            {
                break;
            }
        case 20 /* GetFunctionBlockHeader */:
            {
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
                    callList
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
