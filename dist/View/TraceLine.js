import { GUIChildElement } from '../GUI/GUIChildElement.js';
import { vec2 } from '../Lib/Vector2.js';
class TraceHandle extends GUIChildElement {
    constructor(parent, pos, size) {
        super(parent, 'div', pos, size, {
            backgroundColor: 'rgba(255,255,0,0.3)'
        });
    }
}
export class TraceLine {
    constructor(circuitView, sourcePin, destPin) {
        this.circuitView = circuitView;
        this.sourcePin = sourcePin;
        this.destPin = destPin;
        this.handles = {};
        this.traceLayer = circuitView.traceLayer;
        const sourceMinReach = sourcePin.io.datatype == 'BINARY' ? 1 : 3;
        const destMinReach = destPin.io.datatype == 'BINARY' ? 1 : 3;
        this.route = this.traceLayer.addTrace(sourcePin.absPos, destPin.absPos, sourceMinReach, destMinReach, this.getColor());
        this.updateHandles();
        this.sourcePin.events.subscribe(this.updateRoute.bind(this), [0 /* Moved */]);
        this.destPin.events.subscribe(this.updateRoute.bind(this), [0 /* Moved */]);
    }
    update() {
        this.traceLayer.updateTraceRoute(this.route, this.sourcePin.absPos, this.destPin.absPos);
        this.updateHandles();
    }
    delete() {
        this.traceLayer.deleteTrace(this.route);
        this.route = null;
        this.sourcePin.events.unsubscribe(this.updateRoute);
        this.destPin.events.unsubscribe(this.updateRoute);
    }
    getColor() {
        return 'white';
    }
    updateColor() {
        this.traceLayer.updateColor(this.route, this.sourcePin.color);
    }
    updateRoute(e) {
        this.circuitView.requestUpdate(this);
    }
    updateHandles() {
        const handles = this.handles;
        switch (this.route.points.length) {
            case 2: {
                handles.vertical1?.delete();
                handles.vertical1 ??= null;
                handles.horizontal?.delete();
                handles.horizontal ??= null;
                handles.vertical2?.delete();
                handles.vertical2 ??= null;
                break;
            }
            case 4: {
                const [v1a, v1b] = this.route.points.slice(1, 3);
                const vert1pos = (v1a.y < v1b.y) ? v1a : v1b;
                const vert1size = vec2(1, Math.abs(v1a.y - v1b.y) + 1);
                if (handles.vertical1) {
                    handles.vertical1.setPos(vert1pos);
                    handles.vertical1.setSize(vert1size);
                }
                else {
                    handles.vertical1 = new TraceHandle(this.circuitView.children, vert1pos, vert1size);
                }
                handles.horizontal?.delete();
                handles.horizontal ??= null;
                handles.vertical2?.delete();
                handles.vertical2 ??= null;
                break;
            }
            case 6: {
                // Vertical 1 handle
                const [v1a, v1b] = this.route.points.slice(1, 3);
                const vert1pos = (v1a.y < v1b.y) ? v1a : v1b;
                const vert1size = vec2(1, Math.abs(v1a.y - v1b.y) + 1);
                if (handles.vertical1) {
                    handles.vertical1.setPos(vert1pos);
                    handles.vertical1.setSize(vert1size);
                }
                else {
                    handles.vertical1 = new TraceHandle(this.circuitView.children, vert1pos, vert1size);
                }
                // Horizontal handle
                const [ha, hb] = this.route.points.slice(3, 5);
                const horiPos = (ha.x < hb.x) ? ha : hb;
                const horiSize = vec2(Math.abs(ha.x - hb.x + 1), 1);
                if (handles.horizontal) {
                    handles.horizontal.setPos(horiPos);
                    handles.horizontal.setSize(horiSize);
                }
                else {
                    handles.horizontal = new TraceHandle(this.circuitView.children, horiPos, horiSize);
                }
                // Vertical 2 handle
                const [v2a, v2b] = this.route.points.slice(5, 7);
                const vert2pos = (v2a.y < v2b.y) ? v2a : v2b;
                const vert2size = vec2(1, Math.abs(v2a.y - v2b.y + 1));
                if (handles.vertical2) {
                    handles.vertical2.setPos(vert2pos);
                    handles.vertical2.setSize(vert2size);
                }
                else {
                    handles.vertical2 = new TraceHandle(this.circuitView.children, vert2pos, vert2size);
                }
                break;
            }
            default: {
                console.error('Invalid number of trace points');
            }
        }
    }
}
