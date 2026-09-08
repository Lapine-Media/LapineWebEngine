
import { Site,IO,Sound } from '../frontend.js';

export class LapineMessage extends HTMLElement {
	type;
	title;
	text;
	buttons = [];
	#timeout = 0;
	#timer = 0;
	constructor(type,title,text) {
		super();
		this.type = type;
		this.title = title;
		this.text = text;
		this.attachShadow({mode: 'open'});
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
		Site.elements.frame.messages.prepend(this);
		Site.elements.frame.messages.showModal();
		Sound.play(this.type);
	}
	async connectedCallback() {

		await Site.ready;

		const template = await Site.getTemplate('lapine-message');

		template.container.classList.add(this.type);
		template.title.textContent = this.title;
		template.text.innerHTML = this.text;

		for (const button of this.buttons) {
			const element = document.createElement('button');
			element.type = 'button';
			element.classList.add(button.icon);
			element.textContent = button.label;
			element.onclick = event => {
				event.preventDefault();
				IO.receiveSignal(button.signal,button.data);
				this.remove();
			}
			template.buttons.appendChild(element);
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
			template.container.classList.add('timed');
			this.#timer = setInterval(countdown,10);
		}

		this.shadowRoot.appendChild(template.fragment);

	}
	disconnectedCallback() {
		if (Site.elements.frame.messages.children.length == 0) {
			Site.elements.frame.messages.close();
		}
		clearInterval(this.#timer);
	}
}

window.customElements.define('lapine-message',LapineMessage);
