/*global document, HTMLElement*/

import { Site, Kits, Navigation } from 'frontend';

export default class HorizontalMenu extends HTMLElement {
	static selected = {};
	constructor() {
		super();
		const options = {mode: 'open'}
		this.attachShadow(options);
	}
	async connectedCallback() {
console.log('HorizontalMenu connectedCallback',Site.ready);
		await Site.ready;
console.log('HorizontalMenu Site.ready');
		window.addEventListener('popstate',this,false);

		this.template = Kits.menus.getTemplate('horizontal-menu');
		this.elements = {};

		const main_uni = this.getAttribute('uni');
		const main_node = Navigation.getNode(main_uni);

		for (const uni of main_node.children) {
			const node = Navigation.getNode(uni);
			const element = Navigation.getElement(node);
			this.elements[uni] = element;
			if (node.type == 'page') {
				element.addEventListener('click',this,false);
				if (node.uni == Navigation.node.uni) {
					element.dataset.active = true;
					HorizontalMenu.selected = element;
				}
			}
			this.appendChild(element);
		}

		this.shadowRoot.appendChild(this.template.fragment);

	}
	handleEvent(event) {
		switch (event.type) {
			case 'click':
				event.preventDefault();

				if (HorizontalMenu.selected.dataset) {
					HorizontalMenu.selected.dataset.active = false;
				}

				const element = this.elements[event.target.dataset.uni];

				if (element) {
					element.dataset.active = true;
				}

				HorizontalMenu.selected = element;
				break;
			case 'popstate':
				console.log('Navigation.node',Navigation.node);
				break;
		}
	}
}
