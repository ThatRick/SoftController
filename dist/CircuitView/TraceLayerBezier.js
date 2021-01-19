import Vec2, { vec2 } from '../Lib/Vector2.js';
const xmlns = 'http://www.w3.org/2000/svg';
const lineStyle = {
    fill: 'none',
    pointerEvents: 'visible'
};
const sizePadding = 10;
export default class TraceBezierLayer {
    constructor(parent, scale, style) {
        this.traces = new Map();
        const svg = document.createElementNS(xmlns, 'svg');
        this.svg = svg;
        this.scale = scale;
        this.style = style;
        this.cellOffset = Vec2.scale(this.scale, 0.5);
        this.minControlOffset = this.scale.x * 2;
        Object.assign(svg.style, {
            position: 'absolute',
            top: '0px', left: '0px',
            width: '100%', height: '100%',
            pointerEvents: 'none'
        });
        parent.appendChild(svg);
    }
    scaledPinEndPos(pos) { return Vec2.mul(pos, this.scale).add(this.cellOffset).round(); }
    addTrace(id, outputPos, inputPos, color) {
        const a = this.scaledPinEndPos(outputPos);
        const b = this.scaledPinEndPos(inputPos);
        this.resizeToFit(a, b);
        const curve = this.cubicCurve(a, b);
        const path = this.createPath(curve, color);
        this.traces.set(id, path);
        this.svg.appendChild(path);
    }
    updateTrace(id, outputPos, inputPos) {
        const a = this.scaledPinEndPos(outputPos);
        const b = this.scaledPinEndPos(inputPos);
        this.resizeToFit(a, b);
        const curve = this.cubicCurve(a, b);
        const trace = this.traces.get(id);
        trace.setAttributeNS(null, 'd', curve);
    }
    setTraceColor(id, color) {
        const trace = this.traces.get(id);
        const currentColor = trace.style.stroke;
        console.log('maybe set trace color:', id, color, currentColor);
        if (color != currentColor) {
            trace.style.stroke = color;
            console.log('did set trace color:', id, color, trace.style.stroke);
        }
    }
    deleteTrace(id) {
        const trace = this.traces.get(id);
        this.svg.removeChild(trace);
    }
    get size() {
        return vec2(this.svg.clientWidth, this.svg.clientHeight);
    }
    resizeToFit(a, b) {
        const max = Vec2.max(a, b).round();
        if (max.x > this.svg.clientWidth - sizePadding)
            this.svg.style.width = max.x + sizePadding + 'px';
        if (max.y > this.svg.clientHeight - sizePadding)
            this.svg.style.height = max.y + sizePadding + 'px';
    }
    cubicCurve(a, b) {
        const point = (v) => v.x + ' ' + v.y;
        const dx = Math.max(Math.round(Math.abs(b.x - a.x) / 2), this.minControlOffset);
        const ac = Vec2.add(a, vec2(dx, 0));
        const bc = Vec2.add(b, vec2(-dx, 0));
        const cubic = `M ${point(a)} C ${point(ac)}, ${point(bc)}, ${point(b)}`;
        return cubic;
    }
    createPath(curve, color) {
        const path = document.createElementNS(xmlns, 'path');
        const pathProps = {
            d: curve,
            stroke: color
        };
        Object.entries(pathProps).forEach(([key, value]) => path.setAttributeNS(null, key.toString(), value.toString()));
        Object.assign(path.style, lineStyle, {
            stroke: color,
            strokeWidth: this.style.traceWidth * this.scale.y,
        });
        return path;
    }
}
