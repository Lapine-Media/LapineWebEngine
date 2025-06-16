
import IO from './io.js';
import Settings from './settings.js';
import { Tools } from './tools.js';

const file = Settings.paths.app+'/data/index.csp.txt';

export default async function(name,value,data) {
	try {
		switch (name) {
			case 'load':
				IO.log('accept','Loading Content Security Policy...');
				const content = await Tools.readFile(file,false,false);
				IO.signal('policy','loaded','success',content);
				IO.log('accept','Done!');
				IO.log('line');
				break;
			case 'save':
				IO.log('accept','Saving Content Security Policy...');
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
