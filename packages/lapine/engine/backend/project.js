
import IO from './io.js';
import Settings from './settings.js';
import Paths from './paths.js';
import Tools from './tools.js';
import Scripts from './scripts.js';

const helpers = {
	loadProject: async function() {
		const promises = [
			await Settings.loadPackage(),
			await Settings.loadWrangler(),
			await Settings.loadNotes(),
			await Tools.readDirectory(Paths.folders.kits.working,true,false)
		]

		const [pack,wrangler,notes,kits] = await Promise.all(promises);
		const loaded = {package:pack,wrangler,notes,kits};
		const list = [];

		for (const file of loaded.kits) {
			switch (true) {
				case file.name.startsWith('.'):
				case file.name.startsWith('_'):
					break;
				case file.isDirectory():
					list.push(file.name);
			}
		}

		loaded.kits = list;

		return loaded;
	},
	mergeFramework: async function(context) {

		const base = '/Users/frankichiro/Projects/repositories/Lapine-Media';
		const source = base+'/LapineWebEngine/packages/lapine/framework/'+context;
		const maps = base+'/LapineDemoProject/frontend/data/sourcemaps/'+context+'.js.map';
		let target;
		if (context == 'backend') {
			target = base+'/LapineDemoProject/backend';
		} else {
			target = base+'/LapineDemoProject/frontend/scripts';
		}


		//const source = Paths.folders.framework[context].source;
		//const target = Paths.folders.framework[context].target;
		//const maps = Paths.join(Paths.folders.data.template,'sourcemaps',context+'.js.map');

		const path = Paths.join(target,context);
		const merged = await Scripts.mergeJS(source,'../data/sourcemaps/'+context+'.js.map',true);
		const size = await Tools.writeFile(path+'.js',merged.code);
		await Tools.writeFile(maps,merged.map);
		const from = Tools.formatFileSize(merged.size);
		const to = Tools.formatFileSize(size);
		const percent = Tools.compareFileSize(merged.size,size);
		IO.console('inform', 'Merged '+merged.count+' files of '+from+' into '+to+' (reduced to '+percent+'%)');
	},
	buildKit: async function(kitName) {

		if (kitName == '') {
			IO.log('reject','No kits found.');
			IO.log('line');
			return;
		}

		IO.log('accept','Building kit "'+kitName+'"...');

		Tools.ensureDirectory(Paths.folders.kits.working);
		Tools.ensureDirectory(Paths.folders.kits.frontend);

		IO.log('accept','Creating file list');
		const kitDirectory = Paths.join(Paths.folders.kits.working,kitName);
		const mimes = Object.values(Tools.mimes);
		const files = await Tools.readDirectory(kitDirectory,true,true);
		const object = {
			scripts: [],
			templates: '',
			assets: {},
			data: {},
			comments: []
		};
		let startSize = 0;
		let count = 0;

		if (files.length == 0) {
			IO.log('reject','No files found.');
			IO.log('line');
			return;
		}

		IO.log('accept','Creating objects');
		for (const file of files) {
			const filePath = Paths.join(file.parentPath,file.name);
			const data = await Tools.fileData(filePath);
			switch (true) {
				case file.name.startsWith('.'):
				case file.name.startsWith('_'):
					IO.log('danger', 'Ignoring ' + file.name);
					continue;
				case mimes.includes(data.mime) == false:
					IO.log('reject', 'Not allowed: ' + file.name);
					continue;
			}
			const json = data.mime == 'application/json';
			let content = await Tools.readFile(filePath,json,false);
			switch (data.mime) {
				case 'text/javascript':
					break;
				case 'text/plain':
			        const separator = '/'.repeat(78 - file.name.length);
					object.comments.push(file.name+' '+separator,content);
					break;
				case 'text/html':
					object.templates += content;
					break;
				case 'application/json':
					object.data[file.name] = content;
					break;
				case 'image/svg+xml':
					object.templates += this.getSVG(file.name,content);
					break;
				case 'text/css':
					content = await Scripts.cleanCSS(content);
				default:
					object.assets[file.name] = {
			            mime: data.mime,
			            data: content
			        };
			}

			startSize += data.size;
			count += 1;

		}

		const filePaths = {
			code: Paths.join(Paths.folders.kits.frontend,kitName+'.kit.gzip'),
			comments: Paths.join(Paths.folders.kits.frontend,kitName+'.txt'),
			map: Paths.join(Paths.folders.data.working,'sourcemaps',kitName+'.kit.map')
		}

		IO.log('accept', 'Merging scripts');
		const merged = await Scripts.mergeJS(kitDirectory,'::/'+kitName+'.kit.map');
		object.scripts = merged.code;
		object.constructors = merged.constructors;

		IO.log('accept', 'Saving sourcemap');
		await Tools.writeFile(filePaths.map,merged.map);

		IO.log('accept', 'Minifying templates');
		object.templates = await Scripts.minifyHTML(object.templates);

		if (object.comments.length > 0) {
			IO.log('inform','Saving comments in target folder');
			const comments = object.comments.join('\n');
			await Tools.writeFile(filePaths.comments,comments);
		}

		delete object.comments;

		IO.log('accept','Saving compressed kit in target folder');
		const endSize = await Tools.writeFile(filePaths.code,object,true);
		const from = Tools.formatFileSize(startSize);
		const to = Tools.formatFileSize(endSize);
		const percent = Tools.compareFileSize(startSize,endSize);

		IO.log('inform','Created '+filePaths.code,true);
		IO.log('inform','Bundled '+count+' files, '+from+' to '+to+' (compressed to '+percent+'%)');
		IO.signal('project','built','kit');
		IO.log('accept','Done!');

	},
	getSVG: function(fileName,content) {
        const styles = [];
        let counter = -1;

		const methods = {
            collectStyles: (match, styleValue) => {
                styles.push(styleValue);
                return 'class="style' + styles.length + '"';
            },
            addStyles: (style, index) => '.style' + index + ' {' + style + '}',
            addParts: (match, tagName, rest) => {
                counter++;
                return '<' + tagName + ' part="part' + counter + '"' + rest;
            }
        };

        content = content.replace(/<\?xml[^>]*\?>|<!DOCTYPE[^>]*>/g, '');
        content = content.replace(/\sid="([^"]+)"/g, ' part="$1"');
        content = content.replace(/\sstyle="([^"]+)"/g, methods.collectStyles);
        content = content.replace(/<(path|circle|rect)(\s|>)/g, methods.addParts);

        const css = styles.map(methods.addStyles).join(' ');

        return [
            '<template id="' + fileName + '.svg">',
            '<style>' + css + '</style>',
            content,
            '</template>'
        ].join('');
    }
}

