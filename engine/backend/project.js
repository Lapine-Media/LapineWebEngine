
import IO from './io.js';
import Settings from './settings.js';
import { Tools } from './tools.js';
import { Package,Builder } from './kits.js';

const paths = {
	pwa: {
		lapine: Settings.paths.lapine+'/templates/pwa',
		project: Settings.paths.project+'/pwa'
	},
	kits: {
		lapine: Settings.paths.lapine+'/templates/kits',
		project: Settings.paths.project+'/kits',
		pwa: Settings.paths.pwa+'/kits'
	},
	migrations: {
		lapine: Settings.paths.lapine+'/templates/migrations',
		project: Settings.paths.project+'/migrations'
	},
	setup: Settings.paths.lapine+'/templates/setup'
}

const methods = {
	folderExist: async function(path,name) {
		const exist = await Tools.fileExist(path);
		if (!exist) {
			IO.signal('project','missing',name);
			return false;
		}
		return true;
	}
}

export default async function(name,value,data) {
	try {
		let response;
		switch (name+' '+value) {
			case 'cli setup':
				IO.console('begin');
				IO.console('header','Running setup...');
				response = await Settings.loadPackage();
				if (response.devDependencies.wrangler == undefined) {
					IO.console('header','Installing Wrangler...');
					const output = await IO.execute('npm install wrangler --save-dev');
					IO.console('log',output);
					IO.console('accept','Installation complete!');
				}
				IO.console('header','Adding default files...');
				await Tools.cloneDirectory(paths.setup,Settings.paths.project);
				IO.console('header','Done!');
				IO.console('end');
				break;
			case 'load setup':
				IO.log('accept','Loading project data...');

				const promises = [
					await Settings.loadPackage(),
					await Settings.loadWrangler(),
					await Settings.loadNotes(),
					await Tools.readDirectory(paths.kits.project,true,false)
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

				IO.signal('project','loaded','project',loaded);
				IO.log('accept','Done!');
				IO.log('line');
				break;
			case 'load package':
			case 'load wrangler':
			case 'load devvars':
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
				IO.signal('project',value,'loaded',response);
				IO.log('accept','Done!');
				IO.log('line');
				break;
			case 'save package':
			case 'save wrangler':
			case 'save devvars':
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
				}
				IO.signal('project',value,'saved',response);
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
			case 'confirm pwa':
				IO.log('accept','Adding PWA folder...');
				await Tools.cloneDirectory(paths.pwa.lapine,paths.pwa.project);
				IO.signal('project','added','pwa');
				IO.log('accept','Done!');
				IO.log('line');
				break;
			case 'confirm kits': {
				if (await methods.folderExist(paths.kits.pwa,'pwa') == false) return;
				IO.log('accept','Adding Kits folder...');
				await Tools.cloneDirectory(paths.kits.lapine,paths.kits.project);
				response = await Tools.readDirectory(paths.kits.project,true,false);
				IO.signal('project','added','kits',response);
				IO.log('accept','Done!');
				IO.log('line');
			} break;
			case 'confirm migrations':
				if (await methods.folderExist(paths.kits.pwa,'pwa') == false) return;
				IO.log('accept','Adding Migrations folder...');
				await Tools.cloneDirectory(paths.migrations.lapine,paths.migrations.project);
				IO.signal('project','added','migrations');
				IO.log('accept','Done!');
				IO.log('line');
				break;
			case 'confirm wrangler':
				IO.log('accept','Updating Wrangler...');
				response = await IO.spawn('npm install wrangler --save-dev');
				if (response) {
					IO.signal('project','wrangler','updated');
				}
				IO.log('accept','Done!');
				IO.log('line');
				break;
			case 'wrangler version':
				IO.log('accept','Checking Wrangler version...');
				await IO.execute('npx wrangler -v');
				IO.log('accept','Done!');
				IO.log('line');
				break;
			case 'build '+value:
				if (await methods.folderExist(paths.kits.project,'kits') == false) return;
				if (await methods.folderExist(paths.kits.pwa,'pwa') == false) return;

				IO.log('accept','Building kit "'+value+'"...');
				IO.log('accept','Creating file list');
				const files = await Builder.getFileList(paths.kits.project+'/'+value);

				IO.log('accept','Creating objects from files');
				const objects = await Package.getObjects(files);

				if (objects.comments.length > 0) {
					IO.log('inform','Saving comments in target folder');
					const comments = objects.comments.join('\n');
					const path = paths.kits.pwa+'/'+value+'.txt';
					await Tools.writeFile(path,comments);
				}

				delete objects.comments;

				IO.log('accept','Compiling kit from objects');
				const gzip = await Builder.compileKit(objects);

				IO.log('accept','Saving kit in target folder');

				const path = paths.kits.pwa+'/'+value+'.kit.gzip';
				await Tools.writeFile(path,gzip);
				const file = await Tools.fileData(path);
				const from = Tools.formatFileSize(Builder.stats.size);
				const to = Tools.formatFileSize(file.size);
				const percent = Tools.compareFileSize(Builder.stats.size,file.size);
				IO.log('accept','Done!');

				IO.log('inform','Created '+value+'.kit.gzip in '+paths.kits.pwa,true);
				IO.log('inform',Builder.stats.count+' files, '+from+' to '+to+' ('+percent+'% compression)');

				IO.signal('project','built','kit');
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
