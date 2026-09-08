
import Kits from './kits.js';

export class LapineKit extends HTMLElement {
	async connectedCallback() {
		const [kit,type] = this.getAttribute('as').split('/');
		const element = document.createElement(type);
		await Kits.install(kit);
		this.removeAttribute('as');
		for (const attribute of this.attributes) {
			element.setAttribute(attribute.name,attribute.value);
		}
		element.innerHTML = this.innerHTML;
		this.replaceWith(element);
	}
}
