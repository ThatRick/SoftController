import CircuitView from './CircuitView.js'
import { GUIChildElement, GUIChildEvent, GUIChildEventType } from '../GUI/GUIChildElement.js'
import { IContainerGUI, Vec2 } from '../GUI/GUITypes.js'
import IOPinView, { IOPinViewEvent } from './IOPinView.js'
import TraceLayer, { TraceRoute, ITraceAnchors } from './TraceLayer.js'
import { vec2 } from '../Lib/Vector2.js'
import { IOPinEvent } from '../State/IOPin.js'


export class TraceAnchorHandle extends GUIChildElement {
    readonly type: 'vertical' | 'horizontal'

    constructor(readonly name: keyof ITraceAnchors, readonly traceLine: TraceLine, pos: Vec2, size: Vec2) {
        super(traceLine.circuitView.body.children, 'div', pos, size)
        this.type = (name == 'horizontal') ? 'horizontal' : 'vertical'
        this.setStyle({cursor: (this.type == 'horizontal') ? 'ns-resize' : 'ew-resize'})
    }
    move(pos: Vec2) {
        const value = (this.type == 'horizontal') ? pos.y : pos.x
        this.traceLine.anchorHandleMoved(this.name, value)
    }
    onPointerEnter = () => this.setStyle({ backgroundColor: this.traceLine.circuitView.style.colors.pinHighlight })
    onPointerLeave = () => this.setStyle({ backgroundColor: 'transparent' })
}


export class TraceLine {
    route: TraceRoute
    
    update() {
        if (this.updateColorPending) this.updateColor()
        if (this.updatePositionPending) this.updatePosition()        
    }

    delete() {
        const deletedFromMap = this.circuitView.traceLines.delete(this.destPinView.io)
        console.assert(deletedFromMap, 'Failed to delete trace line from circuit view traceLinesMap')
        this.traceLayer.deleteTrace(this.route)
        this.sourcePinView.events.unsubscribe(this.pinViewGUIChildEventHandler)
        this.destPinView.events.unsubscribe(this.pinViewGUIChildEventHandler)
        this.handles.vertical1?.delete()
        this.handles.horizontal?.delete()
        this.handles.vertical2?.delete()
    }

    onSelected() { this.traceLayer.setSelected(this.route) }
    onUnselected() { this.traceLayer.setUnselected(this.route) }

    anchorHandleMoved(name: keyof ITraceAnchors, value: number) {
        this.route.anchors[name] = value
        this.updatePositionPending = true
        this.circuitView.requestUpdate(this)
    }

    static instanceCounter = 1

    constructor (
        public circuitView: CircuitView,
        public sourcePinView: IOPinView,
        public destPinView: IOPinView,
        anchors?: ITraceAnchors
    ) {
        this.traceLayer = circuitView.traceLayer

        const sourceMinReach = 1
        const destMinReach = 1

        console.log('Creating trace line with anchors', anchors)
        this.route = this.traceLayer.addTrace(sourcePinView.absPos, destPinView.absPos, sourceMinReach, destMinReach, this.getColor(), anchors)
        this.updateHandles()
        this.updateDestPinValueVisibility()

        this.sourcePinView.events.subscribe(this.pinViewGUIChildEventHandler)
        this.destPinView.events.subscribe(this.pinViewGUIChildEventHandler)
        
        this.sourcePinView.ioPinViewEvents.subscribe(this.pinViewEventHandler)
        
        this.instanceID = TraceLine.instanceCounter++
    }

    protected updateColorPending = false
    protected updatePositionPending = false
    
    protected updateColor() {
        if (this.route.color != this.sourcePinView.color) {
            this.traceLayer.updateColor(this.route, this.sourcePinView.color)
        }
        this.updateColorPending = false
    }

    protected updatePosition() {
        if (this.route.collisions) this.route.collisions = []
        this.traceLayer.updateTraceRoute(this.route, this.sourcePinView.absPos, this.destPinView.absPos)
        this.updateHandles()
        this.updatePositionPending = false
        this.updateDestPinValueVisibility()
    }

