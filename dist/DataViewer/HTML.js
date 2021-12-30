export function htmlElement(tagName, options) {
    const elem = document.createElement(tagName);
    if (options.style)
        Object.assign(elem.style, options.style);
    for (let attr in options.attributes) {
        elem.setAttribute(attr, options.attributes[attr]);
    }
    options.parent?.appendChild(elem);
    if (options.textContent)
        elem.textContent = options.textContent;
    options.setup?.(elem);
    return elem;
}
export class HTMLTable {
    element;
    rows = [];
    cells = [];
    constructor(options) {
        this.element = htmlElement('table', {
            style: options.tableStyle,
            parent: options.parentElement
        });
        for (let y = 0; y < options.rows; y++) {
            const row = htmlElement('tr', {
                style: options.rowStyle,
                parent: this.element
            });
            this.rows[y] = row;
            this.cells[y] = [];
            for (let x = 0; x < options.columns; x++) {
                const cell = htmlElement('td', {
                    style: options.cellStyle,
                    parent: row
                });
                this.cells[y][x] = cell;
            }
        }
        if (options.cellIterator)
            this.iterateCells(options.cellIterator);
    }
    delete() {
        this.rows = null,
            this.cells = null;
        this.element.parentElement.removeChild(this.element);
        this.element = null;
    }
    getCell(row, col) { return this.cells[row][col]; }
    iterateCells(iterator) {
        this.cells.forEach((row, y) => row.forEach((cell, x) => iterator(cell, y, x)));
    }
}
