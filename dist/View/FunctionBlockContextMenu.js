import * as HTML from '../Lib/HTML.js';
export default function FunctionBlockContextMenu(pars) {
    const { selection, pos, parentContainer, destructor } = pars;
    const singleSelection = selection.singleBlock;
    const items = {
        'Call index': () => {
            const input = new HTML.InputField({
                name: 'Call index',
                value: singleSelection.block.callIndex,
                pos,
                parent: parentContainer,
                onSubmitValue: (value) => {
                    if (value != null) {
                        value = Math.trunc(value);
                        singleSelection.block.setCallIndex(value);
                    }
                    input.remove();
                }
            });
        },
        'Input count': (singleSelection?.block.variableInputs) ? () => {
            const input = new HTML.InputField({
                name: 'Input count',
                value: singleSelection.block.inputs.length,
                pos,
                parent: parentContainer,
                onSubmitValue: (value) => {
                    if (value != null) {
                        value = Math.trunc(value);
                        singleSelection.block.setVariableInputCount(value);
                    }
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
    const menu = new HTML.Menu(items, {
        parent: parentContainer,
        menuStyle: {
            left: pos.x + 'px',
            top: pos.y + 'px',
            fontSize: HTML.defaultStyle.fontSize + 'px',
        },
        onItemSelected: (index, name) => {
            items[name]?.();
            destructor();
        }
    });
    return menu;
}
