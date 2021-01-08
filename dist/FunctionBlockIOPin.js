import GUIElement from './GUI/GUIElement.js';
export default class FunctionBlockIOPin extends GUIElement {
    constructor(parent, io, pos, size) {
        super(parent, 'div', pos, size, {
            backgroundColor: '#AAA'
        });
        this.io = io;
    }
}
