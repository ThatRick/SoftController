import Vec2 from '../Vector2.js'

const xmlns = 'http://www.w3.org/2000/svg'

export function svgElement<K extends keyof SVGElementTagNameMap>(name: K, options: {
    svgAttributes?: Record<string, string | number>,
    css?: Partial<CSSStyleDeclaration>,
    parent?: SVGElement
} = {}): SVGElementTagNameMap[K]
{
    // Create SVG Element
    const elem = document.createElementNS(xmlns, name)
    // Set SVG attributes
    options.svgAttributes && Object.entries(options.svgAttributes).forEach(([key, value]) => {
        elem.setAttribute(key, value.toString())
    })
    // Set CSS style
    options.css && Object.assign(elem.style, options.css)
    // Append to parent
    options.parent?.appendChild(elem)
    return elem
}

export function setSVGAttributes(elem: SVGElement, attributes: Record<string, string | number>) {
    Object.entries(attributes).forEach(([key, value]) => {
        elem.setAttribute(key, value.toString())
    })
}

export function svgElementWD(name: string, options: {
    svgAttributes?: Record<string, string|number>,
    css?: Partial<CSSStyleDeclaration>,
    parent?: SVGElement
} = {}): SVGElement
{
    // Create SVG Element
    const elem = document.createElementNS(xmlns, name)
    // Set SVG attributes
    options.svgAttributes && Object.entries(options.svgAttributes).forEach(([key, value]) => {
        elem.setAttribute(key, value.toString())
    })
    // Set CSS style
    options.css && Object.assign(elem.style, options.css)
    // Append to parent
    options.parent?.appendChild(elem)
    return elem
}

export class SVGLine
{
    line: SVGLineElement
    constructor(startPos: Vec2, endPos: Vec2, protected options: {
        parent?: SVGSVGElement | SVGGElement,
        color?: string,
        dashArray?: string,
        strokeWidth?: number
    }) {
        this.color = options.color ?? 'white'
        this.line = svgElement('line', {
            svgAttributes: {
                x1: startPos.x,    y1: startPos.y,
                x2: endPos.x,      y2: endPos.y,
            },
            css: {
                stroke: this.color,
                strokeWidth: (options.strokeWidth ?? 1) +'px',
                strokeDasharray: options.dashArray ?? '',
                fill: 'none',
            },
            parent: options.parent
        })
    }
    
    protected color: string

    setColor(color: string) {
        if (color == this.color) return
        this.color = color
        this.line.style.stroke = this.color
    }
    setStartPos(pos: Vec2) {
        this.line.setAttribute('x1', pos.x+'px')
        this.line.setAttribute('y1', pos.y+'px')
    }
    setEndPos(pos: Vec2) {
        this.line.setAttribute('x2', pos.x+'px')
        this.line.setAttribute('y2', pos.y+'px')
    }
    delete() {
        this.options.parent?.removeChild(this.line)
    }
}