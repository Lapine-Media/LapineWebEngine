
import { Index,IO,Tools } from '../frontend.js';

export class D1Migration extends HTMLElement {
	#name;
	#template;
	constructor(name) {
		super();
		this.#name = name;
		this.attachShadow({mode: 'open'});
	}
	handleEvent(event) {
		event.preventDefault();
		const object = {
			type: 'migration',
			name: this.#name,
			element: this
		};
		IO.signal('d1','ui','select',object);
	}
	connectedCallback() {

		this.#template = Index.getTemplate('d1-migration');
		
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
