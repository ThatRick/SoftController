
// Address area Low is inclusive, High is exclusive
const memoryAreas =
[
    { name: 'DROM',         low: 0x3F400000,    high: 0x3F800000 },
    { name: 'EXTRAM_DATA',  low: 0x3F800000,    high: 0x3FC00000 },
    { name: 'DRAM',         low: 0x3FAE0000,    high: 0x40000000 },
    { name: 'IROM_MASK',    low: 0x40000000,    high: 0x40070000 },
    { name: 'IROM',         low: 0x400D0000,    high: 0x40400000 },
    { name: 'CACHE_PRO',    low: 0x40070000,    high: 0x40078000 },
    { name: 'CACHE_APP',    low: 0x40078000,    high: 0x40080000 },
    { name: 'IRAM',         low: 0x40080000,    high: 0x400A0000 },
    { name: 'RTC_IRAM',     low: 0x400C0000,    high: 0x400C2000 },
    { name: 'RTC_DRAM',     low: 0x3FF80000,    high: 0x3FF82000 },
    { name: 'RTC_DATA',     low: 0x50000000,    high: 0x50002000 },
]

function getMemoryAreaName(addr: number) {
    const area = memoryAreas.find(area => addr >= area.low && addr < area.high)
    return area.name
}

export const ESP32 =
{
    getMemoryAreaName
}