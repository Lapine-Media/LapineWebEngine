
import IO from './io.js';
import Settings from './settings.js';
import Worker from './worker.js';
import { Tools } from './tools.js';

const commands = {
	getQuery: function(query) {
		query = query.replace(/'/g, "''");
		return [
			'npx wrangler d1 execute',
			Worker.data.binding,
			'--command',
			"'"+query+"'",
			Worker.data.remote ? '--remote' : '--local',
			Worker.data.preview ? '--preview' : '',
			'--env',
			Worker.data.environment,
			'--json',
			...this.getPaths()
		].filter(Boolean).join(' ');
	},
	getPaths: function() {
		return [
			'--cwd',
			Settings.paths.project,
			'--config',
			Settings.paths.project+'/wrangler.json'
		];
	}
}

const database = {
	list: async function() {
		IO.log('accept','Getting list of D1 databases...');
		const request = {
			href: 'accounts/$ACCOUNT_ID/d1/database',
			method: 'get'
		}
		const response = await IO.api(request);
		IO.signal('d1','list','loaded',response.result);
		IO.log('accept','Done!');
		IO.log('line');
	},
	info: async function(data) {
		IO.log('accept','Getting database info...');
		const command = [
			'npx wrangler d1 info',
			data.name,
			'--json',
			...commands.getPaths()
		].join(' ');
		let result = await IO.execute(command);
		try {
			result = JSON.parse(result);
			IO.signal('d1-item',data.name,'info',result);
			IO.log('accept','Done!');
			IO.log('line');
		} catch {
			IO.signal('d1-item',data.name,'error',null);
			IO.log('normal',result);
			IO.log('line');
		}
	},
	create: async function(data) {
		try {
			IO.log('accept','Creating D1 database...');
			IO.log('normal',data.name);
			const request = {
				href: 'accounts/$ACCOUNT_ID/d1/database',
				method: 'post',
				body: data
			}
			const response = await IO.api(request);
			IO.signal('d1','database','created',response);
			IO.log('accept','Done!');
			IO.log('line');
		} catch (error) {
			console.log(error);
			IO.log('reject',error);
			IO.log('line');
		}
	},
	remove: async function(data) {
		try {
			IO.log('accept','Removing D1 database...');
			IO.log('normal',data.name);
			const request = {
				href: 'accounts/$ACCOUNT_ID/d1/database/'+data.uuid,
				method: 'delete'
			}
			const response = await IO.api(request);
			IO.signal('d1','database','removed',response);
			if (data.binding) {
				Cloudflare('bindings','remove',data.binding);
			} else {
				IO.log('accept','Done!');
				IO.log('line');
			}
		} catch (error) {
			console.log(error);
			IO.log('reject',error);
			IO.log('line');
		}
	}
}

const editor = {
	list: async function() {
		try {

			IO.log('accept','Loading database...');
			const response = await Worker.request('local','list');
			IO.signal('d1','result','database',response);
			IO.log('accept','Done!');
			IO.log('line');

			migrations.list();

			/*const query = [
				'SELECT name, type',
				'FROM sqlite_master',
				'WHERE type IN ("table", "index", "view", "trigger")',
					'AND name NOT LIKE "sqlite_%"',
					'AND name NOT LIKE "_cf_%"',
					'AND sql IS NOT NULL',
				'ORDER BY type, name'
			].join(' ');

			const command = commands.getQuery(query);
			const result = await IO.execute(command);
			const data = JSON.parse(result);

			if (data.error) {
				IO.log('reject',data.error.text);
				IO.log('line');
			} else {
				IO.signal('d1','result','database',data);
				IO.log('accept','Done!');
				IO.log('line');
				migrations.list();
			}*/

		} catch (error) {
			console.log(error);
			IO.log('reject',error);
			IO.log('line');
		}
	},
	help: async function(data) {
		try {
			IO.log('accept','Loading query template...');
			const file = Settings.paths.lapine+'/src/data/queries/'+data+'.sql';
			const content = await Tools.readFile(file,false,false);
			IO.signal('d1','result','help',content);
			IO.log('accept','Done!');
			IO.log('line');
		} catch (error) {
			console.log(error);
			IO.log('reject',error);
			IO.log('line');
		}
	},
	query: async function(query) {
		try {

			IO.log('accept','Executing query...');

			const data = new FormData();
			data.append('query',query);
			const response = await Worker.request('local','query',data);

			IO.signal('d1','result','query',response);

			if (response?.meta?.changed_db) {
				const migration = await migrations.add(query);
				IO.signal('d1','migration','added',migration);
			}

			IO.log('accept','Done!');
			IO.log('line');

		} catch (error) {
			console.log(error);
			IO.log('reject',error.message);
			IO.log('line');
		}
	},
	export: async function(data) {
		try {
			const all = data.table == 'all';
			const file = '.exported.tmp';
			const command = [
				'npx wrangler d1 export',
				Worker.data.database_name,
				'--output',
				file,
				all ? null : '--table '+data.table,
				'--'+data.target,
				data.output.includes('schema') ? null : '--no-schema',
				data.output.includes('data') ? null : '--no-data',
				'--env',
				Worker.data.environment,
				...commands.getPaths()
			].filter(Boolean).join(' ');

			IO.log('accept','Exporting database to file...');

			const path = Settings.paths.project+'/'+file;
			await IO.execute(command);
			const contents = await Tools.readFile(path);
			await Tools.removeFile(path);

			const name = [
				all ? 'exported-database' : 'exported-table',
				all ? Worker.data.database_name : data.table,
				data.target,
				Tools.getTimestamp().replace(' ','-')
			].join('_');
			const link = {
				href: 'data:application/sql;base64,'+btoa(contents),
				name: name+'.sql'
			}

			IO.signal('d1','io','exported',link);
			IO.log('accept','Done!');
			IO.log('line');
		} catch (error) {
			console.log(error);
			IO.log('reject',error);
			IO.log('line');
		}
	}
}

const migrations = {
	directory: Settings.paths.project+'/migrations/',
	list: async function() {
		const query = async location => {
			const {promise,resolve,reject} = Promise.withResolvers();
			const command = [
				'npx wrangler d1 execute',
				Worker.data.binding,
				'--command',
				'"SELECT name FROM d1_migrations;"',
				location,
				'--env',
				Worker.data.environment,
				'--json',
				...commands.getPaths()
			].join(' ');
			let result = [];
			try {
				result = await IO.execute(command);
				result = JSON.parse(result);
				if (result.error) {
					resolve(result.error.text);
				} else {
					const list = result[0].results.map(entry => entry.name);
					resolve(list);
				}
			} catch (error) {
				console.log(error);
				reject(error);
			}
			return promise;
		}
		try {
			IO.log('accept','Getting list of migrations...');
			const promises = [
				query('--local'),
				query('--remote'),
				query('--remote --preview'),
				this.getMigrationFiles()
			];
			const [local,remote,preview,files] = await Promise.all(promises);
			const list = {local,remote,preview,files};
			IO.signal('d1','migration','list',list);
			IO.log('accept','Done!');
			IO.log('line');
		} catch (error) {
			console.log(error);
			IO.log('reject',error);
			IO.log('line');
		}
	},
	load: async function(data) {
		try {
			IO.log('accept','Loading migration query...');
			const file = this.directory+data;
			const content = await Tools.readFile(file,false,false);
			IO.signal('d1','result','help',content);
			IO.log('accept','Done!');
			IO.log('line');
		} catch (error) {
			console.log(error);
			IO.log('reject',error);
			IO.log('line');
		}
	},
	remove: async function(file_name) {
		try {
			IO.log('accept','Removing migration...');

			const query = 'DELETE FROM d1_migrations WHERE name = "'+file_name+'";';
			const command = commands.getQuery(query);
			const result = await IO.execute(command);
			const data = JSON.parse(result);

			if (data.error) {
				IO.log('reject',data.error.text);
				IO.log('line');
			} else {
				Tools.removeFile(this.directory+file_name);
				IO.signal('d1','migration','removed',file_name);
				IO.log('accept','Done!');
				IO.log('line');
			}
		} catch (error) {
			console.log(error);
			IO.log('reject',error);
			IO.log('line');
		}
	},
	getMigrationFiles: function() {
		const promise = async (resolve,reject) => {
			try {
				const files = await Tools.readDirectory(this.directory,false,false);
				const filter = name => name.endsWith('.sql');
				const sorted = files.filter(filter).sort();
				resolve(sorted);
			} catch (error) {
				reject(error);
			}
		}
		return new Promise(promise);
	},
	add: async function(query) {
		try {

			IO.log('normal','Adding migration...');

			// create migration file
			const cleaned = query
				.replace(/--.*$/gm, '')              // remove line comments
				.replace(/\/\*[\s\S]*?\*\//g, '')    // remove block comments
				.replace(/\s+/g, ' ')                // normalize whitespace
				.trim()
				.toLowerCase();
			const tokens = cleaned.split(/[^a-z0-9_]+/).filter(Boolean);
			const name = tokens.slice(0,3).join('_') || 'migration';

			let command = [
				'npx wrangler d1 migrations create',
				Worker.data.database_name,
				name,
				'--env',
				Worker.data.environment,
				...commands.getPaths()
			].join(' ');

			await IO.execute(command);

			// load migration file and append query
			const files = await this.getMigrationFiles();
			const file_name = files.at(-1);

			await Tools.writeFile(this.directory+file_name,query,false,true);

			// apply migration
			query = 'INSERT INTO d1_migrations (name,applied_at) VALUES (\''+file_name+'\',CURRENT_TIMESTAMP)';
			command = commands.getQuery(query);

			await IO.execute(command);

			return file_name;

		} catch (error) {
			console.log(error);
			IO.log('reject',error);
			IO.log('line');
		}
	},
	apply: async function(target) {
		try {

			IO.log('accept','Applying migrations...');
			IO.log('normal','Target database: '+string);

			const string = {
				local: '--local',
				remote: '--remote',
				preview: '--remote --preview'
			}[target];
			const command = [
				'npx wrangler d1 migrations apply',
				Worker.data.database_name,
				string,
				'--env',
				Worker.data.environment,
				...commands.getPaths()
			].join(' ');

			await IO.execute(command);

			IO.log('accept','Done!');
			IO.log('line');

			migrations.list();

		} catch (error) {
			console.log(error);
			IO.log('reject',error);
			IO.log('line');
		}
	}
}

export default async function(name,value,data) {
	switch (name) {
		case 'database':
			database[value](data);
			break;
		case 'editor':
			editor[value](data);
			break;
		case 'migrations':
			migrations[value](data);
			break;
		default:
			console.log('d1',name,value,data);
	}
}
