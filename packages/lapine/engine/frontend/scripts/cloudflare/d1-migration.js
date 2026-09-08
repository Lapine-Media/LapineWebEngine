
import { Index,IO,Tools } from '../frontend.js';

export class D1Migration extends HTMLElement {
	#name;
	#template;
	constructor(name) {
		super();
		this.#name = name;
		this.#template = Index.getTemplate('d1-migration');
		this.attachShadow({mode: 'open'});
	}
	handleEvent(event) {
		event.preventDefault();
		const object = {
			type: 'migration',
			name: this.#name,
			element: this
		};
		IO.sendSignal(true,'d1_editor','ui','select',object);
	}
	connectedCallback() {

		this.#template.name.textContent = this.#name;

		this.addEventListener('click',this,false);

		this.shadowRoot.appendChild(this.#template.fragment);

	}
	markApplied(location) {
		this.#template.container.classList.add(location);
	}
	disconnectedCallback() {
		this.removeEventListener('click',this,false);
	}
}

window.customElements.define('d1-migration',D1Migration);
