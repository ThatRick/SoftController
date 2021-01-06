const xmlns = 'http://www.w3.org/2000/svg';
const lineStyle = {
    stroke: 'yellow',
    strokeWidth: 8,
    pointerEvents: 'visible'
};
export default class TraceView {
    constructor(parent) {
        this.lines = [];
        const svg = document.createElementNS(xmlns, 'svg');
        this.svg = svg;
        Object.assign(svg.style, {
            position: 'absolute',
            top: '0px', left: '0px',
            width: '100%', height: '100%',
            pointerEvents: 'none'
        });
        parent.appendChild(svg);
    }
    addLine(a, b) {
        const line = document.createElementNS(xmlns, 'line');
        const lineProps = {
            x1: a.x, y1: a.y,
            x2: b.x, y2: b.y
        };
        Object.entries(lineProps).forEach(([key, value]) => line.setAttributeNS(null, key.toString(), value.toString()));
        Object.assign(line.style, lineStyle);
        this.svg.appendChild(line);
        this.lines.push({ svgElement: line, a, b });
    }
}
