
import Site from './site.js';

export class LapineView extends HTMLElement {
	data = {};
	templates = {};
	constructor() {
		super();
		const options = {
			mode: 'closed'
		};
		this.shadow = this.attachShadow(options);
	}
	update(fragment) {
		while (this.shadow.firstChild) {
			this.shadow.removeChild(this.shadow.firstChild);
		}
		this.shadow.appendChild(fragment);
    }
	connectedCallback() {

	}
	handleEvent(event) {

	}
	disconnectedCallback() {
		
	}
}
