
import IO from './io.js';
import Paths from './paths.js';
import Tools from './tools.js';

export default async function(name,value,data) {
	try {
		value = value.replace('.csp.txt','');
		let file = Paths.join(Paths.folders.data.working,value+'.csp.txt');
		switch (name) {
			case 'load':
				IO.log('accept','Loading content security policy...');
				let content = await Tools.readFile(file,false,false,false);
				if (content === false) {
					IO.log('danger','File not found, loading default template...');
					file = Paths.join(Paths.folders.data.template,'index.csp.txt');
					content = await Tools.readFile(file,false,false);
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
