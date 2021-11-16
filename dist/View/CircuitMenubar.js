import * as HTML from '../Lib/HTML.js';
import Vec2, { vec2 } from '../Lib/Vector2.js';
export class CircuitMenuBar {
    menu;
    circuitView;
    constructor(parent) {
        this.menu = new HTML.Menubar(parent, {
            overflow: 'visible'
        });
    }
    handleGuiEvent = (ev) => {
        switch (ev.type) {
            case 1 /* Rescaled */:
                this.menuItems.scaleTitle.setText('scale: ' + this.circuitView.scale.y);
                break;
            case 0 /* Resized */:
                break;
        }
    };
    handleCircuitViewEvent = (ev) => {
        console.log('circuit menu bar received circuit view event');
        switch (ev.type) {
            case 0 /* CircuitLoaded */:
                break;
            case 1 /* CircuitClosed */:
                break;
            case 3 /* NameChanged */:
                this.menuItems.name.setText(this.circuitView.name);
                break;
            case 2 /* RuntimeStateChanged */:
                this.menuItems.runtimeStatusText.setText(this.circuitView.ticker.isRunning ? 'Running' : 'Stopped');
                break;
        }
    };
    menuItems;
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
            ...this.importExport(),
            gap3: new HTML.Space(14),
            ...this.scaleControls(),
            gap4: new HTML.Space(14),
            ...this.runTimeControls()
        };
        menu.addItems(Object.values(this.menuItems));
    }
    stepController() {
        return;
    }
    toggleGridMap() {
        return new HTML.ToggleButton('Grid map', state => {
            this.circuitView.grid.visible = state;
            return state;
        }, this.circuitView.grid.visible);
    }
    circuitName() {
        const nameLabel = new HTML.Text(this.circuitView.name, {
            style: { fontWeight: 'bold' }
        });
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
    runTimeControls() {
        const runtimeStatusText = new HTML.Text(this.circuitView.ticker?.isRunning ? 'Running' : 'Stopped');
        const runtimeStartBtn = new HTML.ActionButton('Start', { action: () => this.circuitView.startRuntime() });
        const runtimeStopBtn = new HTML.ActionButton('Stop', { action: () => this.circuitView.stopRuntime() });
        const runtimeStepBtn = new HTML.ActionButton('Step', { action: () => this.circuitView.circuitBlock.update(100) });
        return { runtimeStatusText, runtimeStartBtn, runtimeStopBtn, runtimeStepBtn };
    }
    getLocalStorageEntries() {
        return Object.entries(window.localStorage).reduce((obj, [key, value]) => {
            obj[key] = value;
            return obj;
        }, {});
    }
    fileControls() {
        const newCircuitBtn = new HTML.ActionButton('New', {
            action: () => this.circuitView.newCircuit()
        });
        const openCircuitDropMenu = new HTML.DropdownMenu('Open', {
            getItems: () => this.getLocalStorageEntries(),
            onItemSelected: (index, name) => {
                console.log('open file', name);
                openCircuitDropMenu.setMenuVisibility('hidden');
                this.circuitView.open(name);
            }
        });
        const saveCircuitBtn = new HTML.ActionButton('Save', {
            action: () => this.circuitView.save()
        });
        return { newCircuitBtn, openCircuitBtn: openCircuitDropMenu, saveCircuitBtn };
    }
    importExport() {
        const importBtn = new HTML.ActionButton('Import', {
            action: () => console.log('Import pressed')
        });
        const exportBtn = new HTML.ActionButton('Export', {
            action: () => this.circuitView.export()
        });
        return { importBtn, exportBtn };
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
