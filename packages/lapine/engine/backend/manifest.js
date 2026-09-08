
import IO from './io.js';
import Paths from './paths.js';
import Tools from './tools.js';

const methods = {
	loadManifest: async function() {
		let content = await Tools.readFile(Paths.files.manifest.working,true,false,false);
		if (content === false) {
			IO.log('danger','Manifest not found, loading default template...');
			content = await Tools.readFile(Paths.files.manifest.template,true,false);
		}
		return content;
	},
	saveManifest: async function(data) {
		const json = JSON.stringify(data,null,'\t');
		await Tools.writeFile(Paths.files.manifest.working,json,false);
	},
	saveProtocols: function(manifest,data) {
		try {
			const parse = (string, fieldName) => {
				if (!string || typeof string !== 'string') return [];
				const lines = string.split('\n');
				const results = [];
				for (const line of lines) {
					if (!line.trim()) continue;
					const match = line.match(/^([^:\n]+):\s*(.+)$/);
					if (!match) {
						throw new Error('This line for '+fieldName+' is not correct:<code>'+line+'</code>');
					}
					const object = fieldName === 'files' ? {
							name: match[1].trim(),
							accept: match[2].trim().split(/\s+/)
						} : {
							protocol: match[1].trim(),
							url: match[2].trim()
					};
					results.push(object);
				}
				return results;
			};
			manifest.protocol_handlers = parse(data.handlers,'handlers');
			manifest.share_target = {
				action: data.action,
				method: data.method,
				enctype: data.enctype,
				params: {
					title: data.title,
					text: data.text,
					url: data.url,
					files: parse(data.files,'files')
				}
			}
			return manifest;
		} catch (error) {
			IO.signal('manifest','saved','error',error.message);
			throw new Error('The manifest has not be saved due to errors.');
		}
	},
	removeImages: async function(data,shortcuts) {
		IO.log('normal','Removing images...');
		if (data) {
			const promises = [];
			const loop = list => {
				for (const entry of list) {
					const src = entry.src.replace('./graphics',Paths.folders.graphics.working);
					const promise = Tools.removeFile(src);
					promises.push(promise);
				}
			}
			if (shortcuts) {
				for (const entry of data) {
					if (entry.icons && Array.isArray(entry.icons)) {
						loop(entry.icons);
					}
				}
			} else {
				loop(data);
			}
			await Promise.all(promises);
		} else {
			IO.log('normal','No images to remove.');
		}
	},
	filterKeys: function(entry,allowed) {
		const entries = Object.entries(entry);
		const object = {};
		for (const [key,value] of entries) {
			if (allowed.includes(key)) {
				object[key] = value;
			}
		}
		return object;
	},
	getInputBuffer: function(dataURL) {
		const base64Data = dataURL.split(',')[1];
		return Buffer.from(base64Data,'base64');
	},
	makeIcons: async function(sizes,inputBuffer,prefix,background) {
		const list = [];
		const save = size => {
			const file = prefix+'-'+size+'.png';
			const path = Paths.join(Paths.folders.graphics.working,'pwa',file);
			const icon = {
				sizes: size+'x'+size,
				src: './graphics/pwa/'+file,
				type: 'image/png',
				purpose: size <= 48 ? 'any' : size >= 192 ? 'maskable' : 'any maskable'
			}
			list.push(icon);
			return Tools.saveImage(inputBuffer,path,icon.type,size,size,background);
		};
		const promises = sizes.map(save);
		await Promise.all(promises);
		return list;
	},
	saveIcons: async function(data) {
		const file = JSON.parse(data);
		const inputBuffer = this.getInputBuffer(file.src);
		const sizes = [512,192,180,144,32,16];
		const list = await this.makeIcons(sizes,inputBuffer,'icon',file.fill);
		let path;
		if (file.type == 'image/svg+xml') {
			const svg = inputBuffer.toString('utf-8');
			path = Paths.join(Paths.folders.graphics.working,'favicon.svg');
			await Tools.writeFile(path,svg);
		} else {
			path = Paths.join(Paths.folders.graphics.working,'favicon.png');
			await Tools.saveImage(inputBuffer,path,'image/png',16,16);
		}
		return list;
	},
	saveShortcuts: async function(data) {
		const list = JSON.parse(data);
		const promises = [];
		const allowed = ['name','short_name','url','icons'];
		const sizes = [192,96];
		for (let i = 0; i < list.length; i += 1) {
			const entry = list[i];
			if (entry.icons) {
				const inputBuffer = this.getInputBuffer(entry.icons.src);
				entry.icons = await this.makeIcons(sizes,inputBuffer,'shortcut-'+i,entry.icons.fill);
			}
			list[i] = this.filterKeys(entry,allowed);
		}
		await Promise.all(promises);
		return list;
	},
	saveScreenshots: async function(data) {
		const list = JSON.parse(data);
		const promises = [];
		const allowed = ['src','type','sizes','form_factor','label','platform'];
		const type = 'image/webp';
		for (let i = 0; i < list.length; i += 1) {
			const entry = list[i];
			const base64Data = entry.src.split(',')[1];
			const inputBuffer = Buffer.from(base64Data,'base64');
			const path = Paths.join(Paths.folders.graphics.working,'pwa','screenshot-'+(i+1)+'.webp');
			let [width,height] = entry.sizes.split('x');
			width = parseInt(width);
			height = parseInt(height);
			const promise = Tools.saveImage(inputBuffer,path,type,width,height,entry.fill,80);
			promises.push(promise);
			entry.src = '.'+path;
			entry.type = type;
			list[i] = this.filterKeys(entry,allowed);
		}
		await Promise.all(promises);
		return list;
	}
}

