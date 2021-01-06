import { vec2 } from './Vector2.js';
export default class Grid {
    constructor() {
        this.cells = []; // [y][x]
    }
    setCell(pos, cell) {
        if (this.cells[pos.y] == undefined)
            this.cells[pos.y] = [];
        this.cells[pos.y][pos.x] = cell;
    }
    setRect(pos, rectRows) {
        for (let y = 0; y < rectRows.length; y++) {
            if (this.cells[pos.y + y] == undefined)
                this.cells[pos.y + y] = [];
            for (let x = 0; x < rectRows[y].length; x++) {
                this.cells[pos.y + y][pos.x + x] = rectRows[y][x];
            }
        }
    }
    getCell(pos) {
        return this.cells[pos.y]?.[pos.x];
    }
    hasCell(pos) {
        return (this.getCell(pos) != undefined);
    }
    clearCell(pos) {
        if (this.hasCell(pos))
            this.cells[pos.y][pos.x] = undefined;
    }
    clearRect(pos, size) {
        for (let y = pos.y; y < pos.y + size.y; y++) {
            if (this.cells[y] == undefined)
                continue;
            for (let x = pos.x; x < pos.x + size.x; x++) {
                this.cells[y][x] = undefined;
            }
        }
    }
    deleteCell(pos) {
        if (this.hasCell(pos))
            delete this.cells[pos.y][pos.x];
    }
    getRowLength(rowIndex) {
        return this.cells[rowIndex]?.length;
    }
    get size() {
        const width = this.cells.reduce((maxWidth, row) => Math.max(row.length, maxWidth), 0);
        const height = this.cells.length;
        return vec2(width, height);
    }
}
