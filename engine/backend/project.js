
import IO from './io.js';
import Settings from './settings.js';
import { Tools } from './tools.js';
import { Package,Builder } from './kits.js';

const paths = {
	notes: Settings.paths.project+'/notes.txt',
	source: Settings.paths.project+'/kits',
	target: Settings.paths.app+'/kits'
}

export default async function(name,value,data) {
	try {
		switch (name) {
			case 'load':
				IO.log('accept','Loading project data...');
				const list = [];
				const promises = [
					await Settings.loadPackage(),
					await Settings.loadWrangler(),
					await Settings.loadManifest(),
					await Tools.readFile(paths.notes,false,false,'To do:'),
					await Tools.readDirectory(paths.source,true)
				]

				const [pack,wrangler,manifest,notes,kits] = await Promise.all(promises);
				const loaded = {package:pack,wrangler,manifest,notes,kits};

				for (const file of loaded.kits) {
					switch (true) {
						case file.name.startsWith('.'):
						case file.name.startsWith('_'):
							break;
						case file.isDirectory():
							list.push(file.name);
							break;
					}
				}

				loaded.kits = list;

				IO.signal('project','loaded','project',loaded);
				IO.log('accept','Done!');
				IO.log('line');
				break;
			case 'build':
				IO.log('accept','Building kit "'+value+'"...');
				IO.log('accept','Creating file list');
				const files = await Builder.getFileList(paths.source+'/'+value);

				IO.log('accept','Creating objects from files');
				const objects = await Package.getObjects(files);

				if (objects.comments.length > 0) {
					IO.log('inform','Saving comments in target folder');
					const comments = objects.comments.join('\n');
					const path = paths.target+'/'+value+'.txt';
					await Tools.writeFile(path,comments);
				}

				delete objects.comments;

				IO.log('accept','Compiling kit from objects');
				const data = await Builder.compileKit(objects);

				IO.log('accept','Saving kit in target folder');

				const path = paths.target+'/'+value+'.kit.gzip';
				await Tools.writeFile(path,data);
				const file = await Tools.fileData(path);
				const from = Tools.formatFileSize(Builder.stats.size);
				const to = Tools.formatFileSize(file.size);
				const percent = Tools.compareFileSize(Builder.stats.size,file.size);
				IO.log('accept','Done!');

				IO.log('inform','Created '+value+'.kit.gzip in '+paths.target,true);
				IO.log('inform',Builder.stats.count+' files, '+from+' to '+to+' ('+percent+'% compression)');

				IO.signal('project','built','kit');
				IO.log('line');
				break;
		}
	} catch (error) {
		throw error;
	}
}
