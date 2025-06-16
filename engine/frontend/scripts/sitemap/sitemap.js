
import { Index,IO,Overlay,Ghost,DepotNode,MapNode,MapData,NodeTree } from '../frontend.js';

export const Sitemap = new class {
	#initiated = false;
	#undoable = null;
	#clickMethod;
	selected = null;
	constructor() {
		window.addEventListener('sitemap',this,false);
		this.#clickMethod = this.clickOutside.bind(this);
	}
	handleEvent(event) {
		switch (event.type) {
			case 'dragover':
				event.preventDefault();
				break;
			case 'dragenter':
				const allowed = Ghost.enter(event.target,'dropzone');
				Index.elements.sitemap.dropzone.dataset.over = allowed;
				break;
			case 'dragleave':
				IO.live(null);
				Index.elements.sitemap.dropzone.dataset.over = null;
				break;
			case 'drop':
				event.preventDefault();
				if (Index.elements.sitemap.dropzone.dataset.over == 'true') {
					Ghost.drop(event.target,'dropzone');
				}
				Index.elements.sitemap.dropzone.dataset.over = null;
				break;
			case 'sitemap':
				let message;
				switch (event.detail.name+' '+event.detail.value) {
					case 'menu visible':
						if (this.#initiated == false) {
							this.setup();
						}
						break;
					case 'menu load':
						IO.send('sitemap','load','existing');
						break;
					case 'menu new':
						IO.send('sitemap','load','model');
						break;
					case 'menu save':
						const map = NodeTree.getMap();
						const json = JSON.stringify(map);
						IO.send('sitemap','save','compress',json);
						break;
					case 'csp edit':
						if (event.detail.data.csp == '') {
							message = IO.getMessage('danger','Name missing','Please enter a file name in order to make edits. If the file doesn\'t exist it will be created.');
							message.display();
						} else {
							const file = event.detail.data.csp.replace('.csp.txt','');
							const signal = IO.getSignal('policy','dialog','open',file);
							Overlay.open('Edit content security policy','/markup/policy.html',signal);
						}
						break;
					case 'loaded success':
						this.#initiated = true;
						this.build(event.detail.data);
						break;
					case 'saved success':
						this.setEdited(false);
						message = IO.getMessage('accept','Success!','The sitemap has been saved.');
						message.display(true);
						break;
					case 'depot undo':
						this.undo();
						break;
					case 'site save':
					case 'frame save':
					case 'page save':
					case 'title save':
					case 'redirect save':
					case 'condition save':
					case 'element save':
						const saved = this.saveNode(event.detail.data);
						if (event.detail.name == 'site' && saved) {
							NodeTree.updateRoot(event.detail.data);
							IO.live('accept','Settings saved!');
						}
						break;
					default:
						console.log(event.type,event.detail);
						break;
				}
				break;
			default:
				console.log(event.type,event.detail);
		}
	}
	setup() {

		const fragment = document.createDocumentFragment();
		const methods = {
			append: element => fragment.append(element),
			listen: item => Index.elements.sitemap.dropzone.addEventListener(item,this,false)
		};

		[new DepotNode('frame','New frame','Fronts for different parts of the site','Place in Frontend'),
		new DepotNode('page','New page','The contents that loads into the frames','Place in a frame, page, or router'),
		new DepotNode('title','New title','Divides menus into subsections','Place between pages'),
		new DepotNode('redirect','New redirect','Redirect to another page or URL','Place in a page, module, or router'),
		new DepotNode('element','New element','Embed a custom element','Place in a frame or page')
		].forEach(methods.append);

		['dragenter','dragover','dragleave','drop'].forEach(methods.listen);

		Index.elements.sitemap.nodes.append(fragment);

		document.body.append(Ghost);

		IO.send('sitemap','load','existing');

	}
	build(data) {

		MapData.setup(data);
		NodeTree.setup();

		this.selected = null;
		this.setEdited(false);
		this.clearUndoable();

		Index.update(Index.elements.sitemap.map,NodeTree.root);

	}
	select(element,selected) {

		if (this.selected instanceof MapNode && element != this.selected) {
			this.selected.select(false);
		}

		if (selected) {

			Index.elements.sitemap.forms.dataset.state = element.data.type;

			this.selected = element;
			this.selected.select(true);

			window.addEventListener('click',this.#clickMethod,true);

			switch (element.data.type) {
				case 'root':
					IO.live('accept','Editing site settings');
					break;
				case 'title':
				case 'redirect':
					IO.live('accept','Editing '+element.data.type+' "'+element.data.title+'"');
					break;
				default:
					IO.live('accept','Editing '+element.data.type+' "'+element.data.uni+'"');
			}

			this.loadForm(element);

		} else {
			this.deselect();
		}

	}
	clickOutside(event) {
		switch (true) {
			case Index.elements.sitemap.forms.contains(event.target):
			case Index.elements.frame.overlay_dialog.contains(event.target):
			case Index.elements.frame.messages.contains(event.target):
				return;
			case this.selected instanceof MapNode:
				this.deselect();
		}
	}
	deselect() {

		Index.elements.sitemap.forms.dataset.state = 'none';

		IO.live(null);

		if (this.selected != null) {

			this.selected.select(false);
			this.selected = null;

			window.removeEventListener('click',this.#clickMethod,true);
		}

	}
	setEdited(state) {
		document.forms.menu.dataset.edited = state;
	}
	setUndoable(element) {

		this.#undoable = {
			element: element,
			parent: element.parentNode,
			after: element.previousElementSibling
		};

		Index.elements.sitemap.undoable.textContent = 'Remove '+element.data.type+' "'+element.data.title+'"';

		document.forms.depot.dataset.undoable = true;

		NodeTree.removeElement(element.data.uni);

	}
	clearUndoable() {
		this.#undoable == null;
		Index.elements.sitemap.undoable.textContent = '';
		document.forms.depot.dataset.undoable = false;
	}
	undo() {
		switch (true) {
			case this.undoable == null:
				break;
			case this.undoable.after == null:
				this.undoable.parent.prepend(this.undoable.element);
				break;
			default:
				this.undoable.after.after(this.undoable.element);
		}
		this.undoable.element.setUndone();

		NodeTree.addElement(this.undoable.element.data.uni,this.undoable.element);

		this.clearUndoable();
	}
	setURL(element) {
		const url = NodeTree.getPath(element);
		const key = element.data.type == 'page' ? 'page_link' : 'frame_link';
		Index.elements.sitemap[key].href = url;
		Index.elements.sitemap[key].textContent = url;
	}
	loadForm(element) {

		let form;
		let data = structuredClone(element.data);
console.log(data);
		if (data.type == 'root') {
			form = document.forms.site;
			data = MapData.site;
		} else {
			form = document.forms[data.type];
		}

		if (data.conditions) {
			data.conditions = data.conditions.replace(';','\n');
		}

		for (const input of form.elements) {
			if (input.name) {
				switch (input.type) {
					case 'submit':
						break;
					case 'checkbox':
						input.checked = data[input.name] || false;
						break;
					default:
						input.value = data[input.name] || '';
				}
			}
		}

		form.dataset.lock = MapData.isReserved(element.data.uni);

		if (data.type == 'page' || data.type == 'frame') {

			this.setURL(element);

			const names = ['seo_title','seo_description','seo_keywords','seo_image_url'];
			names.push(data.type == 'page' ? 'target' : 'missing');

			for (const name of names) {
				const input = form.elements[name];
				if (input.value == '') {
					input.placeholder = NodeTree.getInherentedValue(element,name,element.data.frame);
				}
			}

		}

	}
	saveNode(input) {

		if (input.uni) {
			if (input.uni == '') {
				IO.live('reject','Uni can\'t be empty');
				return false;
			}
			const element = NodeTree.getElement(input.uni);
			if (element != undefined && element != this.selected) {
				IO.live('reject','Uni "'+input.uni+'" already exists as '+element.data.type+' "'+element.data.title+'"');
				return false;
			}
			if (input.uni != this.selected.data.uni) {
				const old = this.selected.data.uni;
				NodeTree.removeElement(old);
				NodeTree.addElement(input.uni,this.selected);
				this.selected.data.uni = input.uni;
				if (MapData.getSiteValue('index') == old) {
					MapData.setSiteValue('index',input.uni);
				}
			}
		}

		if (input.path) {
			for (const child of this.selected.parentNode.children) {
				if (child.data.path == input.path && child != this.selected) {
					IO.live('reject','Path "'+input.path+'" already leads to '+child.data.type+' "'+child.data.title+'"');
					return false;
				}
			}
		}

		Object.keys(input).forEach(key => this.selected.data[key] = input[key]);

		switch (this.selected.data.type) {
			case 'root':
				MapData.site = input;
				break;
			case 'page':
				this.selected.data.redirect = input.redirect == 'true';
				this.selected.data.hidden = input.hidden == 'true';
				this.selected.data.nofollow = input.nofollow == 'true';
				break;
			case 'redirect':
				this.selected.data.permanent = input.permanent == 'true';
				break;
		}

		if (this.selected.data.conditions) {
			this.selected.data.conditions = this.selected.data.conditions.replace('\n',';');
		}

		this.selected.update();
		this.setEdited(true);

		return true;

	}
}
