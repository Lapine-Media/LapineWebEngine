
import IO from './io.js';
import Settings from './settings.js';
import Tools from './tools.js';
import Paths from './paths.js';

export default async function(name,value,data) {
	try {
		switch (name) {
			case 'load':
				IO.log('accept','Loading sitemap...');
				let sitemap;
				switch (value) {
					case 'existing':
						sitemap = await Tools.readFile(Paths.files.sitemap.working,true,false,false);
						if (sitemap !== false) {
							break;
						}
					case 'template':
						sitemap = await Tools.readFile(Paths.files.sitemap.template,true,false);
						break;
					default:
						IO.log('danger','Sitemap not found, loading default template...');
						sitemap = await Tools.readFile(Paths.files.sitemap.template,true,false);
				}
				IO.signal('sitemap','loaded','success',sitemap);
				IO.log('accept','Done!');
				IO.log('line');
				break;
			case 'save':
				IO.log('accept','Saving sitemap...');
				await Tools.writeFile(Paths.files.sitemap.working,data,false);
				IO.signal('sitemap','saved','success',null);
				IO.log('accept','Done!');
				IO.log('line');
		}
	} catch (error) {
		IO.log('reject','Error: '+error.message);
		IO.log('line');
	}
}
