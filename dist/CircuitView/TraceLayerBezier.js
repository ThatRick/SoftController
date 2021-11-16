import Vec2, { vec2 } from '../Lib/Vector2.js';
const xmlns = 'http://www.w3.org/2000/svg';
const lineStyle = {
    fill: 'none',
    pointerEvents: 'visible'
};
const sizePadding = 10;
const parseID = (id) => `${Math.trunc(id / 1000)}:${id % 1000}`;
const debugLogging = false;
function logInfo(...args) { debugLogging && console.info('Trace layer:', ...args); }
function logError(...args) { console.error('Trace layer:', ...args); }
export default class TraceBezierLayer {
    constructor(parent, scale, style) {
        const svg = document.createElementNS(xmlns, 'svg');
        this.svg = svg;
        this.scale = scale;
        this.style = style;
        this.cellOffset = Vec2.scale(this.scale, 0.5);
        this.minControlOffset = this.scale.x * 2;
        this.maxControlOffset = this.scale.x * 14;
        Object.assign(svg.style, {
            position: 'absolute',
            top: '0px', left: '0px',
            width: '100%', height: '100%',
            pointerEvents: 'none'
        });
        parent.appendChild(svg);
    }
    svg;
    scale;
    style;
    cellOffset;
    minControlOffset;
    maxControlOffset;
    traces = new Map();
    scaledPinEndPos(pos) { return Vec2.mul(pos, this.scale).add(this.cellOffset).round(); }
    addTrace(id, outputPos, inputPos, color, pending = false) {
        logInfo('add', parseID(id));
        const a = this.scaledPinEndPos(outputPos);
        const b = this.scaledPinEndPos(inputPos);
        this.resizeToFit(a, b);
        const curve = this.cubicCurve(a, b);
        const path = this.createPath(curve, color);
        if (pending)
            path.style.strokeDasharray = '4';
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
        logInfo('set color', parseID(id), color);
        const trace = this.traces.get(id);
        const currentColor = trace.style.stroke;
        if (color != currentColor) {
            trace.style.stroke = color;
        }
    }
    deleteTrace(id) {
        logInfo('delete', parseID(id));
        const trace = this.traces.get(id);
        this.svg.removeChild(trace);
    }
    onTraceSelected;
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
        const d = Vec2.sub(b, a);
        const dx = Math.round(d.x / 2);
        //const ctrlOffset = Math.min(Math.max(Math.abs(dx), this.minControlOffset), this.maxControlOffset)
        const ctrlOffset = 4 * this.scale.x;
        const aCtrl = Vec2.add(a, vec2(ctrlOffset, 0));
        const bCtrl = Vec2.add(b, vec2(-ctrlOffset, 0));
        const c = Vec2.add(a, b).scale(0.5);
        const cCtrl = vec2(Math.min(c.x - d.x, aCtrl.x), c.y);
        const cubic = (dx > 0)
            ? `M ${point(a)} C ${point(aCtrl)}, ${point(bCtrl)}, ${point(b)}`
            : `M ${point(a)} C ${point(aCtrl)}, ${point(cCtrl)}, ${point(c)} S ${point(bCtrl)}, ${point(b)}`;
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
