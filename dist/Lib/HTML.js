export function domElement(parentDOM, tagName, style) {
    const elem = document.createElement(tagName);
    Object.assign(elem.style, style);
    parentDOM?.appendChild(elem);
    return elem;
}
export class Text {
    constructor(text, style, parent) {
        this.DOMElement = domElement(null, 'div', {
            display: 'inline-block',
            paddingLeft: '2px',
            paddingRight: '2px',
            ...style
        });
        this.DOMElement.textContent = text;
        parent?.appendChild(this.DOMElement);
    }
}
export class Button {
    constructor(text, parent, style) {
        this.color = {
            base: '#446',
            light: '#669',
            active: '#77D'
        };
        this.backgroundColor = this.color.base;
        this.DOMElement = domElement(null, 'div', {
            color: 'white',
            paddingLeft: '2px',
            paddingRight: '2px',
            marginLeft: '1px',
            marginRight: '1px',
            backgroundColor: this.backgroundColor,
            border: '1px solid ' + this.color.light,
            borderRadius: '2px',
            textAlign: 'center',
            userSelect: 'none',
            cursor: 'pointer',
            ...style
        });
        this.DOMElement.textContent = text;
        this.DOMElement.onpointerenter = ev => this.DOMElement.style.backgroundColor = this.color.light;
        this.DOMElement.onpointerleave = ev => this.DOMElement.style.backgroundColor = this.backgroundColor;
        this.DOMElement.onclick = ev => this.onClick?.(ev);
        this.DOMElement.onpointerdown = ev => this.onDown?.(ev);
        this.DOMElement.onpointerup = ev => this.onUp?.(ev);
        parent?.appendChild(this.DOMElement);
    }
    flash(color) {
        this.DOMElement.style.backgroundColor = color;
        setTimeout(() => {
            this.DOMElement.style.backgroundColor = this.backgroundColor;
        }, 30);
    }
}
export class ActionButton extends Button {
    constructor(text, action, parent) {
        super(text, parent);
        this.onClick = () => {
            this.flash(this.color.active);
            action();
        };
    }
}
export class ToggleButton extends Button {
    constructor(text, toggle, initState = false, parent) {
        super(text, parent);
        this.state = initState;
        this.onClick = () => {
            this.state = toggle(!this.state);
            this.backgroundColor = this.state ? this.color.light : this.color.base;
            this.DOMElement.style.borderColor = this.state ? 'white' : this.color.light;
            this.flash(this.color.active);
        };
    }
}
export class Table {
    constructor(options) {
        this.rows = [];
        this.cells = [];
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
    getCell(row, col) { return this.cells[row][col]; }
    iterateCells(iterator) {
        this.cells.forEach((row, y) => row.forEach((cell, x) => iterator(cell, y, x)));
    }
}
