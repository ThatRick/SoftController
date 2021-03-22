import * as HTML from '../Lib/HTML.js';
import Vec2, { vec2 } from '../Lib/Vector2.js';
export class CircuitMenuBar {
    constructor(parent) {
        this.handleGuiEvent = (ev) => {
            switch (ev.type) {
                case 1 /* Rescaled */:
                    this.menuItems.scaleTitle.setText('scale: ' + this.circuitView.scale.y);
                    break;
                case 0 /* Resized */:
                    break;
            }
        };
        this.handleCircuitViewEvent = (ev) => {
            console.log('circuit menu bar received circuit view event');
            switch (ev.type) {
                case 0 /* CircuitLoaded */:
                    break;
                case 1 /* CircuitClosed */:
                    break;
                case 2 /* NameChanged */:
                    this.menuItems.name.setText(this.circuitView.name);
                    break;
            }
        };
        this.menu = new HTML.Menubar(parent, {
            overflow: 'visible'
        });
    }
    attachCircuitView(circuitView) {
        this.circuitView = circuitView;
        circuitView.events.subscribe(this.handleGuiEvent);
        circuitView.circuitViewEvents.subscribe(this.handleCircuitViewEvent);
        const menu = this.menu;
        this.menuItems = {
            name: this.circuitName(),
            gap1: new HTML.Space(14),
            ...this.fileControls(),
            gap2: new HTML.Space(14),
            ...this.scaleControls(),
            gap3: new HTML.Space(14),
            gridMapToggle: this.toggleGridMap(),
            step: this.stepController()
        };
        menu.addItems(Object.values(this.menuItems));
    }
    stepController() {
        return new HTML.ActionButton('Step', {
            action: () => this.circuitView.circuitBlock.update(100)
        });
    }
    toggleGridMap() {
        return new HTML.ToggleButton('Grid map', state => {
            this.circuitView.grid.visible = state;
            return state;
        }, this.circuitView.grid.visible);
    }
    circuitName() {
        const nameLabel = new HTML.Text(this.circuitView.name);
        nameLabel.DOMElement.ondblclick = () => {
            const input = new HTML.InputField({
                name: 'Circuit Name',
                value: this.circuitView.name,
                pos: vec2(0, 0),
                parent: nameLabel.DOMElement,
                onSubmitText: (text) => {
                    if (text != null) {
                        this.circuitView.name = text;
                    }
                    input.remove();
                }
            });
        };
        return nameLabel;
    }
    fileControls() {
        const newCircuitBtn = new HTML.ActionButton('New', {
            action: () => console.log('New circuit')
        });
        const openCircuitBtn = new HTML.ActionButton('Open', {
            action: () => this.circuitView.open()
        });
        const saveCircuitBtn = new HTML.ActionButton('Save', {
            action: () => this.circuitView.save()
        });
        const closeCircuitBtn = new HTML.ActionButton('Close', {
            action: () => this.circuitView.close()
        });
        return { newCircuitBtn, openCircuitBtn, saveCircuitBtn, closeCircuitBtn };
    }
    scaleControls() {
        const scaleTitle = new HTML.Text('scale: ' + this.circuitView.scale.y, {
            style: { width: this.menu.height * 3.5 + 'px', textAlign: 'right' }
        });
        const scaleDecBtn = new HTML.ActionButton('-', {
            action: () => this.circuitView.rescale(Vec2.sub(this.circuitView.scale, vec2(1))),
            style: { width: this.menu.parentHeight + 'px' }
        });
        const scaleIncBtn = new HTML.ActionButton('+', {
            action: () => this.circuitView.rescale(Vec2.add(this.circuitView.scale, vec2(1))),
            style: { width: this.menu.parentHeight + 'px' }
        });
        return { scaleTitle, scaleDecBtn, scaleIncBtn };
    }
}
