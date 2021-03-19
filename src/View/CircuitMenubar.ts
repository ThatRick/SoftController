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

    handleGuiEvent = (ev: GUIEvent) => {
        switch(ev.type)
        {
            case GUIEventType.Rescaled:
                this.menuItems.scaleTitle.setText('scale: '+this.view.scale.y)
                break
            case GUIEventType.Resized:
                break
        }
    }
    handleCircuitViewEvent = (ev: CircuitViewEvent) => {
        switch(ev.type)
        {
            case CircuitViewEventType.CircuitLoaded:
                break
            case CircuitViewEventType.CircuitClosed:
                break
            case CircuitViewEventType.NameChanged:
                this.menuItems.name.setText(this.view.name)
                break
        }
    }

    menuItems: {
        name: HTML.Text
        gap1: HTML.Space
        scaleTitle: HTML.Text
        scaleDecBtn: HTML.Button
        scaleIncBtn: HTML.Button
        gap2: HTML.Space
        gridMapToggle: HTML.Button
        step: HTML.Button
    }

    attachCircuitView(view: CircuitView) {
        this.view = view
        view.events.subscribe(this.handleGuiEvent)
        view.circuitViewEvents.subscribe(this.handleCircuitViewEvent)
        const menu = this.menu
        
        this.menuItems = {
            name: new HTML.Text(view.name),
            gap1: new HTML.Space(14),
            ...this.scaleControls(),
            gap2: new HTML.Space(14),
            gridMapToggle: this.toggleGridMap(),
            step: this.stepController()
        }

        menu.addItems(Object.values(this.menuItems))
    }

    stepController() {
        return new HTML.ActionButton('Step', {
            action: () => this.view.circuitBlock.update(100)
        })
    }

    toggleGridMap() {
        return new HTML.ToggleButton('Grid map', state => {
            this.view.grid.visible = state
            return state
        }, this.view.grid.visible )
    }

    scaleControls() {
        const scaleTitle = new HTML.Text('scale: '+this.view.scale.y, {
            style: { width: this.menu.height * 3.5 + 'px' }
        })
        const scaleDecBtn = new HTML.ActionButton('-', {
            action: () => this.view.rescale(Vec2.sub(this.view.scale, vec2(1))),
            style: { width: this.menu.parentHeight+'px'}
        })
        const scaleIncBtn = new HTML.ActionButton('+', {
            action: () => this.view.rescale(Vec2.add(this.view.scale, vec2(1))),
            style: { width: this.menu.parentHeight+'px'}
        })

        return { scaleTitle, scaleDecBtn, scaleIncBtn }
    }

}