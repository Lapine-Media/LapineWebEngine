
import { Site,IO,LapineMessage,SelectItem,ScriptItem,Overlay } from '../frontend.js';

export const Project = new class {
	wrangler = null;
	constructor() {
		window.addEventListener('load',this,false);
		window.addEventListener('project',this,false);
	}
	async handleEvent(event) {
		event.preventDefault();
		switch (event.type) {
			case 'load':
				await Site.ready;
				IO.sendSignal(false,'project','load','setup');
				break;
			case 'project':
				const {name,value,data} = event.detail;
				this.action(name,value,data);
				break;
		}
	}
	async action(name,value,data) {
		try {
			let signal;
			switch (name+' '+value) {
				case 'project loaded':
					this.wrangler = data.wrangler;
					this.updateProject(data.package);
					this.updateNotes(data.notes);
					this.updateScripts(data.package);
					this.updateKits(data.kits);
					break;
				case 'edit '+value:
					signal = response => {
						const open = () => this.viewSettings(response.data,response.name);
						Overlay.open('Project settings','/markup/project/'+response.name+'.html',open);
					}
					IO.sendSignal(false,'project','load',value,null,signal);
					break;
				default:
					console.log(name,value,data);
			}
		} catch (error) {
			console.log(error);
		}
	}
	updateProject(data) {
		Site.elements.project.project_title.textContent = data.name;
		Site.elements.project.project_version.textContent = data.version;
		Site.elements.project.project_description.textContent = data.description;
	}
	updateNotes(data) {
		Site.elements.project.notes.value = data;
	}
	updateScripts(data) {
		const fragment = document.createDocumentFragment();
		const scripts = Object.entries(data.scripts);
		for (const [value,data] of scripts) {
			const element = new ScriptItem('project','script',value,data);
			fragment.append(element);
		}
		Site.clearElement(Site.elements.project.project_scripts,fragment);
	}
	updateKits(data) {
		const element = new SelectItem();
		element.name = 'build';
		for (const value of data) {
			element.addItem(value,value);
		}
		Site.clearElement(Site.elements.project.kit_list,element);
	}
	viewSettings(data,version) {
		const form = Site.elements.overlay.project_settings;
		if (version == 'package') {
			const scripts = Object.entries(data.scripts);
			const lines = [];
			for (const [name,script] of scripts) {
				lines.push(name+': '+script);
			}
			data.scripts = lines.join('\n');
			data.keywords = Array.isArray(data.keywords) ? data.keywords.join(', ') : [];
		}
		for (const input of form.elements) {
			const value = data[input.name];
			if (value ? true : false) {
				input.value = Array.isArray(value) ? value.join(', ') : value;
			}
		}
	}
	getEnvironments() {
		const env = this.wrangler.env ? Object.keys(this.wrangler.env) : [];
		return {
			list: ['top',...env],
			scope: environment => environment === 'top' ? this.wrangler : this.wrangler.env[environment]
		}
	}
}

