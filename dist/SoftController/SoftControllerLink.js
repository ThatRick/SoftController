import { MessageCodeNames, } from "./ControllerInterface.js";
const logging = true;
function debug(...args) { logging && console.log('LINK: ', ...args); }
function debugError(...args) { console.error('LINK: ', ...args); }
export default class SoftControllerLink {
    constructor() {
        this._msgID = 1;
        this.messagesCallbacks = new Map();
        this.worker = new Worker('./SoftController/SoftControllerWorker.js', { type: 'module' });
        this.worker.onmessage = (e) => this.handleResponse(e);
    }
    getMessageID() { return this._msgID++; }
    sendMessage(code, params, resolve, reject) {
        const id = this.getMessageID();
        const message = { id, code, params };
        this.messagesCallbacks.set(id, { resolve, reject });
        this.worker.postMessage(message);
        debug('Sent message:', MessageCodeNames[code], message);
    }
    handleResponse(e) {
        if (!e.data) {
            debugError('Bad message response, no data found', e);
        }
        const response = e.data;
        (response.success ? debug : debugError)('Received message:', response);
        const callbacks = this.messagesCallbacks.get(response.id);
        this.messagesCallbacks.delete(response.id);
        response.success ? callbacks.resolve(response.data) : callbacks.reject(response.error);
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
    //////////////////////
    //  MODIFY MESSAGES
    //
    createTask(callTargetID, interval, offset) {
        const params = { callTargetID, interval, offset };
        const promise = new Promise((resolve, reject) => {
            this.sendMessage(5 /* CreateTask */, params, resolve, reject);
        });
        return promise;
    }
    setTaskCallTarget(taskID, callTargetID) {
        const params = { taskID, callTargetID };
        const promise = new Promise((resolve, reject) => {
            this.sendMessage(6 /* SetTaskCallTarget */, params, resolve, reject);
        });
        return promise;
    }
    createCircuit(inputCount, outputCount, funcCallCount) {
        const params = { inputCount, outputCount, funcCallCount };
        const promise = new Promise((resolve, reject) => {
            this.sendMessage(7 /* CreateCircuit */, params, resolve, reject);
        });
        return promise;
    }
    connectCircuitOutput(circID, outputNum, sourceID, sourceIONum) {
        const params = { circID, outputNum, sourceID, sourceIONum };
        const promise = new Promise((resolve, reject) => {
            this.sendMessage(8 /* ConnectCircuitOutput */, params, resolve, reject);
        });
        return promise;
    }
    createFunctionBlock(library, opcode, circuitID, callIndex, inputCount, outputCount, staticCount) {
        const params = { library, opcode, circuitID, callIndex, inputCount, outputCount, staticCount };
        const promise = new Promise((resolve, reject) => {
            this.sendMessage(9 /* CreateFunctionBlock */, params, resolve, reject);
        });
        return promise;
    }
    setFunctionBlockIOValue(funcID, ioNum, value) {
        const params = { funcID, ioNum, value };
        const promise = new Promise((resolve, reject) => {
            this.sendMessage(10 /* SetFunctionBlockIOValue */, params, resolve, reject);
        });
        return promise;
    }
    setFunctionBlockIOFlags(funcID, ioNum, flags) {
        const params = { funcID, ioNum, flags };
        const promise = new Promise((resolve, reject) => {
            this.sendMessage(11 /* SetFunctionBlockIOFlags */, params, resolve, reject);
        });
        return promise;
    }
    connectFunctionBlockInput(targetID, targetInputNum, sourceID, sourceIONum, inverted = false) {
        const params = { targetID, targetInputNum, sourceID, sourceIONum, inverted };
        const promise = new Promise((resolve, reject) => {
            this.sendMessage(12 /* ConnectFunctionBlockInput */, params, resolve, reject);
        });
        return promise;
    }
    /////////////////////
    //  QUERY MESSAGES
    //
    // CONTROLLER
    getSystemSector() {
        const promise = new Promise((resolve, reject) => {
            this.sendMessage(13 /* GetSystemSector */, null, resolve, reject);
        });
        return promise;
    }
    getTaskList() {
        const promise = new Promise((resolve, reject) => {
            this.sendMessage(14 /* GetTaskList */, null, resolve, reject);
        });
        return promise;
    }
    getTask(id) {
        const params = id;
        const promise = new Promise((resolve, reject) => {
            this.sendMessage(15 /* GetTask */, params, resolve, reject);
        });
        return promise;
    }
    getDatablockList() {
        const promise = new Promise((resolve, reject) => {
            this.sendMessage(16 /* GetDatablockList */, null, resolve, reject);
        });
        return promise;
    }
    getDatablockHeader(id) {
        const params = id;
        const promise = new Promise((resolve, reject) => {
            this.sendMessage(17 /* GetDatablockHeader */, params, resolve, reject);
        });
        return promise;
    }
    getDatablockRef(id) {
        const params = id;
        const promise = new Promise((resolve, reject) => {
            this.sendMessage(18 /* GetDatablockRef */, params, resolve, reject);
        });
        return promise;
    }
    getDatablockID(ref) {
        const params = ref;
        const promise = new Promise((resolve, reject) => {
            this.sendMessage(19 /* GetDatablockID */, params, resolve, reject);
        });
        return promise;
    }
    getFunctionBlockHeader(id) {
        const params = id;
        const promise = new Promise((resolve, reject) => {
            this.sendMessage(20 /* GetFunctionBlockHeader */, params, resolve, reject);
        });
        return promise;
    }
    getFunctionBlockData(id) {
        const params = id;
        const promise = new Promise((resolve, reject) => {
            this.sendMessage(21 /* GetFunctionBlockData */, params, resolve, reject);
        });
        return promise;
    }
    getFunctionBlockIOValues(id) {
        const params = id;
        const promise = new Promise((resolve, reject) => {
            this.sendMessage(22 /* GetFunctionBlockIOValues */, params, resolve, reject);
        });
        return promise;
    }
    getCircuitData(id) {
        const params = id;
        const promise = new Promise((resolve, reject) => {
            this.sendMessage(23 /* GetCircuitData */, params, resolve, reject);
        });
        return promise;
    }
}
