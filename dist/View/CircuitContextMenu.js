import * as HTML from '../Lib/HTML.js';
import Vec2, { vec2 } from '../Lib/Vector2.js';
import { functionLib } from '../State/FunctionLib.js';
export default function CircuitContextMenu(options) {
    const { circuitView, pos, parentContainer, destructor } = options;
    const items = {
        'Add block': () => {
            const submenu = new HTML.Menu(functionLib, {
                parent: parentContainer,
                menuStyle: {
                    left: pos.x + 'px',
                    top: pos.y + 'px',
                    fontSize: HTML.defaultStyle.fontSize + 'px',
                },
                onItemSelected: (index, name) => {
                    console.log('function menu selection:', name);
                    circuitView.addFunctionBlock(name, Vec2.div(pos, circuitView.scale));
                    destructor();
                }
            });
            return submenu;
        },
        'Width': () => {
            const input = new HTML.InputField({
                name: 'Circuit Width',
                value: circuitView.size.x,
                pos,
                parent: parentContainer,
                onSubmitValue: (value) => {
                    if (value != null) {
                        value = Math.trunc(value);
                        circuitView.resize(vec2(value, circuitView.size.y));
                    }
                    else
                        console.log('Input canceled');
                    input.remove();
                }
            });
        },
        'Height': () => {
            const input = new HTML.InputField({
                name: 'Circuit Height',
                value: circuitView.size.y,
                pos,
                parent: parentContainer,
                onSubmitValue: (value) => {
                    if (value != null) {
                        value = Math.trunc(value);
                        circuitView.resize(vec2(circuitView.size.x, value));
                    }
                    else
                        console.log('Input canceled');
                    input.remove();
                }
            });
        },
    };
    const menu = new HTML.Menu(items, {
        parent: parentContainer,
        menuStyle: {
            left: pos.x + 'px',
            top: pos.y + 'px',
            fontSize: HTML.defaultStyle.fontSize + 'px',
        },
        onItemSelected: (index, itemName) => {
            if (itemName == 'Add block') {
                const submenu = items[itemName]();
                menu.attachSubmenu(submenu);
            }
            else {
                items[itemName]();
                destructor();
            }
        }
    });
    return menu;
}
