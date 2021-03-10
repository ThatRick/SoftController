const xmlns = 'http://www.w3.org/2000/svg';
export function svgElement(name, options) {
    // Create SVG Element
    const elem = document.createElementNS(xmlns, name);
    // Set SVG attributes
    options.svgAttributes && Object.entries(options.svgAttributes).forEach(([key, value]) => {
        elem.setAttribute(key, value.toString());
    });
    // Set CSS style
    options.css && Object.assign(elem.style, options.css);
    // Append to parent
    options.parent?.appendChild(elem);
    return elem;
}
export function svgElementWD(name, options) {
    // Create SVG Element
    const elem = document.createElementNS(xmlns, name);
    // Set SVG attributes
    options.svgAttributes && Object.entries(options.svgAttributes).forEach(([key, value]) => {
        elem.setAttribute(key, value.toString());
    });
    // Set CSS style
    options.css && Object.assign(elem.style, options.css);
    // Append to parent
    options.parent?.appendChild(elem);
    return elem;
}
export class SVGLine {
    constructor(startPos, endPos, options) {
        this.options = options;
        this.line = svgElement('line', {
            svgAttributes: {
                x1: startPos.x, y1: startPos.y,
                x2: endPos.x, y2: endPos.y,
            },
            css: {
                stroke: options.color ?? 'white',
                strokeWidth: (options.strokeWidth ?? 1) + 'px',
                strokeDasharray: options.dashArray ?? '',
                fill: 'none',
            },
            parent: options.parent
        });
    }
    setStartPos(pos) {
        this.line.setAttribute('x1', pos.x + 'px');
        this.line.setAttribute('y1', pos.y + 'px');
    }
    setEndPos(pos) {
        this.line.setAttribute('x2', pos.x + 'px');
        this.line.setAttribute('y2', pos.y + 'px');
    }
    delete() {
        this.options.parent?.removeChild(this.line);
    }
}
