
import { Index,IO,Tools } from '../frontend.js';

export class R2Bucket extends HTMLElement {
	data;
	#signal = 'r2-bucket';
	constructor(data) {
		super();
		this.data = data;
		this.attachShadow({mode: 'open'});
	}
	setBound() {
		this.template.container.dataset.bound = true;
	}
	connectedCallback() {
		this.template = Index.getTemplate('r2-bucket');
		this.template.name.textContent = this.data.name;
		this.template.creation_date.textContent = Tools.formatTimestamp(this.data.creation_date);

		if (this.data.binding) {
			this.template.container.dataset.bound = true;
		} else {
			const method = event => IO.signal('bindings','add','options',this);
			this.template.bind.addEventListener('click',method,false);
		}

		this.shadowRoot.appendChild(this.template.fragment);
	}
}

window.customElements.define('r2-bucket',R2Bucket);
