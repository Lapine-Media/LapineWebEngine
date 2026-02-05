
import IO from './io.js';
import { Tools } from './tools.js';
import url from 'url';
import path from 'path';
import JSONC from 'jsonc-simple-parser';

export default new class {
	#data = {
		wrangler: null,
		package: null,
		devvars: null
	}
	#savePaths;
	paths;
	constructor() {

		const file = url.fileURLToPath(import.meta.url);
		const dir = path.join(file,'../../');

		this.paths = {
			lapine: path.dirname(dir),
			project: process.env.PWD,
			pwa: process.env.PWD+'/pwa'
		}
		this.#savePaths = {
			notes: this.paths.project+'/notes.txt',
			manifest: this.paths.pwa+'/data/manifest.webmanifest',
			package: this.paths.project+'/package.json',
			wrangler: this.paths.project+'/wrangler.json',
			devvars: this.paths.project+'/.dev.vars'
		}

	}
	async loadNotes() {
		const paths = [
			this.#savePaths.notes,
			this.paths.lapine+'/notes.txt'
		];
		switch (true) {
			case await Tools.fileExist(paths[0]):
				return await Tools.readFile(paths[0],false);
			default:
				return await Tools.readFile(paths[1],false);
		}
	}
	async loadWrangler() {
		const paths = [
			this.#savePaths.wrangler,
			this.#savePaths.wrangler+'c',
			this.paths.lapine+'/wrangler.json'
		];
		switch (true) {
			case this.#data.wrangler != null:
				IO.log('normal','Reading from cache: '+paths[0],true);
				break;
			case await Tools.fileExist(paths[0]):
				this.#data.wrangler = await Tools.readFile(paths[0],true);
				break;
			case await Tools.fileExist(paths[1]):
				const content = await Tools.readFile(paths[1],false);
				this.#data.wrangler = JSONC.parse(content);
				break;
			default:
				this.#data.wrangler = await Tools.readFile(paths[2],true);
		}
		return this.#data.wrangler;
	}
	async loadPackage() {
		const paths = [
			this.#savePaths.package,
			this.paths.lapine+'/package.json'
		];
		switch (true) {
			case this.#data.package != null:
				IO.log('normal','Reading from cache: '+paths[0],true);
				break;
			case await Tools.fileExist(paths[0]):
				this.#data.package = await Tools.readFile(paths[0],true);
				break;
			default:
				this.#data.package = await Tools.readFile(paths[1],true);
		}
		return this.#data.package;
	}
	async loadManifest() {
		const paths = [
			this.#savePaths.manifest,
			this.paths.lapine+'templates/pwa/data/manifest.webmanifest'
		];
		switch (true) {
			case this.#data.manifest != null:
				IO.log('normal','Reading from cache: '+paths[0],true);
				break;
			case await Tools.fileExist(paths[0]):
				this.#data.manifest = await Tools.readFile(paths[0],true);
				break;
			default:
				this.#data.manifest = await Tools.readFile(paths[1],true);
		}
		return this.#data.manifest;
	}
	async loadDevVars() {
		const paths = [
			this.#savePaths.devvars,
			this.paths.lapine+'/templates/setup/.dev.vars'
		];
		let content;
		switch (true) {
			case this.#data.devvars != null:
				IO.log('normal','Reading from cache: '+paths[0],true);
				return this.#data.devvars;
			case await Tools.fileExist(paths[0]):
				content = await Tools.readFile(paths[0],false);
				break;
			default:
				content = await Tools.readFile(paths[1],false);
		}
		this.#data.devvars = {};
		const lines = content.split('\n');
		const regex = /^([^=#\s]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s#]*))/;
		const method = line => {
			line = line.trim();
			if (!line || line.startsWith('#')) return; // Skip empty lines and comments
			const match = line.match(regex);
			if (match) {
				const key = match[1];
				const value = match[2] || match[3] || match[4] || '';
				this.#data.devvars[key] = value;
			}
		};
		lines.forEach(method);
		return this.#data.devvars;
	}
	patchObject(original,patch) {
		const isObject = item => (item && typeof item === 'object' && !Array.isArray(item));
		const merge = (target,source) => {
			switch (false) {
				case isObject(target):
				case isObject(source):
					return source;
			}
		    for (const key in source) {
		        const targetValue = target[key];
		        const sourceValue = source[key];
				switch (true) {
					case Array.isArray(sourceValue):
						target[key] = [...sourceValue];
						break;
					case isObject(targetValue) && isObject(sourceValue):
						merge(targetValue, sourceValue);
						break;
					default:
						target[key] = sourceValue;
				}
		    }
		    return target;
		}
		return merge(original,patch);
	}
	async saveNotes(content) {
		return Tools.writeFile(this.#savePaths.notes,content);
	}
	async savePackage(data) {
		const object = await this.loadPackage();
		this.patchObject(object,data);
		await Tools.writeFile(this.#savePaths.package,object);
		return this.#data.package = object;
	}
	async saveWrangler(data,patch = false) {
		let object;
		if (patch) {
			object = await this.loadWrangler();
			this.patchObject(object,data);
		} else {
			object = data;
		}
		await Tools.writeFile(this.#savePaths.wrangler,object);
		return this.#data.wrangler = object;
	}
	async saveManifest(data) {
		const response = await this.loadManifest();
		this.#data.manifest = {...response,...data};
		const content = JSON.stringify(data,null,'\t');
		await Tools.writeFile(this.#savePaths.manifest,content);
		return this.#data.manifest;
	}
	async saveDevVars(data) {
		const response = await this.loadDevVars();
		this.#data.devvars = {...response,...data};
		let content = '';
		const entries = Object.entries(this.#data.devvars);
		for (const [key,value] of entries) {
			content += key+'='+value+'\n';
		}
		await Tools.writeFile(this.#savePaths.devvars,content);
		return this.#data.devvars;
	}
	async getAPIToken() {
		if (this.#data.devvars == null) {
			this.#data.devvars = await this.loadDevVars();
		}
		if (!this.#data.devvars.CLOUDFLARE_API_TOKEN) {
			IO.signal('project','missing','apitoken');
		}
		return this.#data.devvars.CLOUDFLARE_API_TOKEN;
	}
	async getAccountID() {
		if (this.#data.wrangler == null) {
			this.#data.wrangler = await this.loadWrangler();
		}
		if (!this.#data.wrangler.account_id) {
			IO.signal('project','missing','accountid');
		}
		return this.#data.wrangler.account_id;
	}
}
