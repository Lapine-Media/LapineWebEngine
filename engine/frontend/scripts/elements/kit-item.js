
import { Index,IO } from '../frontend.js';

export class KitItem extends HTMLElement {
	#data;
	constructor(context,name,value,data) {
		super();
		this.#data = {context,name,value,data};
		this.attachShadow({mode: 'open'});
	}
	connectedCallback() {

		const template = Index.getTemplate('kit-item');

		template.name.textContent = this.#data.data;
		template.button.name = this.#data.name;
		template.button.value = this.#data.value;
		template.button.onclick = () => IO.signal(this.#data.context,this.#data.name,this.#data.value,this);

		this.shadowRoot.appendChild(template.fragment);

	}
}

window.customElements.define('kit-item',KitItem);
