export { svgElement, svgElementWD, setSVGAttributes, SVGLine } from './SVGElement.js';
export const defaultStyle = {
    colors: {
        base: '#445',
        light: '#668',
        active: '#77D',
        text: 'white',
        altText: '#DDD'
    },
    boxShadow: '0px 2px 2px 1px rgba(0,0,0,0.25)',
    fontSize: 14
};
export class Element {
    constructor() {
        this.style = defaultStyle;
    }
    remove() {
        this.DOMElement?.parentElement?.removeChild(this.DOMElement);
        this.DOMElement = null;
    }
    setCSS(style) {
        Object.assign(this.DOMElement.style, style);
    }
}
export function domElement(parentDOM, tagName, style) {
    const elem = document.createElement(tagName);
    Object.assign(elem.style, style);
    parentDOM?.appendChild(elem);
    return elem;
}
export class Text extends Element {
    constructor(text, options) {
        super();
        this.DOMElement = domElement(null, 'div', {
            paddingLeft: '2px',
            paddingRight: '4px',
            ...options?.style
        });
        this.setText(text);
        options?.parent?.appendChild(this.DOMElement);
    }
    setText(text) { this.DOMElement.textContent = text; }
}
export class Button extends Element {
    constructor(text, parent, style) {
        super();
        this.backgroundColor = this.style.colors.base;
        this.DOMElement = domElement(null, 'div', {
            color: 'white',
            paddingLeft: '2px',
            paddingRight: '2px',
            marginLeft: '1px',
            marginRight: '1px',
            backgroundColor: this.style.colors.base,
            border: '1px solid ' + this.style.colors.light,
            borderRadius: '2px',
            textAlign: 'center',
            userSelect: 'none',
            cursor: 'pointer',
            ...style
        });
        this.DOMElement.textContent = text;
        this.DOMElement.onpointerenter = ev => this.DOMElement.style.backgroundColor = this.style.colors.light;
        this.DOMElement.onpointerleave = ev => this.DOMElement.style.backgroundColor = this.backgroundColor;
        this.DOMElement.onclick = ev => {
            ev.stopPropagation();
            this.onClick?.(ev);
        };
        this.DOMElement.onpointerdown = ev => {
            ev.stopPropagation();
            this.onDown?.(ev);
        };
        this.DOMElement.onpointerup = ev => {
            ev.stopPropagation();
            this.onUp?.(ev);
        };
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
    constructor(name, options) {
        super(name, options.parent, options.style);
        this.onClick = () => {
            this.flash(this.style.colors.active);
            options.action();
        };
    }
}
export class ToggleButton extends Button {
    constructor(text, toggle, initState = false, parent) {
        super(text, parent);
        this.state = initState;
        this.updateStyle();
        this.onClick = () => {
            this.state = toggle(!this.state);
            this.updateStyle();
            this.flash(this.style.colors.active);
        };
    }
    updateStyle() {
        this.backgroundColor = this.state ? this.style.colors.light : this.style.colors.base;
        this.setCSS({
            backgroundColor: this.backgroundColor,
            borderColor: this.state ? 'white' : this.style.colors.light
        });
    }
}
export class Table extends Element {
    constructor(options) {
        super();
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
export function backgroundGridStyle(scale, lineColor) {
    return {
        backgroundImage: `linear-gradient(to right, ${lineColor} 1px, transparent 1px), linear-gradient(to bottom, ${lineColor} 1px, transparent 1px)`,
        backgroundSize: `${scale.x}px ${scale.y}px`
    };
}
export function backgroundLinesStyle(scale, lineColor) {
    return {
        backgroundImage: `linear-gradient(to bottom, ${lineColor} 1px, transparent 1px)`,
        backgroundSize: `${scale.x}px ${scale.y}px`
    };
}
export function backgroundDotStyle(scale, lineColor) {
    return {
        backgroundImage: `radial-gradient(circle, ${lineColor} 1px, transparent 1px)`,
        backgroundSize: `${scale.x}px ${scale.y}px`
    };
}
export function getInnerHeight(elm) {
    const computed = getComputedStyle(elm);
    const padding = parseInt(computed.paddingTop) + parseInt(computed.paddingBottom);
    const margin = parseInt(computed.marginTop) + parseInt(computed.marginBottom);
    const border = parseInt(computed.borderTop) + parseInt(computed.borderBottom);
    return elm.clientHeight - padding - border;
}
