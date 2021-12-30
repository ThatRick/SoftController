export interface OnlineControllerInterface
{
    start()
    stop()
    step()
    getProgram()
}

export interface OnlineCircuitInterface
{
    onIOValueReceived(blockNum: number, ioNum: number, value: number): void
    modifyIOValue(blockNum: number, ioNum: number, value: number): void
}

