
import { Index,IO,LapineMessage,Settings,SelectItem,ScriptItem,Overlay } from './frontend.js';

export const Project = new class {
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
			case 'missing kits':
				message = new LapineMessage('reject','Missing Kits folder','Please run "Add Kits folder" from the Actions menu first.');
				message.display(true);
				break;
			case 'missing pwa':
				message = new LapineMessage('reject','Missing PWA folder','Please run "Add PWA folder" from the Actions menu first.');
				message.display(true);
				break;
			case 'confirm pwa':
				message = new LapineMessage('inform','Add PWA folder structure','Adds all basic files for a PWA project. No files will be overwritten.');
				signal = IO.getSignal(false,'project','confirm','pwa');
				message.addButton('accept','Proceed',signal);
				message.addButton('reject','Cancel',null);
				message.display(false);
				break;
			case 'confirm kits':
				message = new LapineMessage('inform','Add Kits folder','Adds a folder for Kits. No files will be overwritten. Please read documentation for how to make Kits.');
				signal = IO.getSignal(false,'project','confirm','kits');
				message.addButton('accept','Proceed',signal);
				message.addButton('reject','Cancel',null);
				message.display(false);
				break;
			case 'confirm migrations':
				message = new LapineMessage('inform','Add Migrations folder','Adds a folder for working with D1 migrations. No files will be overwritten.');
				signal = IO.getSignal(false,'project','confirm','migrations');
				message.addButton('accept','Proceed',signal);
				message.addButton('reject','Cancel',null);
				message.display(false);
				break;
			case 'confirm wrangler':
				IO.sendSignal(false,'project','wrangler','version');
				message = new LapineMessage('inform','Update Wrangler','Updates Wrangler to the latest version.');
				signal = IO.getSignal(false,'project','confirm','wrangler');
				message.addButton('accept','Proceed',signal);
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
			case 'added pwa':
				message = new LapineMessage('accept','PWA folder added','Now you can develop a Progressive Web App.');
				message.display(true);
				break;
			case 'added migrations':
				message = new LapineMessage('accept','Migrations folder added','Your project now contains a Migrations folder for D1 development.');
				message.display(true);
				break;
			case 'added kits':
				this.loadKits(event.detail.data);
				message = new LapineMessage('accept','Kits folder added','Your project now contains a Kits folder.');
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
