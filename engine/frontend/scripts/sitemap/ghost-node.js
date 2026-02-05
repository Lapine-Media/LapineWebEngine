
import { Index,Output,Sitemap,NodeTree,MapData } from '../frontend.js';

class GhostNode extends HTMLElement {
	#shadow;
	#template;
	constructor() {
		super();
		this.dragged = null;
		this.#shadow = this.attachShadow({mode: 'open'});
	}
	connectedCallback() {
		this.#template = Index.getTemplate('ghost-node');
		this.#shadow.appendChild(this.#template.fragment);
	}
	drag(event,element) {

		this.dragged = element;

		this.#template.container.dataset.type = element.data.type;
		this.#template.title.textContent = element.data.title;

		if (element.data.uni == 'new') {
			this.#template.details.textContent = element.data.details;
		} else {
			this.#template.details.textContent = element.data.type+' node';
		}

		event.dataTransfer.setData('text/plain',element.data.uni);
		event.dataTransfer.setDragImage(this,24,24);

	}
	enter(element,area) {

		switch (true) {
			case element == this.dragged:
			case this.dragged.contains(element):
				return null;
			case area == 'dropzone' && MapData.isRequired(this.dragged.data.uni):
				Output.live('reject','This '+this.dragged.data.type+' can not be removed.');
				return false;
			case area == 'dropzone' && this.dragged.data.uni == 'new':
				return false;
		}

		let expression;
		let message;
		let allowed = true;
		const depot = this.dragged.data.uni == 'new';
		const dragged_type = this.dragged.data.type;
		const dragged_uni = dragged_type+' "'+this.dragged.data.uni+'"';

		if (area == 'dropzone') {
			expression = this.dragged.data.type+' to dropzone';
		} else {
			if (element.data.type == 'root') {
				expression = this.dragged.data.type+' to '+element.data.type;
			} else {
				const target = area == 'icon' ? 'icon': 'sibling';
				expression = this.dragged.data.type+' to '+element.data.type+' '+target;
			}
		}

		switch (expression) {
			case dragged_type+' to dropzone':
				if (depot) {
					message = 'Discard new '+dragged_type+' node';
				} else {
					const parent = this.dragged.parentNode;
					const parent_type = parent.data.type;
					const uni = parent_type == 'root' ? parent.data.title : parent_type+' "'+parent.data.uni+'"';
					message = 'Remove '+dragged_uni+' from '+uni;
				}
				break;
			case 'frame to root':
			case 'frame to frame sibling':

			case 'page to frame icon':
			case 'page to page icon':
			case 'page to page sibling':
			case 'page to title sibling':
			case 'page to redirect sibling':
			case 'page to element sibling':

			case 'title to frame icon':
			case 'title to page icon':
			case 'title to page sibling':
			case 'title to title sibling':
			case 'title to redirect sibling':
			case 'title to element sibling':

			case 'redirect to frame icon':
			case 'redirect to page icon':
			case 'redirect to page sibling':
			case 'redirect to title sibling':
			case 'redirect to redirect sibling':
			case 'redirect to element sibling':

			case 'element to frame icon':
			case 'element to page icon':
			case 'element to page sibling':
			case 'element to title sibling':
			case 'element to redirect sibling':
			case 'element to element sibling':
				switch (area) {
					case 'icon':
						message = 'Place "'+this.dragged.data.title+'" inside "'+element.data.title+'"';
						break;
					case 'older':
						message = 'Place "'+this.dragged.data.title+'" above "'+element.data.title+'"';
						break;
					case 'younger':
						message = 'Place "'+this.dragged.data.title+'" under "'+element.data.title+'"';
						break;
				}
				break;
			default:
				allowed = false;
				switch (dragged_type) {
					case 'frame':
						message = 'Frames can only be placed at the top level';
						break;
					case 'page':
						message = 'Place pages inside frames or beside/inside other pages';
						break;
					case 'title':
						message = 'Place titles inside frames or beside/inside pages';
						break;
					case 'redirect':
						message = 'Redirects can not be placed here';
						break;
					case 'element':
						message = 'Elements can not be placed here';
						break;
				}
		}

		Output.live(allowed ? 'accept' : 'reject',message);

		return allowed;

	}
	drop(element,area) {

		if (this.dragged.data.uni == 'new') {
			const data = this.dragged.data;
			this.dragged = NodeTree.getNewNode(data.type,data.title);
		}

		switch (area) {
			case 'dropzone':
				Sitemap.setUndoable(this.dragged);
				this.dragged.remove();
				break;
			case 'older':
				element.before(this.dragged);
				break;
			case 'younger':
				element.after(this.dragged);
				break;
			case 'icon':
				element.appendChild(this.dragged);
				break;
		}

		if (Sitemap.selected == this.dragged) {
			switch (Sitemap.selected.data.type) {
				case 'frame':
				case 'page':
					Sitemap.setURL(this.dragged);
			}
		}

		this.end();

		Sitemap.setEdited(true);

	}
	end() {
		Output.live(null);
	}
}

window.customElements.define('ghost-node',GhostNode);

export const Ghost = new GhostNode();
