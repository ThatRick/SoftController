import HTMLMenu from '../Lib/HTMLMenu.js';
import HTMLInput from '../Lib/HTMLInput.js';
import { defaultStyle } from '../Lib/HTML.js';
export default function FunctionBlockContextMenu(options) {
    const { blockView, pos, parentContainer, destructor } = options;
    const items = {
        'Input count': (blockView.block.variableInputs) ? () => {
            const input = new HTMLInput({
                name: 'Input count',
                value: blockView.block.inputs.length,
                pos,
                parent: parentContainer,
                onSubmitValue: (value) => {
                    if (value != null) {
                        value = Math.trunc(value);
                        blockView.block.setVariableInputCount(value);
                    }
                    else
                        console.log('Input canceled');
                    input.remove();
                }
            });
        } : null,
        'Insertion point': null,
        'Copy': null,
        'Replace': null,
        'Delete': () => { blockView.delete(); },
    };
    const menu = new HTMLMenu(items, {
        parent: parentContainer,
        menuStyle: {
            left: pos.x + 'px',
            top: pos.y + 'px',
            fontSize: defaultStyle.fontSize + 'px',
        },
        onItemSelected: (index, name) => {
            items[name]?.();
            destructor();
        }
    });
    return menu;
}
