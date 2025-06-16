
import { Index,Sitemap,NodeTree,MapData,Ghost } from '../frontend.js';

export class MapNode extends HTMLElement {
	#shadow;
	#template;
	data;
	constructor(node) {

		super();

		this.data = node;
		this.#shadow = this.attachShadow({mode: 'open'});

		NodeTree.addElement(node.uni,this);

		const method = mutationsList => {
			for (const mutation of mutationsList) {
				if (mutation.type === 'childList') {
					this.setState('children',this.children.length > 0);
				}
			}
		}
		const options = {
			childList: true,
			subtree: false
		}

		new MutationObserver(method).observe(this,options);

	}
	connectedCallback() {
		if (this.#template == undefined) {

			this.#template = Index.getTemplate('map-node');

			const listen = (element,...actions) => {
				const action = name => element.addEventListener(name,this,false);
				actions.forEach(action);
			}

			if (this.data.type != 'root') {
				this.#template.content.draggable = true;
				listen(this.#template.older,'dragenter','dragover','dragleave','drop');
				listen(this.#template.content,'dragstart','drag','dragend');
				listen(this.#template.younger,'dragenter','dragover','dragleave','drop');
			}

			listen(this.#template.icon,'dragenter','dragover','dragleave','drop');
			listen(this.#template.text,'dragenter','dragover','dragleave','drop');
			listen(this.#template.container,'click');

			const required = MapData.isRequired(this.data.uni);
			this.setState('default',required);
			this.setState('expanded',this.data.expanded);

			this.update();

			this.#shadow.appendChild(this.#template.fragment);

		}
	}
	update() {

		this.setState('type',this.data.type);
		this.setState('uni',this.data.uni);

		this.#template.title.textContent = this.data.title;
		this.#template.uni.textContent = this.data.uni;

		switch (this.data.type) {
			case 'root':
				this.#template.a.textContent = this.data.details;
				break;
			case 'frame':
				this.#template.title.textContent = this.data.title;
				this.#template.a.textContent = this.data.path == null ? '' : this.data.path;
				this.#template.b.textContent = this.data.file;
				break;
			case 'page':
				this.#template.a.textContent = this.data.path;
				this.#template.b.textContent = this.data.file;
				this.#template.c.textContent = this.data.target;
				if (this.data.redirect) {
					this.#template.title.textContent = '('+this.data.title+')';
				}
				this.setState('conditions',this.data.conditions.length > 0);
				this.setState('hidden',this.data.hidden);
				this.setState('seo',this.data.nofollow);
				break;
			case 'title':
				this.#template.a.textContent = this.data.description;
				break;
			case 'redirect':
				this.#template.a.textContent = this.data.path;
				this.#template.b.textContent = this.data.destination;
				this.#template.c.textContent = this.data.target;
				break;
			case 'element':
				this.#template.a.textContent = this.data.element;
				this.setState('conditions',this.data.conditions.length > 0);
				break;
		}

	}
	handleEvent(event) {

		const target = event.target.id == 'text' ? this.#template.icon : event.target;

		switch (event.type) {
			case 'click':
				event.preventDefault();
				switch (event.target) {
					case this.#template.arrow:
						this.data.expanded = this.data.expanded ? false : true;
						this.setState('expanded',this.data.expanded);
						break;
					case this.#template.icon:
					case this.#template.text:
						if (this.getState('selected') == 'false') {
							Sitemap.select(this,true);
						}
						break;
					default:
						if (this.getState('selected') == 'true') {
							Sitemap.select(this,false);
						}
						break;
				}
				break;
			case 'dragstart':
				Ghost.drag(event,this);
				this.setState('dragged','true');
				break;
			case 'dragover':
				event.preventDefault();
				break;
			case 'dragenter':
				const allowed = Ghost.enter(this,target.id);
				this.setState('over',allowed ? target.id : 'reject_'+target.id);
				this.setState('drop',allowed);
				break;
			case 'dragleave':
				const state = this.getState('over');
				switch (state) {
					case target.id:
					case 'reject_'+target.id:
						this.setState('over',false);
						this.setState('drop','');
				}
				break;
			case 'dragend':
				Ghost.end();
				this.setState('dragged',false);
				break;
			case 'drop':
				event.preventDefault();
				if (this.getState('over') == target.id) {
					Ghost.drop(this,target.id);
				}
				this.setState('over',false);
				this.setState('drop','');
				break;
		}

	}
	setState(name,value) {
		this.#template.container.dataset[name] = value;
	}
	getState(name) {
		return this.#template.container.dataset[name];
	}
	select(selected) {
		this.setState('selected',selected);
	}
	setUndone() {
		this.setState('dragged',false);
	}
	getAttribute(name) {
		return this.#template.container.dataset[name];
	}
	remove() {
		NodeTree.removeElement(this.data.uni);
		super.remove();
	}
	disconnectedCallback() {
		console.log('disconnectedCallback',this);
	}
}

window.customElements.define('map-node',MapNode);
