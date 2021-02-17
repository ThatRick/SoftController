import { GUIEvent, GUIEventType } from '../GUI/GUIView.js'
import * as HTML from '../lib/HTML.js'
import { DropdownMenu } from '../Lib/HTMLDropdownMenu.js'
import { Menubar } from '../Lib/HTMLMenubar.js'
import Vec2, { vec2 } from '../Lib/Vector2.js'

import Circuit from '../State/Circuit.js'
import CircuitView, { CircuitViewEvent, CircuitViewEventType } from './CircuitView.js'

export class CircuitMenuBar
{
    menu: Menubar
    view: CircuitView

    constructor(parent: HTMLElement)
    {
        this.menu = new Menubar(parent, {
            overflow: 'visible'
        })
    }

    handleGuiEvent(ev: GUIEvent) {
        switch(ev.type)
        {
            case GUIEventType.Rescaled:
                console.log('Event: rescaled!')
                break
            case GUIEventType.Resized:
                console.log('Event: resized!')
                break
        }
    }
    handleCircuitViewEvent(ev: CircuitViewEvent) {
        switch(ev.type)
        {
            case CircuitViewEventType.CircuitLoaded:
                console.log('Event: rescaled!')
                break
            case CircuitViewEventType.CircuitClosed:
                console.log('Event: resized!')
                break
        }
    }

    attachCircuitView(view: CircuitView) {
        this.view = view
        view.guiEvents.subscribe(this.handleGuiEvent.bind(this))
        view.events.subscribe(this.handleCircuitViewEvent.bind(this))
        const menu = this.menu
        console.log('Building circuit menu bar...')
        menu.addItems([
            ...this.scaleControls()
        ])
    }

    scaleControls() {
        const title = new HTML.Text('Scale: '+this.view.scale.y, {
            style: { width: this.menu.height * 3.5 + 'px' }
        })
        this.view.guiEvents.subscribe(() =>
            title.setText('Scale: '+this.view.scale.y),
            [GUIEventType.Rescaled]
        )
        const decBtn = new HTML.ActionButton('-', {
            action: () => this.view.rescale(Vec2.sub(this.view.scale, vec2(1))),
            style: { width: this.menu.parentHeight+'px'}
        })
        const incBtn = new HTML.ActionButton('+', {
            action: () => this.view.rescale(Vec2.add(this.view.scale, vec2(1))),
            style: { width: this.menu.parentHeight+'px'}
        })
        return [title, decBtn, incBtn]
    }

}