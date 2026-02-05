
import { Index,IO,ShortcutItem } from '../frontend.js';

export class ShortcutList extends HTMLElement {
	#template;
	#internals;
	#draggedItem;
	constructor() {
		super();
		const options = {
			mode: 'open',
			delegatesFocus: true
		}
		this.#internals = this.attachInternals();
		this.#template = Index.getTemplate('shortcut-list');
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
	connectedCallback() {
		this.#template.add.addEventListener('click',this,false);
		this.shadowRoot.appendChild(this.#template.fragment);
		this.addEventListener('change',this,false);
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
		const element = new ShortcutItem(this,192,192,true);
		this.#template.shortcuts.append(element);
		await element.upload(entry);
	}
	setFormValue() {
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
