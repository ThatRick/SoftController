import { domElement, Element } from './HTMLCommon.js';
export class Table extends Element {
    rows = [];
    cells = [];
    constructor(options) {
        super();
        this.DOMElement = domElement(options.parentElement, 'table', options.tableStyle);
        for (let y = 0; y < options.rows; y++) {
            const row = domElement(this.DOMElement, 'tr', options.rowStyle);
            this.rows[y] = row;
            this.cells[y] = [];
            for (let x = 0; x < options.columns; x++) {
                const cell = domElement(row, 'td', options.cellStyle);
                this.cells[y][x] = cell;
            }
        }
        if (options.cellIterator)
            this.iterateCells(options.cellIterator);
    }
    delete() {
        this.rows = null,
            this.cells = null;
        this.DOMElement.parentElement.removeChild(this.DOMElement);
        this.DOMElement = null;
    }
    getCell(row, col) { return this.cells[row][col]; }
    iterateCells(iterator) {
        this.cells.forEach((row, y) => row.forEach((cell, x) => iterator(cell, y, x)));
    }
}
