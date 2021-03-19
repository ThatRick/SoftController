import * as HTML from '../lib/HTML.js';
import { Menubar } from '../Lib/HTMLMenubar.js';
import Vec2, { vec2 } from '../Lib/Vector2.js';
export class CircuitMenuBar {
    constructor(parent) {
        this.handleGuiEvent = (ev) => {
            switch (ev.type) {
                case 1 /* Rescaled */:
                    this.menuItems.scaleTitle.setText('scale: ' + this.view.scale.y);
                    break;
                case 0 /* Resized */:
                    break;
            }
        };
        this.handleCircuitViewEvent = (ev) => {
            switch (ev.type) {
                case 0 /* CircuitLoaded */:
                    break;
                case 1 /* CircuitClosed */:
                    break;
                case 2 /* NameChanged */:
                    this.menuItems.name.setText(this.view.name);
                    break;
            }
        };
        this.menu = new Menubar(parent, {
            overflow: 'visible'
        });
    }
    attachCircuitView(view) {
        this.view = view;
        view.events.subscribe(this.handleGuiEvent);
        view.circuitViewEvents.subscribe(this.handleCircuitViewEvent);
        const menu = this.menu;
        this.menuItems = {
            name: new HTML.Text(view.name),
            gap1: new HTML.Space(14),
            ...this.scaleControls(),
            gap2: new HTML.Space(14),
            gridMapToggle: this.toggleGridMap(),
            step: this.stepController()
        };
        menu.addItems(Object.values(this.menuItems));
    }
    stepController() {
        return new HTML.ActionButton('Step', {
            action: () => this.view.circuitBlock.update(100)
        });
    }
    toggleGridMap() {
        return new HTML.ToggleButton('Grid map', state => {
            this.view.grid.visible = state;
            return state;
        }, this.view.grid.visible);
    }
    scaleControls() {
        const scaleTitle = new HTML.Text('scale: ' + this.view.scale.y, {
            style: { width: this.menu.height * 3.5 + 'px' }
        });
        const scaleDecBtn = new HTML.ActionButton('-', {
            action: () => this.view.rescale(Vec2.sub(this.view.scale, vec2(1))),
            style: { width: this.menu.parentHeight + 'px' }
        });
        const scaleIncBtn = new HTML.ActionButton('+', {
            action: () => this.view.rescale(Vec2.add(this.view.scale, vec2(1))),
            style: { width: this.menu.parentHeight + 'px' }
        });
        return { scaleTitle, scaleDecBtn, scaleIncBtn };
    }
}
