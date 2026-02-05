
import { Index,IO,Output } from '../frontend.js';

export class ScreenshotItem extends HTMLElement {
	#template;
	#abortController = null;
	#value = {};
	#parent;
	constructor(parent,width,height,fill) {
		super();
		const options = {
			mode: 'open',
			delegatesFocus: false
		}
		this.#parent = parent;
		this.#template = Index.getTemplate('screenshot-item');
		this.setAttribute('width',width);
		this.setAttribute('height',height);
		this.setAttribute('fill',fill);
		this.attachShadow(options);
	}
	static get observedAttributes() {
		return ['width','height','fill'];
	}
	set value(value) {
		this.#value = value;
	}
	get value() {
		return this.#value;
	}
	set width(value) {
		this.setObservedAttribute('width',value);
	}
	get width() {
		return this.getAttribute('width');
	}
	set height(value) {
		this.setObservedAttribute('height',value);
	}
	get height() {
		return this.getAttribute('height');
	}
	set fill(value) {
		this.setObservedAttribute('fill',value);
	}
	get fill() {
		return this.getAttribute('fill');
	}
	setObservedAttribute(key,value) {
		value = String(value);
		if (this.getAttribute(key) !== value) {
            this.setAttribute(key, value);
        }
	}
	attributeChangedCallback(name,oldValue,newValue) {
		this.#template.image.setAttribute(name,newValue);
	}
	connectedCallback() {

		this.#abortController = new AbortController();
		const options = {signal: this.#abortController.signal};

		this.#template.image.addEventListener('change',this,options);
		this.#template.label.addEventListener('change',this,options);

		this.#template.grab.addEventListener('mouseover',this,options);
		this.#template.grab.addEventListener('mousedown',this,options);
		this.#template.grab.addEventListener('mouseup',this,options);
		this.#template.grab.addEventListener('mouseout',this,options);

		this.addEventListener('dragstart',this,options);
		this.addEventListener('dragover',this,options);
		this.addEventListener('dragleave',this,options);
		this.addEventListener('dragend',this,options);
		this.addEventListener('drop',this,options);

		this.shadowRoot.appendChild(this.#template.fragment);

	}
	disconnectedCallback() {
		if (this.#abortController) {
			this.#abortController.abort();
			this.#abortController = null;
        }
		this.#parent.setFormValue();
	}
	handleEvent(event) {
		switch (event.type) {
			case 'mouseover':
			case 'mousedown':
				this.draggable = true;
				Output.live('accept','Click and hold to drag.');
				break;
			case 'mouseup':
			case 'mouseout':
				this.draggable = false;
				Output.live(null);
				break;
			case 'dragstart':
				this.#parent.draggedItem = this;
				this.dataset.state = 'dragged';
				break;
			case 'dragover':
				event.preventDefault();
				if (this != this.#parent.draggedItem) {
					this.dataset.state = 'over';
				}
				break;
			case 'dragleave':
				event.preventDefault();
				if (this != this.#parent.draggedItem) {
					this.dataset.state = 'none';
				}
				break;
			case 'dragend':
				this.dataset.state = 'none';
				break;
			case 'drop':
				event.preventDefault();
				if (this != this.#parent.draggedItem) {
					if (this.compareDocumentPosition(this.#parent.draggedItem) & Node.DOCUMENT_POSITION_FOLLOWING) {
						this.before(this.#parent.draggedItem);
					} else {
						this.after(this.#parent.draggedItem);
					}
					this.dataset.state = 'none';
					this.#parent.setFormValue();
				}
				break;
			case 'change':
				if (event.target == this.#template.label) {
					this.#value.label = event.target.value;
				} else {
					this.update(event.detail);
				}
				this.#parent.setFormValue();
				break;
		}
	}
	update(object) {
		this.#value = {...this.#value,...object};
		this.#template.label.value = this.#value.label || '';
		this.#template.dimensions.textContent = this.#value.sizes;
	}
	async upload(file) {
		const object = await this.#template.image.upload(file);
		this.update(object);
		return this.#value;
	}
}

window.customElements.define('screenshot-item',ScreenshotItem);