export default async function(name,value,data,id) {
	try {
		let manifest;
		switch (name+' '+value) {
			case 'load settings':
				IO.log('accept','Loading manifest...');
				manifest = await methods.loadManifest();
				console.log(id,'loaded','success');
				console.log(manifest);
				IO.signal(id,'loaded','success',manifest);
				IO.log('accept','Done!');
				IO.log('line');
				break;
			case 'save information':
				IO.log('accept','Saving manifest information...');
				manifest = await methods.loadManifest();
				manifest = {...manifest, ...data};
				manifest.categories = data.categories ? data.categories.split(/, ?/) : [];
				await methods.saveManifest(manifest);
				IO.signal('manifest','saved','success');
				IO.log('accept','Done!');
				IO.log('line');
				break;
			case 'save appearance':
				IO.log('accept','Saving manifest appearance...');
				manifest = await methods.loadManifest();
				manifest = {...manifest, ...data};
				await methods.saveManifest(manifest);
				IO.signal('manifest','saved','success');
				IO.log('accept','Done!');
				IO.log('line');
				break;
			case 'save urls':
				IO.log('accept','Saving manifest URLs...');
				manifest = await methods.loadManifest();
				manifest = {...manifest, ...data};
				await methods.saveManifest(manifest);
				IO.signal('manifest','saved','success');
				IO.log('accept','Done!');
				IO.log('line');
				break;
			case 'save protocols':
				IO.log('accept','Saving manifest protocols...');
				manifest = await methods.loadManifest();
				manifest = methods.saveProtocols(manifest,data);
				await methods.saveManifest(manifest);
				IO.signal('manifest','saved','success');
				IO.log('accept','Done!');
				IO.log('line');
				break;
			case 'save shortcuts':
				if (data.shortcuts) {
					IO.log('accept','Saving manifest shortcuts...');
					manifest = await methods.loadManifest();
					await methods.removeImages(manifest.shortcuts,true);
					manifest.shortcuts = await methods.saveShortcuts(data.shortcuts);
					await methods.saveManifest(manifest);
					IO.signal('manifest','saved','success');
					IO.log('accept','Done!');
					IO.log('line');
				}
				break;
			case 'save icons':
				if (data.icons) {
					IO.log('accept','Saving manifest icons...');
					manifest = await methods.loadManifest();
					await methods.removeImages(manifest.icons,false);
					manifest.icons = await methods.saveIcons(data.icons);
					await methods.saveManifest(manifest);
					IO.signal('manifest','saved','success');
					IO.log('accept','Done!');
					IO.log('line');
				}
				break;
			case 'save screenshots':
				if (data.screenshots) {
					IO.log('accept','Saving manifest screenshots...');
					manifest = await methods.loadManifest();
					await methods.removeImages(manifest.screenshots,false);
					manifest.screenshots = await methods.saveScreenshots(data.screenshots);
					await methods.saveManifest(manifest);
					IO.signal('manifest','saved','success');
					IO.log('accept','Done!');
					IO.log('line');
				}
				break;
			default:
				console.log(name,value,data);
		}
	} catch (error) {
		IO.log('reject',error.message);
		IO.log('line');
	}
}
