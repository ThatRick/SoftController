import Vec2, {vec2} from '../Lib/Vector2.js'

const xmlns = 'http://www.w3.org/2000/svg'

const lineStyle = {
    stroke: 'yellow',
    strokeWidth: 2,
    pointerEvents: 'visible'
}
 
const sizePadding = 10

export interface Trace
{
    a: Vec2
    b: Vec2
    tx1?: number
    ty?: number
    tx2?: number
    segments: SVGLineElement[]
}

export default class TraceLayerRectangular
{
    svg: SVGSVGElement
    scale: Vec2
    cellOffset: Vec2

    traces: Trace[] = []

    get size() {
        return vec2(this.svg.clientWidth, this.svg.clientHeight)
    }
    
    constructor(parent: HTMLElement, scale: Vec2) {
        const svg = document.createElementNS(xmlns, 'svg');
        this.svg = svg
        this.scale = scale
        this.cellOffset = Vec2.scale(this.scale, 0.5)

        Object.assign(svg.style, {
            position: 'absolute',
            top: '0px', left: '0px',
            width: '100%', height: '100%',
            pointerEvents: 'none'
        } as Partial<CSSStyleDeclaration>)
        
        parent.appendChild(svg)
    }

    addLine(a: Vec2, b: Vec2, tx1?: number, ty?: number, tx2?: number)
    {
        let segments: SVGLineElement[]
        let line: Trace
        
        const offsetX = b.x - a.x
        const offsetY = b.y - a.y

        const minOffsetX = 4
        
        // 1 segment
        if (offsetY == 0 && offsetX > 0) {
            segments = [this.createSegment(a, b)]
        }
        
        // 3 segments
        else if (offsetX > minOffsetX*2) {
            tx1 ??= a.x + offsetX / 2
            const va = vec2(tx1, a.y)
            const vb = vec2(tx1, b.y)
            segments = [
                this.createSegment(a, va),      // horizontal 1
                this.createSegment(va, vb),     // vertical
                this.createSegment(vb, b),      // horizontal 2
            ]
        }

        // 5 segments
        else {
            tx1 ??= a.x + minOffsetX
            tx2 ??= b.x - minOffsetX
            ty ??= a.y + offsetY / 2
            const v1a = vec2(tx1, a.y)
            const v1b = vec2(tx1, ty)
            const v2a = vec2(tx2, ty) 
            const v2b = vec2(tx2, b.y)
            segments = [
                this.createSegment(a, v1a),     // horizontal 1
                this.createSegment(v1a, v1b),   // vertical 1
                this.createSegment(v1b, v2a),   // horizontal 2
                this.createSegment(v2a, v2b),   // vertical 2
                this.createSegment(v2b, b),     // horizontal 3
            ]
        }

        this.traces.push({
            a: a.copy(),
            b: b.copy(),
            tx1, ty, tx2,
            segments
        })
        console.log(...segments)
    }

    createSegment(_a: Vec2, _b: Vec2): SVGLineElement {

        const a = Vec2.mul(_a, this.scale).add(this.cellOffset)
        const b = Vec2.mul(_b, this.scale).add(this.cellOffset)

        const addition = lineStyle.strokeWidth / 2
        // Elongate horizontal line to fix corners
        if (_a.y == _b.y) {
            const dir = (_a.x < _b.x) ? 1 : -1
            a.x -= addition * dir
            b.x += addition * dir
        }
        // Elongate vertical line to fix corners
        if (_a.x == _b.x) {
            const dir = (_a.y < _b.y) ? 1 : -1
            a.y -= addition * dir
            b.y += addition * dir
        }

        const line = document.createElementNS(xmlns, 'line');
        const lineProps = {
            x1: a.x, y1: a.y,
            x2: b.x, y2: b.y
        }
        const max = Vec2.max(a, b).round()
        if (max.x > this.svg.clientWidth - sizePadding) this.svg.style.width = max.x + sizePadding + 'px'
        if (max.y > this.svg.clientHeight - sizePadding) this.svg.style.height = max.y + sizePadding + 'px'

        Object.entries(lineProps).forEach(([key, value]) => line.setAttributeNS(null, key.toString(), value.toString()))
        
        Object.assign(line.style, lineStyle)

        this.svg.appendChild(line)

        return line
    }
}
