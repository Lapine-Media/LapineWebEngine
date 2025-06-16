
import { Index,IO } from '../frontend.js';

export class EnvironmentItem extends HTMLElement {
	name;
	template;
	constructor(name) {
		super();
		this.name = name;
		this.attachShadow({mode: 'open'});
	}
	connectedCallback() {

		this.template = Index.getTemplate('environment-item');
		this.template.name.textContent = this.name;
		this.shadowRoot.appendChild(this.template.fragment);

	}
}

window.customElements.define('environment-item',EnvironmentItem);
