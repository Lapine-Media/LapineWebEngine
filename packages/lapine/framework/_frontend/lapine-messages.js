
import LapineMessage from './lapine-message.js';

export class LapineMessages extends HTMLElement {
	constructor() {

		super();

		this.attachShadow({mode: 'open'});

	}
	connectedCallback() {

		window.addEventListener('message',this,false);

		const element = document.getElementById('lapine-messages');
		const fragment = element.content.cloneNode(true);

		this.shadowRoot.appendChild(fragment);

	}
	handleEvent(event) {

		const message = new LapineMessage(event.detail);

		this.appendChild(message);

	}
	disconnectedCallback() {

		window.removeEventListener('message',this,false);

	}
}
