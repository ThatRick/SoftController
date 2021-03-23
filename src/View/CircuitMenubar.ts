import { GUIEvent, GUIEventType } from '../GUI/GUIView.js'
import * as HTML from '../Lib/HTML.js'
import Vec2, { vec2 } from '../Lib/Vector2.js'

import Circuit from '../State/Circuit.js'
import CircuitView, { CircuitViewEvent, CircuitViewEventType } from './CircuitView.js'

export class CircuitMenuBar
{
    menu: HTML.Menubar
    circuitView: CircuitView

    constructor(parent: HTMLElement)
    {
        this.menu = new HTML.Menubar(parent, {
            overflow: 'visible'
        })
    }

    handleGuiEvent = (ev: GUIEvent) => {
        switch(ev.type)
        {
            case GUIEventType.Rescaled:
                this.menuItems.scaleTitle.setText('scale: '+this.circuitView.scale.y)
                break
            case GUIEventType.Resized:
                break
        }
    }
    handleCircuitViewEvent = (ev: CircuitViewEvent) => {
        console.log('circuit menu bar received circuit view event')
        switch(ev.type)
        {
            case CircuitViewEventType.CircuitLoaded:
                break
            case CircuitViewEventType.CircuitClosed:
                break
            case CircuitViewEventType.NameChanged:
                this.menuItems.name.setText(this.circuitView.name)
                break
        }
    }

    menuItems: {
        name: HTML.Text
        gap1: HTML.Space
        newCircuitBtn: HTML.ActionButton
        openCircuitBtn: HTML.DropdownMenu
        saveCircuitBtn: HTML.ActionButton
        gap2: HTML.Space
        importBtn: HTML.ActionButton
        exportBtn: HTML.ActionButton
        gap3: HTML.Space
        scaleTitle: HTML.Text
        scaleDecBtn: HTML.Button
        scaleIncBtn: HTML.Button
        gap4: HTML.Space
        gridMapToggle: HTML.Button
        step: HTML.Button
    }

    attachCircuitView(circuitView: CircuitView) {
        this.circuitView = circuitView
        circuitView.events.subscribe(this.handleGuiEvent)
        circuitView.circuitViewEvents.subscribe(this.handleCircuitViewEvent)
        const menu = this.menu
        
        this.menuItems = {
            name: this.circuitName(),
            gap1: new HTML.Space(14),
            ...this.fileControls(),
            gap2: new HTML.Space(14),
            ...this.importExport(),
            gap3: new HTML.Space(14),
            ...this.scaleControls(),
            gap4: new HTML.Space(14),
            gridMapToggle: this.toggleGridMap(),
            step: this.stepController()
        }

        menu.addItems(Object.values(this.menuItems))
    }

    stepController() {
        return new HTML.ActionButton('Step', {
            action: () => this.circuitView.circuitBlock.update(100)
        })
    }

    toggleGridMap() {
        return new HTML.ToggleButton('Grid map', state => {
            this.circuitView.grid.visible = state
            return state
        }, this.circuitView.grid.visible )
    }

    circuitName() {
        const nameLabel = new HTML.Text(this.circuitView.name, {
            style: { fontWeight: 'bold' }
        })
        nameLabel.DOMElement.ondblclick = () => {
            const input = new HTML.InputField({
                name: 'Circuit Name',
                value: this.circuitView.name,
                pos: vec2(0, 0),
                parent: nameLabel.DOMElement,
                onSubmitText: (text: string) => {
                    if (text != null) {
                        this.circuitView.name = text
                    }
                    input.remove()
                }
            })
        }
        return nameLabel
    }

    runTimeControls() {
        
    }

    getLocalStorageEntries() {
        return Object.entries(window.localStorage).reduce((obj, [key, value]) => {
            obj[key] = value
            return obj
        }, {})
    }

    fileControls() {
        const newCircuitBtn = new HTML.ActionButton('New', {
            action: () => this.circuitView.newCircuit()
        })
        const openCircuitBtn = new HTML.DropdownMenu('Open', {
            getItems: () => this.getLocalStorageEntries(),
            onItemSelected: (index: number, name: string) => {
                this.circuitView.open(name)
            }
        })
        const saveCircuitBtn = new HTML.ActionButton('Save', {
            action: () => this.circuitView.save()
        })

        return { newCircuitBtn, openCircuitBtn, saveCircuitBtn }
    }

    importExport() {
        const importBtn = new HTML.ActionButton('Import', {
            action: () => console.log('Import pressed')
        })
        const exportBtn = new HTML.ActionButton('Export', {
            action: () => this.circuitView.export()
        })

        return { importBtn, exportBtn }
    }

    scaleControls() {
        const scaleTitle = new HTML.Text('scale: '+this.circuitView.scale.y, {
            style: { width: this.menu.height * 3.5 + 'px', textAlign: 'right' }
        })
        const scaleDecBtn = new HTML.ActionButton('-', {
            action: () => this.circuitView.rescale(Vec2.sub(this.circuitView.scale, vec2(1))),
            style: { width: this.menu.parentHeight+'px'}
        })
        const scaleIncBtn = new HTML.ActionButton('+', {
            action: () => this.circuitView.rescale(Vec2.add(this.circuitView.scale, vec2(1))),
            style: { width: this.menu.parentHeight+'px'}
        })

        return { scaleTitle, scaleDecBtn, scaleIncBtn }
    }
}