    protected updateDestPinValueVisibility() {
        const valueLength = this.sourcePinView.getValue()?.length
        if (!valueLength) return
        const limitLength = Math.max(valueLength, 3)
        const d = Vec2.sub(this.route.destPos, this.route.sourcePos).round()
        const hidden = (d.x > 0 && d.x < limitLength && d.y == 0)
        this.sourcePinView.setValueVisibility(!hidden)
    }

    protected pinViewGUIChildEventHandler = (event: GUIChildEvent) => {
        switch (event.type)
        {
            case GUIChildEventType.PositionChanged:
                this.updatePositionPending = true
                this.circuitView.requestUpdate(this)
                break

            case GUIChildEventType.Removed:
                this.delete()
                break
        }
    }

    protected pinViewEventHandler = (event: IOPinViewEvent) => {
        this.updateColorPending = true
        this.circuitView.requestUpdate(this)
    }

    protected instanceID: number

    protected traceLayer: TraceLayer

    protected handles: Record<keyof ITraceAnchors, TraceAnchorHandle> =
    {
        vertical1:    undefined,
        horizontal:   undefined,
        vertical2:    undefined
    }

    protected getColor(): string {
        return this.sourcePinView.color
    }

    protected updateHandles() {
        const handles = this.handles
        switch (this.route.points.length)
        {
            case 1:
            case 2: {
                handles.vertical1?.delete()
                handles.vertical1 = null
                handles.horizontal?.delete()
                handles.horizontal = null
                handles.vertical2?.delete()
                handles.vertical2 = null
                break
            }
            case 3:
            case 4: {
                // Vertical 1 handle
                const [v1a, v1b] = this.route.points.slice(1, 3)

                const vert1pos = (v1a.y < v1b.y) ? v1a : v1b
                const vert1size = vec2(1, Math.abs(v1a.y - v1b.y) + 1)
                
                if (handles.vertical1) {
                    handles.vertical1.setPos(vert1pos)
                    handles.vertical1.setSize(vert1size)
                } else {
                    handles.vertical1 = new TraceAnchorHandle('vertical1', this, vert1pos, vert1size)
                }
                handles.horizontal?.delete()
                handles.horizontal = null
                handles.vertical2?.delete()
                handles.vertical2 = null
                break
            }
            case 5:
            case 6: {
                // Vertical 1 handle
                const [v1a, v1b] = this.route.points.slice(1, 3)

                const vert1pos = (v1a.y < v1b.y) ? v1a : v1b
                const vert1size = vec2(1, Math.abs(v1a.y - v1b.y) + 1)
                
                if (handles.vertical1) {
                    handles.vertical1.setPos(vert1pos)
                    handles.vertical1.setSize(vert1size)
                } else {
                    handles.vertical1 = new TraceAnchorHandle('vertical1', this, vert1pos, vert1size)
                }

                // Horizontal handle
                const [ha, hb] = this.route.points.slice(2, 4)

                const horiPos = Vec2.add((ha.x < hb.x) ? ha : hb, vec2(1, 0))
                const horiSize = vec2(Math.abs(hb.x - ha.x - 1), 1)
                
                if (handles.horizontal) {
                    handles.horizontal.setPos(horiPos)
                    handles.horizontal.setSize(horiSize)
                } else {
                    handles.horizontal = new TraceAnchorHandle('horizontal', this, horiPos, horiSize)
                }

                // Vertical 2 handle
                const [v2a, v2b] = this.route.points.slice(3, 5)

                const vert2pos = (v2a.y < v2b.y) ? v2a : v2b
                const vert2size = vec2(1, Math.abs(v2a.y - v2b.y) + 1)
                
                if (handles.vertical2) {
                    handles.vertical2.setPos(vert2pos)
                    handles.vertical2.setSize(vert2size)
                } else {
                    handles.vertical2 = new TraceAnchorHandle('vertical2', this, vert2pos, vert2size)
                }
                break
            }
            default: {
                console.error('Invalid number of trace points')
            }
        }
    }
}