export default async function(name,value,data,id) {
	try {
		let response;
		switch (name+' '+value) {
			case 'compile framework':
				IO.console('begin');
				IO.console('normal','Compiling framework...');
				await helpers.mergeFramework('backend');
				IO.console('line');
				await helpers.mergeFramework('frontend');
				IO.console('normal','Done!');
				IO.console('end');
				break;
			case 'load setup':
				IO.log('accept','Loading project data...');
				const project = await helpers.loadProject();
				IO.signal('project','project','loaded',project);
				IO.log('accept','Done!');
				IO.log('line');
				break;
			case 'load '+value:
				IO.log('accept','Loading '+value+' settings...');
				switch (value) {
					case 'package':
						response = await Settings.loadPackage();
						break;
					case 'wrangler':
						response = await Settings.loadWrangler();
						break;
					case 'devvars':
						response = await Settings.loadDevVars();
						break;
				}
				IO.signal(id,value,'loaded',response);
				IO.log('accept','Done!');
				IO.log('line');
				break;
			case 'save notes':
				IO.log('accept','Saving notes...');
				await Settings.saveNotes(data.notes),
				IO.signal('project','notes','saved');
				IO.log('accept','Done!');
				IO.log('line');
				break;
			case 'save '+value:
				IO.log('accept','Saving settings...');
				switch (value) {
					case 'package':
						response = await Settings.savePackage(data);
						break;
					case 'wrangler':
						response = await Settings.saveWrangler(data);
						break;
					case 'devvars':
						response = await Settings.saveDevVars(data);
						break;
				}
				IO.signal(id,value,'saved',response);
				IO.log('accept','Done!');
				IO.log('line');
				break;
			case 'confirm project':
				IO.log('accept','Mending project...');
				await Tools.cloneDirectory(Paths.folders.project.template,Paths.folders.project.working,false);
				IO.log('accept','Done!');
				IO.log('line');
				break;
			case 'confirm wrangler':
				if (data == 'version') {
					IO.log('accept','Checking Wrangler version...');
					response = await IO.spawn('npx wrangler -v');
					IO.log('inform','Current Wrangler version: '+response);
				} else {
					IO.log('accept','Updating Wrangler...');
					response = await IO.spawn('npm install wrangler --save-dev');
					if (response) {
						IO.signal('project','wrangler','updated');
					}
				}
				IO.log('accept','Done!');
				IO.log('line');
				break;
			case 'build '+value:
				helpers.buildKit(value);
				IO.log('line');
				break;
			case 'action '+value:
				IO.signal('project','confirm',value);
				break;
			default:
				IO.log('accept','Performing action...');
				IO.log('normal',name+' '+value);
				IO.log('accept','Done!');
				IO.log('line');
		}
	} catch (error) {
		throw error;
	}
}
