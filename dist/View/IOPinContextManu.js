import HTMLMenu from '../Lib/HTMLMenu.js';
import { defaultStyle } from '../Lib/HTML.js';
export default function FunctionBlockContextMenu(options) {
    const { ioPinView, pos, parentContainer, destructor } = options;
    const items = {
        'Invert': (ioPinView.io.sourcePin) ? () => { console.log('Replace clicked'); } : null,
        'Disconnect': (ioPinView.io.sourcePin) ? () => { ioPinView.delete(); } : null
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
