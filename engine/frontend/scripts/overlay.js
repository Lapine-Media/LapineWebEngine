
import { Index,IO } from './frontend.js';

export const Overlay = {
	data: {},
	open: async function(title,href,signal = null,button = 'Cancel') {
		try {
			await Index.openLink(href,'overlay');
			if (signal) {
				const values = Object.values(signal);
				IO.signal(...values);
			}
			document.forms.index.elements.dialog.textContent = button;
			Index.elements.frame.overlay_title.textContent = title;
			Index.setState('dialog');
			Index.elements.frame.overlay_dialog.show();
			return Promise.resolve(Index.elements.overlay);
		} catch (error) {
			console.log(error);
		}
	},
	close: async function(signal = null) {
		if (signal) {
			const values = Object.values(signal);
			IO.signal(...values);
		}
		Index.setState('none');
		Index.elements.frame.overlay_dialog.close('test');
	},
	block: function(text) {
		Index.elements.frame.overlay.textContent = text;
		Index.setState('blocked');
		Index.elements.frame.overlay_dialog.show();
	}
}
