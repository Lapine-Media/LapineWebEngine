
import Kits from './kits.js';

export class LapineSVG extends HTMLElement {
	constructor() {
		super();
		this.attachShadow({mode: 'open'});
	}
	async connectedCallback() {
		const as = this.getAttribute('as');
		const [context,name] = as.split('/');

		if (this.shadowRoot.firstChild == null) {
			await Kits.install(context);

			const kit = await Kits.kits[context];
			const link = document.createElement('link');
			const fragment = kit.templates[name].cloneNode(true);

			link.rel = 'stylesheet';
			link.href = kit.assets[name];

			fragment.firstChild.before(link);

			this.shadowRoot.appendChild(fragment);
		}
	}
}
