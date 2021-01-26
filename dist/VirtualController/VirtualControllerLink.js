import { MessageCodeNames, EventID, } from "../Controller/ControllerInterface.js";
const debugLogging = false;
function logInfo(...args) { debugLogging && console.info('LINK: ', ...args); }
function logError(...args) { console.error('LINK: ', ...args); }
export default class VirtualControllerLink {
    constructor() {
        this._msgID = 1;
        this.messagesPromises = new Map();
        this.worker = new Worker('./VirtualController/VirtualControllerWorker.js', { type: 'module' });
        this.worker.onmessage = (e) => this.receiveMessage(e);
    }
    getMessageID() { return this._msgID++; }
    sendMessage(code, params, resolve, reject) {
        const id = this.getMessageID();
        const message = { id, code, params };
        this.messagesPromises.set(id, { resolve, reject });
        this.worker.postMessage(message);
        logInfo('Sent message:', MessageCodeNames[code], message);
    }
    receiveMessage(e) {
        if (!e.data) {
            logError('Bad message response, no data found', e);
        }
        const response = e.data;
        (response.success ? logInfo : logError)('Received message:', response);
        if (response.id == EventID) {
            this.onEventReceived?.(response);
        }
        else {
            const promise = this.messagesPromises.get(response.id);
            this.messagesPromises.delete(response.id);
            response.success ? promise.resolve(response.data) : promise.reject(response.error);
        }
    }
    //////////////////////
    //  SYSTEM MESSAGES
    //
    createController(dataMemSize, datablockTableLength, taskListLength, id) {
        const params = { dataMemSize, datablockTableLength, taskListLength, id };
        const promise = new Promise((resolve, reject) => {
            this.sendMessage(1 /* CreateController */, params, resolve, reject);
        });
        return promise;
    }
    startController(interval) {
        const params = interval;
        const promise = new Promise((resolve, reject) => {
            this.sendMessage(2 /* StartController */, params, resolve, reject);
        });
        return promise;
    }
    stopController() {
        const promise = new Promise((resolve, reject) => {
            this.sendMessage(3 /* StopController */, null, resolve, reject);
        });
        return promise;
    }
    stepController(interval, numSteps) {
        const params = { interval, numSteps };
        const promise = new Promise((resolve, reject) => {
            this.sendMessage(4 /* StepController */, params, resolve, reject);
        });
        return promise;
    }
    setMonitoring(enabled) {
        const promise = new Promise((resolve, reject) => {
            this.sendMessage(5 /* SetMonitoring */, enabled, resolve, reject);
        });
        return promise;
    }
    //////////////////////
    //  MODIFY MESSAGES
    //
    createTask(callTargetID, interval, offset) {
        const params = { callTargetID, interval, offset };
        const promise = new Promise((resolve, reject) => {
            this.sendMessage(6 /* CreateTask */, params, resolve, reject);
        });
        return promise;
    }
    setTaskCallTarget(taskID, callTargetID) {
        const params = { taskID, callTargetID };
        const promise = new Promise((resolve, reject) => {
            this.sendMessage(7 /* SetTaskCallTarget */, params, resolve, reject);
        });
        return promise;
    }
    createCircuit(inputCount, outputCount, funcCallCount) {
        const params = { inputCount, outputCount, funcCallCount };
        const promise = new Promise((resolve, reject) => {
            this.sendMessage(8 /* CreateCircuit */, params, resolve, reject);
        });
        return promise;
    }
    connectCircuitOutput(circID, outputNum, sourceID, sourceIONum) {
        const params = { circID, outputNum, sourceID, sourceIONum };
        const promise = new Promise((resolve, reject) => {
            this.sendMessage(9 /* ConnectCircuitOutput */, params, resolve, reject);
        });
        return promise;
    }
    setFunctionCallIndex(circID, funcID, index) {
        const params = { circID, funcID, index };
        const promise = new Promise((resolve, reject) => {
            this.sendMessage(10 /* SetFunctionCallIndex */, params, resolve, reject);
        });
        return promise;
    }
    createFunctionBlock(library, opcode, circuitID, callIndex, inputCount, outputCount, staticCount) {
        const params = { library, opcode, circuitID, callIndex, inputCount, outputCount, staticCount };
        const promise = new Promise((resolve, reject) => {
            this.sendMessage(11 /* CreateFunctionBlock */, params, resolve, reject);
        });
        return promise;
    }
    deleteFunctionBlock(funcID) {
        const promise = new Promise((resolve, reject) => {
            this.sendMessage(12 /* DeleteFunctionBlock */, funcID, resolve, reject);
        });
        return promise;
    }
    setFunctionBlockFlag(funcID, flag, enabled) {
        const params = { funcID, flag, enabled };
        const promise = new Promise((resolve, reject) => {
            this.sendMessage(13 /* SetFunctionBlockFlag */, params, resolve, reject);
        });
        return promise;
    }
    setFunctionBlockIOFlag(funcID, ioNum, flag, enabled) {
        const params = { funcID, ioNum, flag, enabled };
        const promise = new Promise((resolve, reject) => {
            this.sendMessage(16 /* SetFunctionBlockIOFlag */, params, resolve, reject);
        });
        return promise;
    }
    setFunctionBlockIOFlags(funcID, ioNum, flags) {
        const params = { funcID, ioNum, flags };
        const promise = new Promise((resolve, reject) => {
            this.sendMessage(15 /* SetFunctionBlockIOFlags */, params, resolve, reject);
        });
        return promise;
    }
    setFunctionBlockIOValue(funcID, ioNum, value) {
        const params = { funcID, ioNum, value };
        const promise = new Promise((resolve, reject) => {
            this.sendMessage(14 /* SetFunctionBlockIOValue */, params, resolve, reject);
        });
        return promise;
    }
    connectFunctionBlockInput(targetID, targetInputNum, sourceID, sourceIONum, inverted = false) {
        const params = { targetID, targetInputNum, sourceID, sourceIONum, inverted };
        const promise = new Promise((resolve, reject) => {
            this.sendMessage(17 /* ConnectFunctionBlockInput */, params, resolve, reject);
        });
        return promise;
    }
    /////////////////////
    //  QUERY MESSAGES
    //
    // CONTROLLER
    getSystemSector() {
        const promise = new Promise((resolve, reject) => {
            this.sendMessage(18 /* GetSystemSector */, null, resolve, reject);
        });
        return promise;
    }
    getTaskList() {
        const promise = new Promise((resolve, reject) => {
            this.sendMessage(19 /* GetTaskList */, null, resolve, reject);
        });
        return promise;
    }
    getTask(id) {
        const params = id;
        const promise = new Promise((resolve, reject) => {
            this.sendMessage(20 /* GetTask */, params, resolve, reject);
        });
        return promise;
    }
    getDatablockTable() {
        const promise = new Promise((resolve, reject) => {
            this.sendMessage(21 /* GetDatablockTable */, null, resolve, reject);
        });
        return promise;
    }
    getDatablockHeader(id) {
        const params = id;
        const promise = new Promise((resolve, reject) => {
            this.sendMessage(22 /* GetDatablockHeader */, params, resolve, reject);
        });
        return promise;
    }
    getDatablockRef(id) {
        const params = id;
        const promise = new Promise((resolve, reject) => {
            this.sendMessage(23 /* GetDatablockRef */, params, resolve, reject);
        });
        return promise;
    }
    getDatablockID(ref) {
        const params = ref;
        const promise = new Promise((resolve, reject) => {
            this.sendMessage(24 /* GetDatablockID */, params, resolve, reject);
        });
        return promise;
    }
    getFunctionBlockHeader(id) {
        const params = id;
        const promise = new Promise((resolve, reject) => {
            this.sendMessage(25 /* GetFunctionBlockHeader */, params, resolve, reject);
        });
        return promise;
    }
    getFunctionBlockData(id) {
        const params = id;
        const promise = new Promise((resolve, reject) => {
            this.sendMessage(26 /* GetFunctionBlockData */, params, resolve, reject);
        });
        return promise;
    }
    getFunctionBlockIOValues(id) {
        const params = id;
        const promise = new Promise((resolve, reject) => {
            this.sendMessage(27 /* GetFunctionBlockIOValues */, params, resolve, reject);
        });
        return promise;
    }
    getCircuitData(id) {
        const params = id;
        const promise = new Promise((resolve, reject) => {
            this.sendMessage(28 /* GetCircuitData */, params, resolve, reject);
        });
        return promise;
    }
}
