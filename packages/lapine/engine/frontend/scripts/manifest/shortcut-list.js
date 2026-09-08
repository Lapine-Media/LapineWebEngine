
import { Site,IO,ShortcutItem } from '../frontend.js';

export class ShortcutList extends HTMLElement {
	#ready = Promise.withResolvers();
	#template = false;
	#internals;
	#draggedItem;
	constructor() {
		super();
		const options = {
			mode: 'open',
			delegatesFocus: true
		}
		this.#internals = this.attachInternals();
		this.attachShadow(options);
	}
	static get formAssociated() {
		return true;
	}
	set draggedItem(value) {
		this.#draggedItem = value;
	}
	get draggedItem() {
		return this.#draggedItem;
	}
	async connectedCallback() {
		if (this.#template == false) {
			this.#template = true;
			this.#template = await Site.getTemplate('shortcut-list');
			this.#ready.resolve();
			this.#template.add.addEventListener('click',this,false);
			this.shadowRoot.appendChild(this.#template.fragment);
			this.addEventListener('change',this,false);
		}
	}
	handleEvent(event) {
		switch (event.type) {
			case 'click':
				this.addShortcut();
				break;
			case 'change':
				this.setFormValue();
		}
	}
	async addShortcut(entry) {
		await this.#ready.promise;
		const element = new ShortcutItem(this,192,192,true);
		this.#template.shortcuts.append(element);
		await element.upload(entry);
	}
	async setFormValue() {
		await this.#ready.promise;
		const elements = this.#template.shortcuts.childNodes;
		const data = [];
		for (const element of elements) {
			data.push(element.value);
		}
		const json = JSON.stringify(data);
		this.#internals.setFormValue(json);
	}
	async upload(list) {
		for (const entry of list) {
			await this.addShortcut(entry);
		}
	}
}

window.customElements.define('shortcut-list',ShortcutList);
