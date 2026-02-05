/*global document,HTMLElement*/

import { Kits } from '../scripts/frontend.js';

export default class IconButton extends HTMLElement {
	constructor() {
		super();
		const options = {mode: 'open'}
		this.attachShadow(options);
	}
	connectedCallback() {

		console.log(document.baseURI);
		this.template = Kits.getTemplate(this,'icon-button');

		this.shadowRoot.appendChild(this.template.fragment);

	}
	handleEvent(event) {

	}
}
