
import IO from './io.js';
import Settings from './settings.js';
import { Tools } from './tools.js';

const paths = {
	existing: Settings.paths.app+'/data/sitemap.gzip',
	model: Settings.paths.lapine+'/src/data/sitemap.json'
}

export default async function(name,value,data) {
	try {
		switch (name) {
			case 'load':
				IO.log('accept','Loading sitemap...');
				let sitemap;
				if (value == 'existing') {
					sitemap = await Tools.readFile(paths.existing,true,true);
				} else {
					sitemap = await Tools.readFile(paths.model,true,false);
				}
				IO.signal('sitemap','loaded','success',sitemap);
				IO.log('accept','Done!');
				IO.log('line');
				break;
			case 'save':
				IO.log('accept','Saving sitemap...');
				await Tools.writeFile(paths.existing,data,true);
				IO.signal('sitemap','saved','success',null);
				IO.log('accept','Done!');
				IO.log('line');
				break;
		}
	} catch (error) {
		IO.log('reject','Error: '+error.message);
		IO.log('line');
	}
}
