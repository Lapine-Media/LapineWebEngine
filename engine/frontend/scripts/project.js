
import { Index,IO,ActionItem,ScriptItem } from './frontend.js';

export const Project = new class {
	#initiated = false;
	constructor() {
		window.addEventListener('project',this,false);
	}
	handleEvent(event) {
		switch (event.detail.name+' '+event.detail.value) {
			case 'menu visible':
				if (this.#initiated == false) {
					IO.send('project','load','setup');
				}
				break;
			case 'loaded project':
				this.#initiated = true;
				this.loadedProject(event.detail.data);
				break;
			case 'built kit':
				const message = IO.getMessage('accept','Success!','The kit has been built.');
				message.display(true);
				break;
			default:
				switch (event.detail.name) {
					case 'action':
						console.log('Action:',event.detail.value);
						break;
					case 'script':
						console.log('Script:',event.detail.value);
						break;
					case 'build':
						IO.send('project','build',event.detail.value);
						break;
					default:
						console.log(event.type,event.detail);
				}
		}
	}
	loadedProject(data) {
		console.log(data);
		const actions = [
			['update','Update Lapine Web Engine'],
			['project','Install / repair project files'],
			['prefix','Scan all CSS and add vendor prefixes'],
			['hashes','Create content hashes'],
			['icons','Make icon sizes'],
			['audit','Audit site']
		];

		Index.elements.project.project_title.textContent = data.package.name;
		Index.elements.project.project_version.textContent = data.package.version;
		Index.elements.project.project_description.textContent = data.package.description;
		Index.elements.project.notes.value = data.notes;

		for (const [value,data] of actions) {
			const element = new ActionItem('project','action',value,data);
			Index.elements.project.project_actions.append(element);
		}

		const scripts = Object.entries(data.package.scripts);
		for (const [value,data] of scripts) {
			const element = new ScriptItem('project','script',value,data);
			Index.elements.project.project_scripts.append(element);
		}

		for (const name of data.kits) {
			const element = new ActionItem('project','build',name,name);
			Index.elements.project.kit_list.append(element);
		}

	}
}
