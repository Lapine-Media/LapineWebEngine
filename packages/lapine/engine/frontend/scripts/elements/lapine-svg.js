
import { Site } from '../frontend.js';

export class LapineSVG extends HTMLElement {
	static observedAttributes = ['use'];
	#ready = Promise.withResolvers();
	template = false;
	useTag;
	constructor() {
		super();
		this.attachShadow({mode: 'open'});
	}
	set use(value) {
		this.setAttribute('use',value);
	}
	async connectedCallback() {
		if (this.template == false) {
			this.template = true;
			const as = this.getAttribute('as');
			const use = this.getAttribute('use');
			this.template = await Site.getTemplate(as);
			this.useTag = this.template.fragment.querySelector('use');
			this.#ready.resolve();
			if (use && this.useTag) {
				this.useTag.setAttribute('href','#'+use);
			}
			this.shadowRoot.appendChild(this.template.fragment);
		}
	}
	async attributeChangedCallback(name,oldValue,newValue) {
		await this.#ready.promise;
		if (this.useTag) {
			this.useTag.setAttribute('href','#'+newValue);
		}
	}
}

window.customElements.define('lapine-svg',LapineSVG);
