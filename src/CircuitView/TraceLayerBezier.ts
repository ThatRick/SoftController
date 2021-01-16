import Vec2, {vec2} from '../Lib/Vector2.js'
import { ICircuitTraceLayer } from './CircuitView.js';

const xmlns = 'http://www.w3.org/2000/svg'

const lineStyle = {
    stroke: 'yellow',
    fill: 'none',
    strokeWidth: 2,
    pointerEvents: 'visible'
}
 
const sizePadding = 10


export default class TraceBezierLayer implements ICircuitTraceLayer
{

    constructor(parent: HTMLElement, scale: Vec2) {
        const svg = document.createElementNS(xmlns, 'svg');
        this.svg = svg
        this.scale = scale
        this.cellOffset = Vec2.scale(this.scale, 0.5)
        this.controlOffset = this.scale.x * 6 

        Object.assign(svg.style, {
            position: 'absolute',
            top: '0px', left: '0px',
            width: '100%', height: '100%',
            pointerEvents: 'none'
        } as Partial<CSSStyleDeclaration>)
        
        parent.appendChild(svg)
    }

    svg: SVGSVGElement
    scale: Vec2
    cellOffset: Vec2
    controlOffset: number

    traces = new Map<number, SVGPathElement>()

    addTrace(id: number, outputPos: Vec2, inputPos: Vec2)
    {
        console.log('Add trace')
        const a = Vec2.mul(outputPos, this.scale).add(this.cellOffset).round()
        const b = Vec2.mul(inputPos, this.scale).add(this.cellOffset).round()

        this.resizeToFit(a, b)

        const curve = this.cubicCurve(a, b)

        const path = this.createPath(curve)

        this.traces.set(id, path)

        this.svg.appendChild(path)
    }

    updateTrace(id: number, outputPos: Vec2, inputPos: Vec2) {
        const a = Vec2.mul(outputPos, this.scale).round()
        const b = Vec2.mul(inputPos, this.scale).round()

        this.resizeToFit(a, b)

        const curve = this.cubicCurve(a, b)

        const trace = this.traces.get(id)

        trace.setAttributeNS(null, 'd', curve)
    }

    deleteTrace(id: number) {
        const trace = this.traces.get(id)
        this.svg.removeChild(trace)
    }

    onTraceSelected: (id: number) => void


    get size() {
        return vec2(this.svg.clientWidth, this.svg.clientHeight)
    }
    
    resizeToFit(a: Vec2, b: Vec2) {
        const max = Vec2.max(a, b).round()
        if (max.x > this.svg.clientWidth - sizePadding) this.svg.style.width = max.x + sizePadding + 'px'
        if (max.y > this.svg.clientHeight - sizePadding) this.svg.style.height = max.y + sizePadding + 'px'
    }

    cubicCurve(a: Vec2, b: Vec2) {
        const point = (v: Vec2) => v.x + ' ' + v.y

        const ac = Vec2.add(a, vec2(this.controlOffset, 0))
        const bc = Vec2.add(b, vec2(-this.controlOffset, 0))

        const cubic = `M ${point(a)} C ${point(ac)}, ${point(bc)}, ${point(b)}`

        return cubic
    }

    createPath(curve: string) {
        const path = document.createElementNS(xmlns, 'path');
        const pathProps = {
            d: curve,
        }

        Object.entries(pathProps).forEach(([key, value]) => path.setAttributeNS(null, key.toString(), value.toString()))
        
        Object.assign(path.style, lineStyle)

        return path
    }
}
