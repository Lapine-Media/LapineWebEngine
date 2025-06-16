
import { Index,IO } from '../frontend.js';

export class ScriptItem extends HTMLElement {
	#data;
	constructor(context,name,value,data) {
		super();
		this.#data = {context,name,value,data};
		this.attachShadow({mode: 'open'});
	}
	connectedCallback() {

		const template = Index.getTemplate('script-item');

		template.label.textContent = this.#data.value;
		template.input.value = this.#data.data;
		template.button.name = this.#data.name;
		template.button.value = this.#data.value;
		template.button.onclick = () => IO.signal(this.#data.context,this.#data.name,template.input.value,this);

		this.shadowRoot.appendChild(template.fragment);

	}
}

window.customElements.define('script-item',ScriptItem);
