import * as HTML from '../lib/HTML.js';
import { Menubar } from '../Lib/HTMLMenubar.js';
import Vec2, { vec2 } from '../Lib/Vector2.js';
export class CircuitMenuBar {
    constructor(parent) {
        this.menu = new Menubar(parent, {
            overflow: 'visible'
        });
    }
    handleGuiEvent(ev) {
        switch (ev.type) {
            case 1 /* Rescaled */:
                break;
            case 0 /* Resized */:
                break;
        }
    }
    handleCircuitViewEvent(ev) {
        switch (ev.type) {
            case 0 /* CircuitLoaded */:
                break;
            case 1 /* CircuitClosed */:
                break;
        }
    }
    attachCircuitView(view) {
        this.view = view;
        view.events.subscribe(this.handleGuiEvent.bind(this));
        view.circuitViewEvents.subscribe(this.handleCircuitViewEvent.bind(this));
        const menu = this.menu;
        menu.addItems([
            ...this.scaleControls()
        ]);
    }
    scaleControls() {
        const title = new HTML.Text('Scale: ' + this.view.scale.y, {
            style: { width: this.menu.height * 3.5 + 'px' }
        });
        this.view.events.subscribe(() => title.setText('Scale: ' + this.view.scale.y), [1 /* Rescaled */]);
        const decBtn = new HTML.ActionButton('-', {
            action: () => this.view.rescale(Vec2.sub(this.view.scale, vec2(1))),
            style: { width: this.menu.parentHeight + 'px' }
        });
        const incBtn = new HTML.ActionButton('+', {
            action: () => this.view.rescale(Vec2.add(this.view.scale, vec2(1))),
            style: { width: this.menu.parentHeight + 'px' }
        });
        const toggleGridMap = new HTML.ToggleButton('Grid map', state => {
            this.view.grid.visible = state;
            return state;
        }, this.view.grid.visible);
        return [title, decBtn, incBtn, toggleGridMap];
    }
}
