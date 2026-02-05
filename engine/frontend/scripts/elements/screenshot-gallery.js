
import { Index,IO,ScreenshotItem } from '../frontend.js';

export class ScreenshotGallery extends HTMLElement {
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
		this.#template = Index.getTemplate('screenshot-gallery');
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
		this.#template.input.addEventListener('change',this,false);
		this.#template.dropzone.addEventListener('click',this,false);
		this.#template.dropzone.addEventListener('dragover',this,false);
		this.#template.dropzone.addEventListener('dragleave',this,false);
		this.#template.dropzone.addEventListener('drop',this,false);
		this.shadowRoot.appendChild(this.#template.fragment);
	}
	handleEvent(event) {
		switch (event.type) {
			case 'click':
				this.#template.input.click();
				break;
			case 'dragover':
				event.preventDefault();
				const check = item => item.kind === 'file' && item.type.startsWith('image/');
				const valid = Array.from(event.dataTransfer.items).every(check);
				this.highlight(valid);
				break;
			case 'dragleave':
				this.highlight(null);
				break;
			case 'change':
			case 'drop':
				event.preventDefault();
				this.highlight(null);
				const source = event.type == 'drop' ? event.dataTransfer: event.target;
				if (source.files.length) {
					const file = source.files[0];
					this.processFile(file);
				} else {
					this.#draggedItem.remove();
					this.#draggedItem = null;
					this.setFormValue();
				}
				this.#template.input.value = '';
		}
	}
	highlight(state) {
		this.#template.dropzone.dataset.over = state;
	}
	async addScreenshot(file) {
		const element = new ScreenshotItem(this,1920,1920,false);
		this.#template.screenshots.append(element);
		await element.upload(file);
	}
	async processFile(file) {
		switch (true) {
			case file.type.startsWith('image/') == false:
				console.log('Not an image.');
				return;
			default:
				const reader = new FileReader();
				reader.onload = async event => {
					file.src = event.target.result;
					await this.addScreenshot(file);
					this.setFormValue();
				};
				reader.readAsDataURL(file);
		}
	}
	setFormValue() {
		const elements = this.#template.screenshots.childNodes;
		const data = [];
		for (const element of elements) {
			data.push(element.value);
		}
		const json = JSON.stringify(data);
		this.#internals.setFormValue(json);
	}
	async upload(list) {
		for (const entry of list) {
			await this.addScreenshot(entry);
		}
		this.setFormValue();
	}
}

window.customElements.define('screenshot-gallery',ScreenshotGallery);
