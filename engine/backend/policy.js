
import IO from './io.js';
import Settings from './settings.js';
import { Tools } from './tools.js';

const paths = {
	pwa: Settings.paths.pwa+'/data/',
	lapine: Settings.paths.lapine+'/templates/pwa/data/index.csp.txt'
}

export default async function(name,value,data) {
	try {
		value = value.replace('.csp.txt','');
		const file = paths.pwa+value+'.csp.txt';
		switch (name) {
			case 'load':
				IO.log('accept','Loading content security policy...');

				const pwa = await Tools.fileExist(Settings.paths.pwa);

				if (!pwa) {
					IO.signal('project','missing','pwa');
					IO.log('reject','Missing PWA folder.');
					IO.log('line');
					break;
				}

				let content = await Tools.readFile(file,false,false,false);

				if (content === false) {
					IO.log('danger','File not found, loading default template...');
					content = await Tools.readFile(paths.lapine,false,false);
				}
				data = {
					file: value,
					content: content
				}
				IO.signal('policy','loaded','success',data);
				IO.log('accept','Done!');
				IO.log('line');
				break;
			case 'save':
				IO.log('accept','Saving content security policy...');
				await Tools.writeFile(file,data,false);
				IO.signal('policy','saved','success');
				IO.log('accept','Done!');
				IO.log('line');
		}
	} catch (error) {
		IO.log('reject','Error: '+error.message);
		IO.log('line');
	}
}
