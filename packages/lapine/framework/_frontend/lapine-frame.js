
import Navigation from './navigation.js';
import Session from './session.js';

export class LapineFrame extends HTMLElement {
	constructor() {

		super();

		this.link = null;
		this.node = null;
		this.elements = null;
		this.isMain = this.id == 'main';

	}
	async connectedCallback() {

		this.dataset.loading = true;

		window.addEventListener('link',this,false);

		if (this.isMain) {

			const state = {href: window.location.href};

			history.replaceState(state,'',window.location.href);
			window.addEventListener('popstate',this,false);

			await Navigation.data;

			this.request(window.location.href);

		}
	}
	handleEvent(event) {
		switch (event.type) {
			case 'link':
				if (this.id == event.detail.target) {
					this.request(event.detail.href);
				}
				break;
			case 'popstate':
				event.preventDefault();
				this.request(event.state.href);
		}
	}
	async request(href) {

		this.dataset.loading = true;

		const options = {
			method: 'GET',
			headers: {
				'Accept': 'text/html',
				'X-Requested-With': 'LAPINE'
			}
		};

		const request = new Request(href,options);
		const response = await fetch(request);
		const html = await response.text();
		const range = document.createRange();
		const fragment = range.createContextualFragment(html);
		const uni = Navigation.getUniFromHREF(href);

		await Session.update(response);

		this.node = Navigation.getNode(uni);
		this.data = {};

		Site.setElements(this,fragment);

		while (this.firstChild) this.removeChild(this.firstChild);

		this.setAttribute('uni',this.uni);
		this.appendChild(fragment);

		document.body.dataset.state = this.node.state;

		if (this.isMain) {
			document.title = this.node.title;
			document.body.dataset.uni = this.node.uni;
			history.pushState({href: href},'',href);
		}

		this.dataset.loading = false;

	}
	disconnectedCallback() {
		window.removeEventListener('ready',this,false);
		window.removeEventListener('link',this,false);
		if (this.id == 'main') {
			window.removeEventListener('popstate',this,false);
		}
	}
}
