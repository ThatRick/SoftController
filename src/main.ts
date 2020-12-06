import SoftController from './SoftController.js'

function makeLogger(div: HTMLElement) {
    return function logLine(...args: (string | number)[]) {
        const line = document.createElement('p');
        line.textContent = args.join(' ');
        div.appendChild(line);
    }
}
window.onload = () =>
{
    const logLine = makeLogger(document.getElementById('main'));
    const memSize = 4092
    logLine('Create new SoftController with memory size:', memSize)
    const cpu = new SoftController(4092);
    window['cpu'] = cpu;
    console.info({
        totalMem: cpu.totalMemSize,
        freeMem: cpu.freeMem,
        datablockTableLen: cpu.datablockTableLength,
        taskListLen: cpu.taskListLength,
    })

    // test
    const circId = cpu.createCircuit(4, 2, 32);
    const funcs: number[] = [circId]
    const maxOpcode = 6
    for (let i = 1; i < 20; i++) {
        const opcode = i % maxOpcode
        const funcId = cpu.createFunctionBlock(0, opcode, 4);
        const funcInfo = cpu.getFunctionHeader(funcId);
        const sourceId = funcs[i-1];
        const sourceInfo = cpu.getFunctionHeader(sourceId);
        const inputNum = i % (funcInfo.inputCount-1);
        const sourceIONum = sourceInfo.inputCount;
        cpu.connectFunctionInput(funcId, inputNum, sourceId, sourceIONum);
        cpu.addFunctionCall(circId, funcId);
    }
    const taskId = cpu.createTask(circId, 20, 10);
    console.log(cpu.getTask(taskId));
    
    const interval = 10 // ms
    const ticks = 200
    const loop = setInterval(() => cpu.tick(interval), interval)
    
    setTimeout(() => {
        clearTimeout(loop);
        const task = cpu.getTask(taskId);
        const totalCPUtime = task.cpuTimeInt + task.cpuTime;
        const avgCPUtime = totalCPUtime / task.runCount;
        console.log(`Total cpu time ${totalCPUtime.toPrecision(5)} ms. Average time ${avgCPUtime.toPrecision(5)} ms (${task.runCount} runs)`);
        console.dir(task);
    }, interval * ticks)

    console.log({
        freeMem: cpu.freeMem
    })
}