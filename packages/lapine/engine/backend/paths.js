
import url from 'url';
import path from 'path';

const file = url.fileURLToPath(import.meta.url);
const dir = path.join(file,'../../');
const lapine = path.dirname(dir);
const project = process.env.PWD;

export default {
	join: path.join,
	folders: {
		engine: {
			editor: path.join(lapine,'engine','backend','editor'),
			data: path.join(lapine,'engine','frontend','data'),
		},
		project: {
			template: path.join(lapine,'project'),
			working: project
		},
		kits: {
			template: path.join(lapine,'project','kits'),
			working: path.join(project,'kits'),
			frontend: path.join(project,'frontend','kits')
		},
		migrations: {
			template: path.join(lapine,'project','migrations'),
			working: path.join(project,'migrations')
		},
		framework: {
			backend: {
				source: path.join(lapine,'framework','backend'),
				target: path.join(lapine,'project','backend')
			},
			frontend: {
				source: path.join(lapine,'framework','frontend'),
				target: path.join(lapine,'project','frontend','scripts')
			}
		},
		data: {
			template: path.join(lapine,'project','frontend','data'),
			working: path.join(project,'frontend','data')
		},
		graphics: {
			template: path.join(lapine,'project','frontend','graphics'),
			working: path.join(project,'frontend','graphics')
		}
	},
	files: {
		notes: {
			template: path.join(lapine,'project','notes.txt'),
			working: path.join(project,'notes.txt')
		},
		package: {
			template: path.join(lapine,'project','package.json'),
			working: path.join(project,'package.json')
		},
		wrangler: {
			template: path.join(lapine,'project','wrangler.json'),
			working: path.join(project,'wrangler.json'),
			alternative: path.join(project,'wrangler.jsonc')
		},
		devvars: {
			template: path.join(lapine,'project','.dev.vars'),
			working: path.join(project,'.dev.vars')
		},
		manifest: {
			template: path.join(lapine,'project','frontend','data','manifest.webmanifest'),
			working: path.join(project,'frontend','data','manifest.webmanifest')
		},
		sitemap: {
			template: path.join(lapine,'project','frontend','data','sitemap.json'),
			working: path.join(project,'frontend','data','sitemap.json')
		}
	}
}
