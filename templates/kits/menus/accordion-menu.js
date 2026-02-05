/*global document,HTMLElement*/

import { Site, Kits, Navigation } from 'frontend';

export default class AccordionMenu extends HTMLElement {
	static selected = {};
	constructor() {

		super();

		const options = {mode: 'open'}

		this.attachShadow(options);

	}
	connectedCallback() {

		this.name = this.getAttribute('name');
		this.template = Kits.getTemplate(this,'accordion-menu');

		const tag = this.getAttribute('tag');
		const element = document.createElement(tag);

		element.part = 'title';
		element.textContent = this.getAttribute('title');
		element.addEventListener('click',this,false);

		this.template.container.before(element);

		this.shadowRoot.appendChild(this.template.fragment);

		if (this.name) {
			AccordionMenu.selected[this.name] ??= document.createElement('div');
		}

	}
	handleEvent(event) {

		const active = this.dataset.active == 'true' ? false : true;

		this.dataset.active = active;

		if (this.name && AccordionMenu.selected[this.name] != this) {
			AccordionMenu.selected[this.name].dataset.active = false;
			AccordionMenu.selected[this.name] = this;
		}

	}
}