/*export const Project = new class {
	#initiated = false;
	constructor() {
		window.addEventListener('project',this,false);
	}
	handleEvent(event) {
		let message,signal;
		switch (event.detail.name+' '+event.detail.value) {
			case 'menu visible':
				if (this.#initiated == false) {
					IO.sendSignal(false,'project','load','setup');
				}
				break;
			case 'loaded project':
				this.#initiated = true;
				this.loadedProject(event.detail.data);
				break;
			case 'package edit':
			case 'wrangler edit':
			case 'devvars edit':
				IO.sendSignal(false,'project','load',event.detail.name,null);
				break;
			case 'package loaded':
			case 'wrangler loaded':
			case 'devvars loaded':
				signal = () => this.viewSettings(event.detail.data,event.detail.name);
				Overlay.open('Project settings','/markup/settings_'+event.detail.name+'.html',signal);
				break;
			case 'package save':
			case 'wrangler save':
			case 'devvars save':
				const data = this.saveSettings(event.detail.data,event.detail.name);
				IO.sendSignal(false,'project','save',event.detail.name,data);
				break;
			case 'package saved':
			case 'wrangler saved':
			case 'devvars saved':
				Overlay.close();
				message = new LapineMessage('accept','Success!','The settings have been updated.');
				message.display(true);
				switch (event.detail.name) {
					case 'package':
						this.packageUpdate(event.detail.data);
						break;
					case 'wrangler':
						Settings.wrangler = event.detail.data;
				}
				break;
			case 'built kit':
				message = new LapineMessage('accept','Success!','The kit has been built.');
				message.display(true);
				break;
			case 'confirm project':
				message = new LapineMessage('inform','Repair project','This will re-add missing files and folders. Existing files and folders will NOT be replaced.');
				signal = IO.getSignal(false,'project','confirm','project');
				message.addButton('accept','Proceed',signal);
				message.addButton('reject','Cancel',null);
				message.display(false);
				break;
			case 'confirm wrangler':
				message = new LapineMessage('inform','Update Wrangler','Check current Wrangler version, or update Wrangler to the latest version.');
				signal = context => IO.sendSignal(false,'project','confirm','wrangler',context[0]);
				message.addButton('accept','Check version',signal,'version');
				message.addButton('accept','Update',signal,'update');
				message.addButton('reject','Cancel',null);
				message.display(false);
				break;
			case 'notes saved':
				message = new LapineMessage('accept','Notes saved','Your notes have been saved into /notes.txt');
				message.display(true);
				break;
			case 'wrangler updated':
				message = new LapineMessage('accept','Wrangler updated!','You are now running the latest version of Wrangler.');
				message.display(true);
				break;
			case 'script '+event.detail.value:
				console.log('Script:',event.detail.value,event.detail.data);
				break;
			case 'missing apitoken':
				message = new LapineMessage('reject','Missing Cloudflare API token','You need an API token in order to connect to Cloudflare.');
				signal = IO.getSignal(true,'project','devvars','edit');
				message.addButton('accept','Add token',signal);
				message.addButton('reject','Cancel',null);
				message.display(false);
				break;
			case 'missing accountid':
				message = new LapineMessage('reject','Missing Cloudflare Account ID','You need an Account ID in order to connect to Cloudflare.');
				signal = IO.getSignal(true,'project','wrangler','edit');
				message.addButton('accept','Add ID',signal);
				message.addButton('reject','Cancel',null);
				message.display(false);
				break;
			default:
				IO.sendSignal(false,'project',event.detail.name,event.detail.value,event.detail.data);
		}
	}
	loadedProject(data) {

		Settings.wrangler = data.wrangler;

		this.packageUpdate(data.package);
		this.loadKits(data.kits);

		Index.elements.project.notes.value = data.notes;

	}
	packageUpdate(data) {

		Index.elements.project.project_title.textContent = data.name;
		Index.elements.project.project_version.textContent = data.version;
		Index.elements.project.project_description.textContent = data.description;

		Index.update(Index.elements.project.project_scripts,null);

		const scripts = Object.entries(data.scripts);
		for (const [value,data] of scripts) {
			const element = new ScriptItem('project','script',value,data);
			Index.elements.project.project_scripts.append(element);
		}

	}
	loadKits(kits) {
		const element = new SelectItem();
		element.name = 'build';
		for (const value of kits) {
			element.addItem(value,value);
		}
		Index.update(Index.elements.project.kit_list,element);
	}
	fillForm(form,data) {
		for (const input of form.elements) {
			const value = data[input.name];
			if (value ? true : false) {
				input.value = Array.isArray(value) ? value.join(', ') : value;
			}
		}
	}
	viewSettings(data,version) {
		const form = document.forms.project_settings;
		if (version == 'package') {
			const scripts = Object.entries(data.scripts);
			const lines = [];
			for (const [name,script] of scripts) {
				lines.push(name+': '+script);
			}
			data.scripts = lines.join('\n');
			data.keywords = Array.isArray(data.keywords) ? data.keywords.join(', ') : [];
		}
		this.fillForm(form,data);
	}
	saveSettings(data,version) {
		if (version == 'package') {
			const lines = data.scripts.split('\n');
			const result = {};
			for (const line of lines) {
				if (!line.trim()) continue;
				const match = line.match(/^([^:\n]+):\s*(.+)$/);
				if (match) {
					const key = match[1].trim();
					result[key] = match[2].trim();
				}
			}
			data.scripts = result;
			data.keywords = data.keywords.split(/, ?/);
		}
		return data;
	}
}
*/
