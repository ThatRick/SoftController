import HTMLMenu from '../Lib/HTMLMenu.js';
export default function FunctionBlockMenu(options) {
    const { block, pos, parentContainer, destructor } = options;
    const items = {
        'Input count': () => { console.log('Input count clicked'); },
        'Insertion point': () => { console.log('Insertion point clicked'); },
        'Copy': () => { console.log('Copy clicked'); },
        'Replace': () => { console.log('Replace clicked'); },
        'Delete': () => { block.delete(); },
    };
    const menu = new HTMLMenu(Object.keys(items), {
        parent: parentContainer,
        menuStyle: {
            left: pos.x + 'px',
            top: pos.y + 'px',
            fontSize: '14px',
        },
        onItemSelected: (index, name) => {
            items[name]?.();
            destructor();
        }
    });
    return menu;
}
