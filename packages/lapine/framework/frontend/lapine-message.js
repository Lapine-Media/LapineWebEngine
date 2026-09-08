
import Kits from './kits.js';
import Site from './site.js';

export class LapineMessage extends HTMLElement {
	type;
	title;
	text;
	buttons = [];
	#timeout = 0;
	#timer = 0;
	#template;
	#dialog;
	constructor(type,title,text) {
		super();
		this.type = type;
		this.title = title;
		this.text = text;
		this.#template = Kits.getTemplate('lapine-message');
		this.#dialog = Site.elements.index.lapine_messages;
		this.attachShadow({mode: 'open'});
	}
	handleEvent(button,event) {
		event.preventDefault();
		//IO.receiveSignal(button.signal,button.data);
		this.remove();
	}
	addButton(icon,label,signal = null,...data) {
		const button = {icon,label,signal,data};
		this.buttons.push(button);
	}
	display(timeout = false) {
		if (this.buttons.length == 0) {
			this.addButton('accept','Ok',null);
		}
		this.#timeout = timeout ? 5000 : 0;
		this.#dialog.prepend(this);
		this.#dialog.show();
		Sound.play(this.type);
	}
	async connectedCallback() {

		this.#template.container.classList.add(this.type);
		this.#template.title.textContent = this.title;
		this.#template.text.innerHTML = this.text;

		for (const button of this.buttons) {
			const element = document.createElement('button');
			element.type = 'button';
			element.classList.add(button.icon);
			element.textContent = button.label;
			element.onclick = this.handleEvent.bind(this,button);
			this.#template.buttons.appendChild(element);
		}

		if (this.#timeout > 0) {
			let value = 0;
			const unit = 1000/this.#timeout;
			const countdown = () => {
				value += unit;
				template.timer.value = value;
				if (value >= 100) {
					this.remove();
				}
			}
			this.#template.container.classList.add('timed');
			this.#timer = setInterval(countdown,10);
		}

		this.shadowRoot.appendChild(this.#template.fragment);

	}
	disconnectedCallback() {
		if (this.#dialog.children.length == 0) {
			this.#dialog.close();
		}
		clearInterval(this.#timer);
	}
}
