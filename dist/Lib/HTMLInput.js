import { domElement, Element } from './HTML.js';
export default class HTMLValue extends Element {
    constructor(options) {
        super();
        const { name, value, pos, onSubmitValue, onSubmitText, parent } = options;
        if (!onSubmitValue && !onSubmitText)
            console.error('No submit callback given!');
        const inputField = domElement(null, 'input', {
            width: '64px',
            backgroundColor: 'black',
            color: 'white',
            //outlineColor: 'red', //this.style.colors.light,
            userSelect: 'text',
            pointerEvents: 'auto',
            ...options.inputStyle
        });
        inputField.type = 'text';
        inputField.value = value?.toString() ?? '';
        const clearEvents = () => {
            inputField.onblur = undefined;
            inputField.onkeydown = undefined;
        };
        const cancel = () => {
            clearEvents();
            onSubmitValue?.(null);
            onSubmitText?.(null);
        };
        inputField.onblur = () => cancel();
        inputField.onpointerdown = ev => ev.stopPropagation();
        inputField.onpointermove = ev => ev.stopPropagation();
        inputField.onpointerup = ev => ev.stopPropagation();
        inputField.onkeydown = ev => {
            if (ev.key == 'Enter') {
                let rawInput = inputField.value;
                if (onSubmitValue) {
                    rawInput = rawInput.replace(',', '.');
                    let value = Number(rawInput);
                    console.log('user input value', rawInput, value);
                    if (!Number.isNaN(value)) {
                        clearEvents();
                        onSubmitValue(value);
                    }
                    else {
                        inputField.select();
                    }
                }
                if (onSubmitText) {
                    clearEvents();
                    onSubmitText(rawInput);
                }
            }
            else if (ev.key == 'Escape') {
                cancel();
            }
        };
        this.DOMElement = domElement(parent, 'div', {
            color: this.style.colors.text,
            backgroundColor: this.style.colors.base,
            outline: 'thin solid' + this.style.colors.light,
            fontSize: this.style.fontSize + 'px',
            padding: '4px',
            zIndex: '2',
            boxShadow: this.style.boxShadow,
            ...options.containerStyle
        });
        if (name) {
            const title = domElement(this.DOMElement, 'div', options.nameStyle);
            title.textContent = name;
            this.DOMElement.appendChild(inputField);
        }
        this.DOMElement.appendChild(inputField);
        if (pos) {
            this.setCSS({
                position: 'absolute',
                left: pos.x + 'px',
                top: pos.y + 'px',
            });
        }
        inputField.select();
    }
}
