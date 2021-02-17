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
                console.log('Event: rescaled!');
                break;
            case 0 /* Resized */:
                console.log('Event: resized!');
                break;
        }
    }
    handleCircuitViewEvent(ev) {
        switch (ev.type) {
            case 0 /* CircuitLoaded */:
                console.log('Event: rescaled!');
                break;
            case 1 /* CircuitClosed */:
                console.log('Event: resized!');
                break;
        }
    }
    attachCircuitView(view) {
        this.view = view;
        view.guiEvents.subscribe(this.handleGuiEvent.bind(this));
        view.events.subscribe(this.handleCircuitViewEvent.bind(this));
        const menu = this.menu;
        console.log('Building circuit menu bar...');
        menu.addItems([
            ...this.scaleControls()
        ]);
    }
    scaleControls() {
        const title = new HTML.Text('Scale');
        this.view.guiEvents.subscribe(() => title.setText('Scale ' + this.view.scale.toString()), [1 /* Rescaled */]);
        const decBtn = new HTML.ActionButton({
            name: '-',
            action: () => this.view.rescale(Vec2.sub(this.view.scale, vec2(1))),
            style: { width: this.menu.parentHeight + 'px' }
        });
        const incBtn = new HTML.ActionButton({
            name: '+',
            action: () => this.view.rescale(Vec2.add(this.view.scale, vec2(1))),
            style: { width: this.menu.parentHeight + 'px' }
        });
        return [title, decBtn, incBtn];
    }
}
