
import { Index,IO } from './frontend.js';

export const Overlay = {
	data: {},
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
	setData: function(key,value) {
		this.data[key] = value;
	},
	getData: function(key) {
		return this.data[key];
	},
	clearData: function() {
		this.data = {};
	},
	open: async function(title,href,signal = null,classes = null,button = null) {
		try {
			const elements = await Index.openLink(href,'overlay');
			this.execute(signal,elements);
			document.forms.index.elements.dialog.textContent = button || 'Cancel';
			Index.elements.frame.overlay_dialog.dataset.page = /\/([a-z_1-9.-]+)\.html/.exec(href)[1];
			Index.elements.frame.overlay_title.textContent = title;
			if (classes) {
				Index.elements.frame.overlay_dialog.className += ' '+classes;
			}
			Index.setState('dialog');
			Index.elements.frame.overlay_dialog.show();
			return Promise.resolve(Index.elements.overlay);
		} catch (error) {
			console.log(error);
		}
	},
	close: async function(signal = null) {
		this.execute(signal);
		Index.setState('none');
		Index.elements.frame.overlay_dialog.close('test');
		Index.elements.frame.overlay_dialog.className = 'overlay';
	},
	block: function(text) {
		Index.elements.frame.overlay.textContent = text;
		Index.setState('blocked');
		Index.elements.frame.overlay_dialog.show();
	}
}
