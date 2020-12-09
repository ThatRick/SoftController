import SoftController from './SoftController.js';
function makeLogger(div) {
    return function logLine(text) {
        const pre = document.createElement('pre');
        pre.textContent = text;
        div.appendChild(pre);
    };
}
window.onload = () => {
    const logLine = makeLogger(document.getElementById('main'));
    const memSize = 16 * 1024;
    logLine('Create new Controller with memory size: ' + memSize);
    const cpu = new SoftController(memSize);
    window['cpu'] = cpu;
    console.info({
        totalMem: cpu.totalMemSize,
        freeMem: cpu.freeMem,
        datablockTableLen: cpu.datablockTableLength,
        taskListLen: cpu.taskListLength,
    });
    // test
    const circId = cpu.createCircuit(4, 2, 256);
    const funcs = [circId];
    const maxOpcode = 6;
    const logicLib = 0;
    for (let i = 1; i < 200; i++) {
        const opcode = i % maxOpcode;
        const funcId = cpu.createFunctionBlock(logicLib, opcode, 4);
        const funcInfo = cpu.getFunctionHeaderByID(funcId);
        const sourceId = funcs[i - 1];
        const sourceInfo = cpu.getFunctionHeaderByID(sourceId);
        const inputNum = i % (funcInfo.inputCount - 1);
        const sourceIONum = sourceInfo.inputCount;
        cpu.connectFunctionInput(funcId, inputNum, sourceId, sourceIONum);
        cpu.addFunctionCall(circId, funcId);
    }
    const taskId = cpu.createTask(circId, 20, 5);
    console.log(cpu.getTaskByID(taskId));
    const interval = 10; // ms
    const ticks = 200;
    const loop = setInterval(() => cpu.tick(interval), interval);
    setTimeout(() => {
        clearTimeout(loop);
        const task = cpu.getTaskByID(taskId);
        const totalCPUtime = task.cpuTimeInt + task.cpuTime;
        const avgCPUtime = totalCPUtime / task.runCount;
        console.log(`Total cpu time ${totalCPUtime.toPrecision(5)} ms. Average time ${avgCPUtime.toPrecision(5)} ms (${task.runCount} runs)`);
        console.dir(task);
    }, interval * ticks);
    console.log({
        freeMem: cpu.freeMem
    });
    logLine(datablockTableToString(cpu));
};
function datablockTableToString(cpu) {
    const typeNames = [
        'UNDEFINED',
        'UNALLOCATED',
        'TASK',
        'CIRCUIT',
        'FUNCTION',
        'DATA'
    ];
    const maxTypeNameLength = (typeNames.reduce((a, b) => (a.length > b.length) ? a : b)).length;
    let text = '';
    const addLine = (line) => text += line + '\n';
    addLine(`Data block table listing (size: ${cpu.datablockTable.length})`);
    addLine(''.padEnd(47, '='));
    cpu.datablockTable.forEach((offset, id) => {
        if (offset) {
            const header = cpu.getDatablockHeaderByID(id);
            const startAddr = offset.toString(16).toUpperCase();
            const endAddr = (offset + header.byteLength - 1).toString(16).toUpperCase();
            addLine(`${id.toString().padStart(3, '0')}:  ${typeNames[header.type].padEnd(maxTypeNameLength)}  ${header.byteLength.toString().padStart(6)} bytes  [${startAddr} - ${endAddr}]`);
        }
    });
    return text;
}
