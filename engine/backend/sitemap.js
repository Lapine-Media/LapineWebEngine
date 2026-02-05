
import IO from './io.js';
import Settings from './settings.js';
import { Tools } from './tools.js';

const paths = {
	lapine: Settings.paths.lapine+'/templates/pwa/data/sitemap.gzip',
	pwa: Settings.paths.pwa+'/data/sitemap.gzip'
}

export default async function(name,value,data) {
	try {
		switch (name) {
			case 'load':
				IO.log('accept','Loading sitemap...');
				let sitemap;
				switch (value) {
					case 'existing':
						sitemap = await Tools.readFile(paths.pwa,true,true,false);
						if (sitemap !== false) {
							break;
						}
					default:
						IO.log('danger','Sitemap not found, loading default template...');
						sitemap = await Tools.readFile(paths.lapine,true,true);
				}
				IO.signal('sitemap','loaded','success',sitemap);
				IO.log('accept','Done!');
				IO.log('line');
				break;
			case 'save':

				const dataDir = Path.dirname(paths.pwa);
				const hasDir = await Tools.fileExist(dataDir);

				if (!hasDir) {
					IO.signal('project','missing','pwa');
					break;
				}

				IO.log('accept','Saving sitemap...');
				await Tools.writeFile(paths.pwa,data,true);
				IO.signal('sitemap','saved','success',null);
				IO.log('accept','Done!');
				IO.log('line');
		}
	} catch (error) {
		IO.log('reject','Error: '+error.message);
		IO.log('line');
	}
}
