
import { Index,IO,Output,LapineMessage } from '../frontend.js';

export class ShortcutItem extends HTMLElement {
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
		this.#template = Index.getTemplate('shortcut-item');
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
		this.#template.icon.setAttribute(name,newValue);
	}
	broadcastChange(action) {
		const options = {
			detail: {
				element: this,
				action: action
			}
		};
		const event = new CustomEvent('change',options);
		this.#parent.dispatchEvent(event);
	}
	connectedCallback() {

		this.#abortController = new AbortController();
		const options = {signal: this.#abortController.signal};

		this.#template.icon.addEventListener('change',this,options);
		this.#template.name.addEventListener('change',this,options);
		this.#template.short_name.addEventListener('change',this,options);
		this.#template.url.addEventListener('change',this,options);
		this.#template.remove.addEventListener('click',this,options);
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
		this.broadcastChange('removed');
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
					this.broadcastChange('dropped');
				}
				break;
			case 'change':
				switch (event.target) {
					case this.#template.name:
						this.#value.name = event.target.value;
						break;
					case this.#template.short_name:
						this.#value.short_name = event.target.value;
						break;
					case this.#template.url:
						this.#value.url = event.target.value;
						break;
					case this.#template.icon:
						this.#value.icons = event.detail;
				}
				this.broadcastChange('edited');
				break;
			case 'click':
				const method = () => this.remove();
				const message = new LapineMessage('danger','Remove shortcut','Are you sure?');
				message.addButton('accept','Proceed',method);
				message.addButton('reject','Cancel',null);
				message.display(false);
		}
	}
	async upload(object) {
		this.#value = object || {};
		this.#template.name.value = this.#value.name || '';
		this.#template.short_name.value = this.#value.short_name || '';
		this.#template.url.value = this.#value.url || '';
		if (object.icons) {
			for (const entry of object.icons) {
				if (entry.sizes == '192x192') {
					this.#value.icons = await this.#template.icon.upload(entry);
					break;
				}
			}
		}
		this.broadcastChange('uploaded');
		return this.#value;
	}
}

window.customElements.define('shortcut-item',ShortcutItem);
