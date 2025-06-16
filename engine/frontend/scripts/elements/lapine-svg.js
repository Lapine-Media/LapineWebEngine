
import { Index } from '../frontend.js';

export class LapineSVG extends HTMLElement {
	constructor() {
		super();
		this.attachShadow({mode: 'open'});
	}
	connectedCallback() {
		const as = this.getAttribute('as');
		const template = Index.getTemplate(as);
		this.shadowRoot.appendChild(template.fragment);
	}
}

window.customElements.define('lapine-svg',LapineSVG);
