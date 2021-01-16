import Vec2, { vec2 } from '../Lib/Vector2.js';
const xmlns = 'http://www.w3.org/2000/svg';
const lineStyle = {
    stroke: 'yellow',
    fill: 'none',
    strokeWidth: 2,
    pointerEvents: 'visible'
};
const sizePadding = 10;
export default class TraceBezierLayer {
    constructor(parent, scale) {
        this.traces = new Map();
        const svg = document.createElementNS(xmlns, 'svg');
        this.svg = svg;
        this.scale = scale;
        this.cellOffset = Vec2.scale(this.scale, 0.5);
        this.controlOffset = this.scale.x * 6;
        Object.assign(svg.style, {
            position: 'absolute',
            top: '0px', left: '0px',
            width: '100%', height: '100%',
            pointerEvents: 'none'
        });
        parent.appendChild(svg);
    }
    addTrace(id, outputPos, inputPos) {
        console.log('Add trace');
        const a = Vec2.mul(outputPos, this.scale).add(this.cellOffset).round();
        const b = Vec2.mul(inputPos, this.scale).add(this.cellOffset).round();
        this.resizeToFit(a, b);
        const curve = this.cubicCurve(a, b);
        const path = this.createPath(curve);
        this.traces.set(id, path);
        this.svg.appendChild(path);
    }
    updateTrace(id, outputPos, inputPos) {
        const a = Vec2.mul(outputPos, this.scale).round();
        const b = Vec2.mul(inputPos, this.scale).round();
        this.resizeToFit(a, b);
        const curve = this.cubicCurve(a, b);
        const trace = this.traces.get(id);
        trace.setAttributeNS(null, 'd', curve);
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
        const ac = Vec2.add(a, vec2(this.controlOffset, 0));
        const bc = Vec2.add(b, vec2(-this.controlOffset, 0));
        const cubic = `M ${point(a)} C ${point(ac)}, ${point(bc)}, ${point(b)}`;
        return cubic;
    }
    createPath(curve) {
        const path = document.createElementNS(xmlns, 'path');
        const pathProps = {
            d: curve,
        };
        Object.entries(pathProps).forEach(([key, value]) => path.setAttributeNS(null, key.toString(), value.toString()));
        Object.assign(path.style, lineStyle);
        return path;
    }
}
