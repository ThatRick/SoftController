import HTMLMenu from '../Lib/HTMLMenu.js';
import HTMLInput from '../Lib/HTMLInput.js';
import { defaultStyle } from '../Lib/HTML.js';
export default function FunctionBlockContextMenu(pars) {
    const { selection, pos, parentContainer, destructor } = pars;
    const singleSelection = selection.singleBlock;
    const items = {
        'Input count': (singleSelection?.block.variableInputs) ? () => {
            const input = new HTMLInput({
                name: 'Input count',
                value: singleSelection.block.inputs.length,
                pos,
                parent: parentContainer,
                onSubmitValue: (value) => {
                    if (value != null) {
                        value = Math.trunc(value);
                        singleSelection.block.setVariableInputCount(value);
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
        'Delete': () => {
            pars.selection.blocks?.forEach(blockView => blockView.block.remove());
            pars.selection.unselectAll();
        },
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
