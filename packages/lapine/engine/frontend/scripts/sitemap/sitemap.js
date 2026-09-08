
import { Site,IO,Output,Overlay,LapineMessage,Ghost,DepotNode,MapNode,MapData,NodeTree,PageContext } from '../frontend.js';

export const Sitemap = new class {
	#undoable = null;
	#clickMethod;
	#selected = null;
	constructor() {
		window.addEventListener('load',this,false);
		window.addEventListener('sitemap',this,false);
		this.#clickMethod = this.clickOutside.bind(this);
	}
	async handleEvent(event) {
		event.preventDefault();
		switch (event.type) {
			case 'load':
				await Site.ready;
				this.setup();
				break;
			case 'sitemap':
				const {name,value,data} = event.detail;
				this.action(name,value,data);
				break;
			case 'dragover':
				event.preventDefault();
				break;
			case 'dragenter':
				const allowed = Ghost.enter(event.target,'dropzone');
				Site.elements.sitemap.dropzone.dataset.over = allowed;
				break;
			case 'dragleave':
				Output.live(null);
				Site.elements.sitemap.dropzone.dataset.over = null;
				break;
			case 'drop':
				event.preventDefault();
				if (Site.elements.sitemap.dropzone.dataset.over == 'true') {
					Ghost.drop(event.target,'dropzone');
				}
				Site.elements.sitemap.dropzone.dataset.over = null;
				break;
			case 'change':
				const type = event.target.value === 'true' ? 'button' : 'element';
				Site.elements.sitemap.element.dataset.type = type;
				break;
			default:
				console.log(event.type,event.detail);
		}
	}
	async action(name,value,data) {
		try {
			let message,signal;
			switch (name+' '+value) {
				case 'loaded success':
					this.build(data);
					break;
				case 'confirm new':
					message = new LapineMessage('danger','Are you sure?','A new Sitemap will be loaded. Unless you save it, you can restore your current Sitemap by clicking "Load".');
					signal = IO.getSignal(false,'sitemap','load','template');
					message.addButton('accept','Proceed',signal);
					message.addButton('reject','Cancel',null);
					message.display(false);
					break;
				case 'edit policy':
					const csp = data.get('csp');
					if (csp == '') {
						message = new LapineMessage('danger','Name missing','Please enter a file name in order to open a file. If the file doesn\'t exist it will be created.');
						message.display();
					} else {
						IO.sendSignal(false,'policy','load',csp,null);
					}
					break;
				case 'saved success':
					this.setEdited(false);
					message = new LapineMessage('accept','Success!','The sitemap has been saved.');
					message.display(true);
					break;
				case 'load map':
					IO.sendSignal(false,'sitemap','load','existing');
					break;
				case 'load new':
					IO.sendSignal(false,'sitemap','load','template');
					break;
				case 'save map':
					const map = NodeTree.getMap();
					const json = JSON.stringify(map);
					IO.sendSignal(false,'sitemap','save','compress',json);
					break;
				case 'save '+value:
					const saved = this.saveNode(data);
					if (name == 'site' && saved) {
						NodeTree.updateRoot(data);
						Output.live('accept','Settings saved!');
					}
					break;
				/*case 'undo depot':
					this.undo();
					break;*/
				default:
					console.log(name+' '+value);
			}
		} catch (error) {
			console.log(error);
		}
	}
	async setup() {

		await PageContext.views.sitemap.ready;

		const fragment = document.createDocumentFragment();
		const methods = {
			append: element => fragment.append(element),
			listen: item => Site.elements.sitemap.dropzone.addEventListener(item,this,false)
		};

		[new DepotNode('frame','New frame','Fronts for different parts of the site','Place in Frontend'),
		new DepotNode('page','New page','The contents that loads into the frames','Place in a frame, page, or router'),
		new DepotNode('title','New title','Divides menus into subsections','Place between pages'),
		new DepotNode('redirect','New redirect','Redirect to another page or URL','Place in a page, module, or router'),
		new DepotNode('element','New element','Embed a custom element','Place in a frame or page')
		].forEach(methods.append);

		['dragenter','dragover','dragleave','drop'].forEach(methods.listen);

		Site.elements.sitemap.nodes.append(fragment);
		Site.elements.sitemap.element_type.addEventListener('change',this,false);

		document.body.append(Ghost);

		IO.sendSignal(false,'sitemap','load','existing');

	}
	build(data) {

		MapData.setup(data);
		NodeTree.setup();

		this.selected = null;
		this.setEdited(false);
		//this.clearUndoable();

		Site.clearElement(Site.elements.sitemap.map,NodeTree.root);

	}
	select(element,selected) {

		if (this.selected instanceof MapNode && element != this.selected) {
			this.selected.select(false);
		}

		if (selected) {

			Site.elements.sitemap.forms.dataset.state = element.data.type;

			this.selected = element;
			this.selected.select(true);

			window.addEventListener('click',this.#clickMethod,true);

			switch (element.data.type) {
				case 'root':
					Output.live('accept','Editing site settings');
					break;
				case 'title':
				case 'redirect':
					Output.live('accept','Editing '+element.data.type+' "'+element.data.title+'"');
					break;
				default:
					Output.live('accept','Editing '+element.data.type+' "'+element.data.uni+'"');
			}

			this.loadForm(element);

		} else {
			this.deselect();
		}

	}
	clickOutside(event) {
		const target = event.composedPath()[0];
		switch (true) {
			case Site.elements.sitemap.forms.contains(target):
			case Site.elements.frame.overlay_dialog.contains(target):
			case Site.elements.frame.messages.contains(target):
				return;
			case this.selected instanceof MapNode:
				this.deselect();
		}
	}
	deselect() {

		Site.elements.sitemap.forms.dataset.state = 'none';

		Output.live(null);

		if (this.selected != null) {

			this.selected.select(false);
			this.selected = null;

			window.removeEventListener('click',this.#clickMethod,true);
		}

	}
	setEdited(state) {
		Site.elements.sitemap.menu.dataset.edited = state;
	}
	/*setUndoable(element) {

		this.#undoable = {
			element: element,
			parent: element.parentNode,
			after: element.previousElementSibling
		};

		Site.elements.sitemap.undoable.textContent = 'Remove '+element.data.type+' "'+element.data.title+'"';

		document.forms.depot.dataset.undoable = true;

		NodeTree.removeElement(element.data.uni);

	}
	clearUndoable() {
		this.#undoable = null;
		Site.elements.sitemap.undoable.textContent = '';
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
	}*/
	setURL(element) {
		const url = NodeTree.getPath(element);
		const key = element.data.type == 'page' ? 'page_link' : 'frame_link';
		Site.elements.sitemap[key].href = url;
		Site.elements.sitemap[key].textContent = url;
	}
	loadForm(element) {

		let form;
		let data = structuredClone(element.data);

		if (data.type == 'root') {
			form = Site.elements.sitemap.site;
			data = MapData.site;
		} else {
			form = Site.elements.sitemap[data.type];
		}

		if (data.conditions) {
			data.conditions = data.conditions.replace(';','\n');
		}

		Site.fillForm(form,data);

		form.dataset.lock = MapData.isRequired(element.data.uni);

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
	saveNode(formData) {

		const input = Object.fromEntries(formData);

		if (input.uni) {
			const element = NodeTree.getElement(input.uni);
			switch (true) {
				case input.uni == '':
					Output.live('reject','Uni can\'t be empty',true);
					return false;
				case MapData.isReserved(input.uni):
					Output.live('reject','"'+input.uni+'" is a reserved word and can\'t be used',true);
					return false;
				case element != undefined && element != this.selected:
					Output.live('reject','Uni "'+input.uni+'" already exists as '+element.data.type+' "'+element.data.title+'"',true);
					return false;
				case input.uni != this.selected.data.uni:
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
					Output.live('reject','Path "'+input.path+'" already leads to '+child.data.type+' "'+child.data.title+'"',true);
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

		Output.live('accept','The '+this.selected.data.type+' has been saved!',true);

		return true;

	}
}
