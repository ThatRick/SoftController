import Vec2, { vec2 } from './Vector2.js';
const xmlns = 'http://www.w3.org/2000/svg';
const lineStyle = {
    stroke: 'yellow',
    strokeWidth: 3,
    pointerEvents: 'visible'
};
const sizePadding = 10;
export default class TraceLayer {
    constructor(parent, scale) {
        this.lines = [];
        const svg = document.createElementNS(xmlns, 'svg');
        this.svg = svg;
        this.scale = scale;
        Object.assign(svg.style, {
            position: 'absolute',
            top: '0px', left: '0px',
            width: '100%', height: '100%',
            pointerEvents: 'none'
        });
        parent.appendChild(svg);
    }
    get size() {
        return vec2(this.svg.clientWidth, this.svg.clientHeight);
    }
    addLine(a, b, tx1, ty, tx2) {
        let segments;
        let line;
        const offsetX = b.x - a.x;
        const offsetY = b.y - a.y;
        const minOffsetX = 4;
        // 1 segment
        if (offsetY == 0 && offsetX > 0) {
            segments = [this.createSegment(a, b)];
        }
        // 3 segments
        else if (offsetX > minOffsetX * 2) {
            tx1 ??= a.x + offsetX / 2;
            const va = vec2(tx1, a.y);
            const vb = vec2(tx1, b.y);
            segments = [
                this.createSegment(a, va),
                this.createSegment(va, vb),
                this.createSegment(vb, b),
            ];
        }
        // 5 segments
        else {
            tx1 ??= a.x + minOffsetX;
            tx2 ??= b.x - minOffsetX;
            ty ??= a.y + offsetY / 2;
            const v1a = vec2(tx1, a.y);
            const v1b = vec2(tx1, ty);
            const v2a = vec2(tx2, ty);
            const v2b = vec2(tx2, b.y);
            segments = [
                this.createSegment(a, v1a),
                this.createSegment(v1a, v1b),
                this.createSegment(v1b, v2a),
                this.createSegment(v2a, v2b),
                this.createSegment(v2b, b),
            ];
        }
        this.lines.push({
            a: a.copy(),
            b: b.copy(),
            tx1, ty, tx2,
            segments
        });
        console.log(...segments);
    }
    createSegment(_a, _b) {
        const a = Vec2.mul(_a, this.scale);
        const b = Vec2.mul(_b, this.scale);
        const line = document.createElementNS(xmlns, 'line');
        const lineProps = {
            x1: a.x, y1: a.y,
            x2: b.x, y2: b.y
        };
        const max = Vec2.max(a, b);
        if (max.x > this.svg.clientWidth - sizePadding)
            this.svg.style.width = max.x + sizePadding + 'px';
        if (max.y > this.svg.clientHeight - sizePadding)
            this.svg.style.height = max.y + sizePadding + 'px';
        Object.entries(lineProps).forEach(([key, value]) => line.setAttributeNS(null, key.toString(), value.toString()));
        Object.assign(line.style, lineStyle);
        this.svg.appendChild(line);
        return line;
    }
}
