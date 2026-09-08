
import { Site,IO } from './frontend.js';

export const Overlay = {
	data: {},
	setData: function(key,value) {
		this.data[key] = value;
	},
	getData: function(key = null) {
		return key ? this.data[key] : this.data;
	},
	clearData: function() {
		this.data = {};
	},
	execute: function(signal,elements) {
		switch (true) {
			case signal == null:
				break;
			case signal instanceof Function:
				return signal(elements);
			default:
				const values = Object.values(signal);
				IO.sendSignal(...values);
		}
	},
	open: async function(title,href,signal = null,button = null,context = null) {
		await Site.elements.frame.overlay.openPage(href);
		Site.elements.frame.overlay.dataset.context = context || '';
		Site.elements.frame.overlay_title.textContent = title;
		Site.elements.frame.overlay_button.textContent = button || 'Cancel';
		Site.elements.frame.overlay_dialog.dataset.page = /\/([a-z_1-9.-]+)\.html/.exec(href)[1];
		Site.elements.frame.overlay_dialog.showModal();
		this.execute(signal);
	},
	close: async function(signal = null) {
		this.execute(signal);
		Site.elements.frame.overlay_dialog.close();
		Site.elements.frame.overlay_dialog.classList.remove('blocked');
	},
	block: async function(text) {
		await Site.ready;
		const event = new Event('blocked');
		window.dispatchEvent(event);
		Site.elements.frame.overlay.displayText(text);
		Site.elements.frame.overlay_dialog.classList.add('blocked');
		Site.elements.frame.overlay_dialog.showModal();
	}
}
