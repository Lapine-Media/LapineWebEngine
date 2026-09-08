
import IO from './io.js';

export class LapineMessage extends HTMLElement {
	constructor(signal) {

		super();

		this.type = signal.type;
		this.title = signal.title;
		this.text = signal.text;
		this.buttons = signal.buttons;
		this.timeout = signal.timeout;

		this.attachShadow({mode: 'open'});

	}
	connectedCallback() {

		const element = document.getElementById('lapine-message');
		const fragment = element.content.cloneNode(true);
		const template = {fragment: fragment};

		fragment.querySelectorAll('*[id]').forEach(element => template[element.id] = element);

		template.container.classList.add(this.type);
		template.title.textContent = this.title;
		template.text.textContent = this.text;

		for (const button of this.buttons) {
			const element = document.createElement('button');
			const method = event => {
				event.preventDefault();
				if (button.signal) {
					IO.send(button.signal.name,button.signal.detail);
				}
				this.remove();
			};

			element.textContent = button.label;
			element.addEventListener('click',method,false);

			template.buttons.appendChild(element);
		}

		this.shadowRoot.appendChild(template.fragment);

	}
}
