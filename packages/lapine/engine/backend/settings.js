
import IO from './io.js';
import Tools from './tools.js';
import Paths from './paths.js';
import JSONC from 'jsonc-simple-parser';

const Cached = {
	wrangler: null,
	package: null,
	devvars: null
}

export default {
	loadNotes: async function() {
		switch (true) {
			case await Tools.fileExist(Paths.files.notes.working):
				return await Tools.readFile(Paths.files.notes.working,false);
			default:
				return await Tools.readFile(Paths.files.notes.template,false);
		}
	},
	loadWrangler: async function() {
		switch (true) {
			case Cached.wrangler != null:
				IO.log('normal','Reading from cache: '+Paths.files.wrangler.working,true);
				break;
			case await Tools.fileExist(Paths.files.wrangler.working):
				Cached.wrangler = await Tools.readFile(Paths.files.wrangler.working,true);
				break;
			case await Tools.fileExist(Paths.files.wrangler.alternative):
				const content = await Tools.readFile(Paths.files.wrangler.alternative,false);
				Cached.wrangler = JSONC.parse(content);
				break;
			default:
				Cached.wrangler = await Tools.readFile(Paths.files.wrangler.template,true);
		}
		return Cached.wrangler;
	},
	loadPackage: async function() {
		switch (true) {
			case Cached.package != null:
				IO.log('normal','Reading from cache: '+Paths.files.package.working,true);
				break;
			case await Tools.fileExist(Paths.files.package.working):
				Cached.package = await Tools.readFile(Paths.files.package.working,true);
				break;
			default:
				Cached.package = await Tools.readFile(Paths.files.package.template,true);
		}
		return Cached.package;
	},
	loadManifest: async function() {
		switch (true) {
			case Cached.manifest != null:
				IO.log('normal','Reading from cache: '+Paths.files.manifest.working,true);
				break;
			case await Tools.fileExist(Paths.files.manifest.working):
				Cached.manifest = await Tools.readFile(Paths.files.manifest.working,true);
				break;
			default:
				Cached.manifest = await Tools.readFile(Paths.files.manifest.template,true);
		}
		return Cached.manifest;
	},
	loadDevVars: async function() {
		let content;
		switch (true) {
			case Cached.devvars != null:
				IO.log('normal','Reading from cache: '+Paths.files.devvars.working,true);
				return Cached.devvars;
			case await Tools.fileExist(Paths.files.devvars.working):
				content = await Tools.readFile(Paths.files.devvars.working,false);
				break;
			default:
				content = await Tools.readFile(Paths.files.devvars.template,false);
		}
		Cached.devvars = {};
		const lines = content.split('\n');
		const regex = /^([^=#\s]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s#]*))/;
		const method = line => {
			line = line.trim();
			if (!line || line.startsWith('#')) return; // Skip empty lines and comments
			const match = line.match(regex);
			if (match) {
				const key = match[1];
				const value = match[2] || match[3] || match[4] || '';
				Cached.devvars[key] = value;
			}
		};
		lines.forEach(method);
		return Cached.devvars;
	},
	patchObject: function(original,patch) {
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
	},
	saveNotes: async function(content) {
		return Tools.writeFile(Paths.files.notes.working,content);
	},
	savePackage: async function(data) {
		const object = await this.loadPackage();
		this.patchObject(object,data);
		await Tools.writeFile(Paths.files.package.working,object);
		return Cached.package = object;
	},
	saveWrangler: async function(data,patch = false) {
		let object;
		if (patch) {
			object = await this.loadWrangler();
			this.patchObject(object,data);
		} else {
			object = data;
		}
		await Tools.writeFile(Paths.files.wrangler.working,object);
		return Cached.wrangler = object;
	},
	saveManifest: async function(data) {
		const response = await this.loadManifest();
		Cached.manifest = {...response,...data};
		const content = JSON.stringify(data,null,'\t');
		await Tools.writeFile(Paths.files.manifest.working,content);
		return Cached.manifest;
	},
	saveDevVars: async function(data) {
		const response = await this.loadDevVars();
		Cached.devvars = {...response,...data};
		let content = '';
		const entries = Object.entries(Cached.devvars);
		for (const [key,value] of entries) {
			content += key+'='+value+'\n';
		}
		await Tools.writeFile(Paths.files.devvars.working,content);
		return Cached.devvars;
	},
	getAPIToken: async function() {
		if (Cached.devvars == null) {
			Cached.devvars = await this.loadDevVars();
		}
		if (!Cached.devvars.CLOUDFLARE_API_TOKEN) {
			IO.signal('project','missing','apitoken');
		}
		return Cached.devvars.CLOUDFLARE_API_TOKEN;
	},
	getAccountID: async function() {
		if (Cached.wrangler == null) {
			Cached.wrangler = await this.loadWrangler();
		}
		if (!Cached.wrangler.account_id) {
			IO.signal('project','missing','accountid');
		}
		return Cached.wrangler.account_id;
	}
}
