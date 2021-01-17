import { IStyleGUI } from '../GUI/GUITypes.js';
import Vec2, {vec2} from '../Lib/Vector2.js'
import { CircuitStyle } from './CircuitTypes.js';
import { ICircuitTraceLayer } from './CircuitView.js';

const xmlns = 'http://www.w3.org/2000/svg'

const lineStyle = {
    fill: 'none',
    pointerEvents: 'visible'
}
 
const sizePadding = 10


export default class TraceBezierLayer implements ICircuitTraceLayer
{
    constructor(parent: HTMLElement, scale: Vec2, style: CircuitStyle) {
        const svg = document.createElementNS(xmlns, 'svg');
        this.svg = svg
        this.scale = scale
        this.style = style
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
    style: CircuitStyle
    cellOffset: Vec2
    controlOffset: number

    traces = new Map<number, SVGPathElement>()

    scaledPinEndPos(pos: Vec2) {return Vec2.mul(pos, this.scale).add(this.cellOffset).round() }

    addTrace(id: number, outputPos: Vec2, inputPos: Vec2, color: string)
    {
        const a = this.scaledPinEndPos(outputPos)
        const b = this.scaledPinEndPos(inputPos)

        this.resizeToFit(a, b)

        const curve = this.cubicCurve(a, b)

        const path = this.createPath(curve, color)

        this.traces.set(id, path)

        this.svg.appendChild(path)
    }

    updateTrace(id: number, outputPos: Vec2, inputPos: Vec2) {
        const a = this.scaledPinEndPos(outputPos)
        const b = this.scaledPinEndPos(inputPos)

        this.resizeToFit(a, b)

        const curve = this.cubicCurve(a, b)

        const trace = this.traces.get(id)
        
        trace.setAttributeNS(null, 'd', curve)
    }
    
    setTraceColor(id: number, color: string) {
        const trace = this.traces.get(id)
        const currentColor = trace.style.stroke
        console.log('maybe set trace color:', id, color, currentColor)
        if (color != currentColor) {
            trace.style.stroke = color
            console.log('did set trace color:', id, color, trace.style.stroke)
        }

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

        const dx = Math.max(Math.round(Math.abs(b.x - a.x) / 2), this.controlOffset)
        const ac = Vec2.add(a, vec2(dx, 0))
        const bc = Vec2.add(b, vec2(-dx, 0))

        const cubic = `M ${point(a)} C ${point(ac)}, ${point(bc)}, ${point(b)}`

        return cubic
    }

    createPath(curve: string, color: string) {
        const path = document.createElementNS(xmlns, 'path');
        const pathProps = {
            d: curve,
            stroke: color
        }

        Object.entries(pathProps).forEach(([key, value]) => path.setAttributeNS(null, key.toString(), value.toString()))
        
        Object.assign(path.style, lineStyle, {
            stroke: color,
            strokeWidth: this.style.traceWidth * this.scale.y,
        })

        return path
    }
}
