import * as HTML from '../Lib/HTML.js';
export default function FunctionBlockContextMenu(options) {
    const { ioPinView, pos, parentContainer, destructor } = options;
    const items = {
        'Invert': (ioPinView.io.sourceIO && ioPinView.io.datatype == 'BINARY') ? () => { ioPinView.io.setInversion(!ioPinView.io.inverted); } : null,
        'Disconnect': (ioPinView.io.sourceIO) ? () => { ioPinView.io.setSource(null); } : null
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
