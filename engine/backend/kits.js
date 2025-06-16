
import IO from './io.js';
import { Tools,Cleanup,Scripts } from './tools.js';
import { default as Path } from 'path';
import fs from 'fs/promises';

export const Package = {
	kit: {
		scripts: [],
		templates: '',
		assets: {},
		data: {},
		comments: []
	},
	getObjects: function(files) {
		const promise = async (resolve,reject) => {
			try {
				const promises = [];
				const methods = {
					'.txt': this.getText.bind(this),
					'.html': this.getTemplate.bind(this),
					'.js': this.getScript.bind(this),
					'.css': this.getAsset.bind(this),
					'.json': this.getData.bind(this),
					'.svg': this.getSVG.bind(this)
				};
				for (const file of files) {
					const method = methods[file.type] || this.getAsset.bind(this);
					const promise = method(file);
					promises.push(promise);
				}
				await Promise.all(promises);
				resolve(this.kit);
			} catch (error) {
				reject(error);
			}
		}
		return new Promise(promise);
	},
	getAsset: function(file) {
		const promise = async (resolve,reject) => {
			try {
				this.kit.assets[file.name+file.type] = {
					mime: file.mime,
					data: await Tools.readFile(file.path,false,false)
				};
				resolve(true);
			} catch (error) {
				reject(error);
			}
		}
		return new Promise(promise);
	},
	getText: function(file) {
		const promise = async (resolve,reject) => {
			try {
				const content = await Tools.readFile(file.path,false,false);
				const separator = '/'.repeat(78-file.name.length);
				this.kit.comments.push(file.name+' '+separator,content);
				resolve(true);
			} catch (error) {
				reject(error);
			}
		}
		return new Promise(promise);
	},
	getTemplate: function(file) {
		const promise = async (resolve,reject) => {
			try {
				this.kit.templates += await Tools.readFile(file.path,false,false);
				resolve(true);
			} catch (error) {
				reject(error);
			}
		}
		return new Promise(promise);
	},
	getScript: function(file) {
		this.kit.scripts.push(file.path);
		return Promise.resolve(true);
	},
	getData: function(file) {
		const promise = async (resolve,reject) => {
			try {
				this.kit.data[file.name] = await Tools.readFile(file.path,true,false);
				resolve(true);
			} catch (error) {
				reject(error);
			}
		}
		return new Promise(promise);
	},
	getSVG: function(file) {
		const promise = async (resolve,reject) => {
			try {
				const styles = [];
				let counter = -1;
				const methods = {
					collectStyles: (match,styleValue) => {
						styles.push(styleValue);
						return 'class="style'+styles.length+'"';
					},
					addStyles: (style, index) => '.style'+index+' {'+style+'}',
					addParts: (match, tagName, rest) => {
						counter++;
						return '<'+tagName+' part="part'+counter+'"'+rest;
					}
				}

				let content = await Tools.readFile(file.path,false,false);
				content = content.replace(/<\?xml[^>]*\?>|<!DOCTYPE[^>]*>/g,''); // Remove <?xml and <!DOCTYPE tags
				content = content.replace(/\sid="([^"]+)"/g,' part="$1"'); // Rename all "id" attributes to "part"
				content = content.replace(/\sstyle="([^"]+)"/g,methods.collectStyles); // Collect "style" attributes and replace them with "class"
				content = content.replace(/<(path|circle|rect)(\s|>)/g,methods.addParts); // Add a "part" attribute to path, circle, and rect tags

				const css = styles.map(methods.addStyles).join(' '); // Generate CSS from the collected styles

				this.kit.templates += [
					'<template id="'+file.name+'.svg">',
					'<style>'+css+'</style>',
					content,
					'</template>'
				].join('');

				resolve(true);
			} catch (error) {
				reject(error);
			}
		}
		return new Promise(promise);
	}
}

export const Builder = {
	stats: {
		count: 0,
		size: 0
	},
	getFileList: function(source) {
		const promise = async (resolve,reject) => {
			try {
				let list = [];
				const files = await Tools.readDirectory(source,true);
				for (const file of files) {
					const path = source+'/'+file.name;
					switch (true) {
						case file.name.startsWith('.'):
						case file.name.startsWith('_'):
							IO.log('danger','(Ignoring '+file.name+')');
							continue;
						case file.isDirectory():
							const directory = await this.getFileList(path);
							list = list.concat(directory);
							break;
						default:
							const data = await Tools.fileData(path);
							this.stats.count += 1;
							this.stats.size += data.size;
							if (data.mime == undefined) {
								IO.log('reject','Not allowed: '+data.path,true);
							} else {
								IO.log('normal',data.path,true);
								list.push(data);
							}
					}
				}
				resolve(list);
			} catch (error) {
				reject(error);
			}
		}
		return new Promise(promise);
	},
	compileKit: function(kit) {
		const promise = async (resolve,reject) => {
			try {

				IO.log('normal','Merging scripts');
				kit.scripts = await Scripts.mergeScripts(kit.scripts);

				IO.log('normal','Minifying scripts');
				kit.scripts = await Cleanup.js(kit.scripts);

				IO.log('normal','Minifying styles');
				const assets = Object.entries(kit.assets);
				for (const [key,value] of assets) {
					if (value.mime == 'text/css') {
						kit.assets[key] = await Cleanup.css(value.data);
					}
				}

				IO.log('normal','Minifying templates');
				kit.templates = Cleanup.html(kit.templates);

				IO.log('normal','Compressing kit');
				kit = JSON.stringify(kit);
				kit = await Tools.compress(kit);

				resolve(kit);
			} catch (error) {
				reject(error);
			}
		}
		return new Promise(promise);
	}
}
