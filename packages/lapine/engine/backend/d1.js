
import IO from './io.js';
import Settings from './settings.js';
import Paths from './paths.js';
import Worker from './worker.js';
import Tools from './tools.js';

let tableAdded = false;

export default async function(name,value,data,id) {
	try {
		let result,response;
		switch (name+' '+value) {
			// DATABASE ///////////////////////////////////////////////////////
			case 'create migration_table':
				IO.log('accept','Creating local migration table...');
				result = await Worker.request('local','createMigrationTable',null);
				IO.signal(id,'table','created',result);
				IO.log('accept','Done!');
				IO.log('line');
				break;
			case 'list databases':
				IO.log('accept','Getting list of D1 databases...');
				result = await listDatabases();
				IO.signal(id,'list','loaded',result);
				IO.log('accept','Done!');
				IO.log('line');
				break;
			case 'database info':
				IO.log('accept','Getting database info...');
				result = await getDatabaseInfo(data);
				IO.signal(id,'info','loaded',result);
				IO.log('accept','Done!');
				IO.log('line');
				break;
			case 'create database':
				IO.log('accept','Creating D1 database "'+data.name+'"...');
				result = await createDatabase(data);
				IO.signal('d1_manager','database','created',result);
				IO.log('accept','Done!');
				IO.log('line');
				break;
			case 'remove database':
				IO.log('accept','Removing D1 database "'+data.name+'"...');
				result = await removeDatabase(data);
				if (result) {
					IO.log('normal','Removed associated bindings from wrangler.');
				}
				IO.signal('d1_manager','database','removed',result);
				IO.log('accept','Done!');
				IO.log('line');
				break;
			// EDITOR /////////////////////////////////////////////////////////
			case 'load database':
				IO.log('accept','Loading database schema...');
				result = await Worker.request('local','loadDatabase');
				IO.signal('d1_editor','database','loaded',result);
				IO.log('accept','Done!');
				IO.log('line');
				break;
			case 'load table':
				IO.log('accept','Loading table...');
				result = await Worker.request('local','loadTable',data);
				IO.signal('d1_editor','table','loaded',result);
				IO.log('accept','Done!');
				IO.log('line');
				break;
			case 'load row':
				IO.log('accept','Loading row...');
				result = await Worker.request('local','loadRow',data);
				IO.signal('d1_editor','row','loaded',result);
				IO.log('accept','Done!');
				IO.log('line');
				break;
			case 'load index':
				IO.log('accept','Loading index...');
				result = await Worker.request('local','loadIndex',data);
				IO.signal('d1_editor','index','loaded',result);
				IO.log('accept','Done!');
				IO.log('line');
				break;
			case 'load trigger':
				IO.log('accept','Loading trigger...');
				result = await Worker.request('local','loadTrigger',data);
				IO.signal('d1_editor','trigger','loaded',result);
				IO.log('accept','Done!');
				IO.log('line');
				break;
			case 'execute query':
				IO.log('accept','Performing query...');
				result = await Worker.request('local','runQuery',data);
				if (result.changed_db) {
					IO.log('accept','Adding migration...');
					await addMigration(result.query);
					IO.log('accept','Migration added!');
				} else {
					IO.log('normal','No migration added.');
				}
				IO.signal('d1_editor','query','executed',result);
				IO.log('accept','Done!');
				IO.log('line');
				break;
			case 'list migrations':
				IO.log('accept','Getting list of migrations...');
				result = await listMigrations();
				IO.signal(id,'migration','list',result);
				IO.log('accept','Done!');
				IO.log('line');
				break;
			case 'apply migration':
				IO.log('accept','Applying migrations...');
				result = await applyMigration(data);
				IO.signal('d1_editor','migration','applied',null);
				IO.log('accept','Done!');
				IO.log('line');
				break;

			/*case 'load template':
				IO.log('accept','Loading query template...');
				const file = Paths.join(Paths.folders.engine.data,'queries',data+'.sql');
				result = await Tools.readFile(file,false,false);
				IO.signal(id,'template',data,result);
				IO.log('accept','Done!');
				IO.log('line');
				break;

			case 'export database':
				IO.log('accept','Exporting database to file...');
				result = await exportDatabase(data);
				IO.signal('d1_editor','io','exported',result);
				IO.log('accept','Done!');
				IO.log('line');
				break;

			case 'apply migration':
				IO.log('accept','Applying migrations...');
				IO.log('normal','Target database: '+data);
				result = await applyMigrations(data);
				IO.signal('d1_editor','migration','list',result);
				IO.log('accept','Done!');
				IO.log('line');
				break;
			case 'remove migration':
				IO.log('accept','Removing migration...');
				await removeMigration(data);
				IO.signal('d1_editor','migration','removed',data);
				IO.log('accept','Done!');
				IO.log('line');
				break;*/
			default:
				console.log('d1_manager',name,value,data);
		}
	} catch (error) {
		console.log(error);
	}
}

// SETTINGS ///////////////////////////////////////////////////////////////////

const predefined = {
	href: 'accounts/$ACCOUNT_ID/d1/database',
	paths: [
		'--cwd',
		Paths.folders.project.working,
		'--config',
		Paths.files.wrangler.working
	]
}

function getEnvironment() {
	return Worker.data.binding_environment == 'top' ? '': '--env '+Worker.data.binding_environment;
}

function makeQuery(query) {
	query = query.replace(/'/g, "''");
	return [
		'npx wrangler d1 execute',
		Worker.data.binding,
		'--command',
		"'"+query+"'",
		Worker.data.remote ? '--remote' : '--local',
		Worker.data.preview ? '--preview' : '',
		getEnvironment(),
		'--json',
		...predefined.paths
	].filter(Boolean).join(' ');
}

// DATABASE ///////////////////////////////////////////////////////////////////

async function listDatabases() {
	const request = {
		href: predefined.href,
		method: 'GET'
	}
	const response = await IO.api(request);
	return response.result;
}

async function getDatabaseInfo(data) {
	const command = [
		'npx wrangler d1 info',
		data.name,
		'--json',
		...predefined.paths
	].join(' ');
	const result = await IO.spawn(command);
	return JSON.parse(result);
}

async function createDatabase(data) {
	const request = {
		href: predefined.href,
		method: 'POST',
		body: data
	}
	const response = await IO.api(request);
	return response.result;
}

async function removeDatabase(data) {
    const request = {
        href: predefined.href+'/'+data.uuid,
		method: 'DELETE'
    }
    const result = await IO.api(request);

    if (result.success) {
		let wrangler = await Settings.loadWrangler();
        let changed = false;
        const environments = ['top', ...Object.keys(wrangler.env || {})];
        for (const envName of environments) {
            const scope = envName === 'top' ? wrangler : wrangler.env[envName];
            if (scope && Array.isArray(scope.d1_databases)) {
				const originalLength = scope.d1_databases.length;
				scope.d1_databases = scope.d1_databases.filter(b => b.database_id !== data.uuid);
                if (scope.d1_databases.length !== originalLength) {
                    changed = true;
					if (scope.d1_databases.length === 0) delete scope.d1_databases;
                }
            }
        }
        if (changed) {
			await Settings.saveWrangler(wrangler,false);
			return true;
        }
    }
	return false;
}

// EDITOR /////////////////////////////////////////////////////////////////////

async function runQuery(id,query) {
	IO.log('accept','Executing query...');
	try {
		query = query
			.replace(/\/\*[\s\S]*?\*\//g, '') 	// Remove block comments
			.replace(/--.*$/gm, '')				// Remove line comments
			.replace(/^\s*[\r\n]/gm, '')		// Remove empty lines
			.trim();							// Trim leading/trailing whitespace
		IO.log('inform',query);
		const data = new FormData();
		data.append('query',query);
		const response = await Worker.request('local','query',data);
		if (response?.meta?.changed_db) {
			IO.log('accept','Adding migration...');
			let result = await addMigration(query);
			IO.signal('d1_editor','migration','added',result);
			result = await Worker.request('local','list');
			IO.signal('d1_editor','database','list',result);
		}
		IO.signal(id,'result','query',response);
		IO.log('accept','Done!');
	} catch (error) {
		console.log('runQuery',error);
	}
	IO.log('line');
}

async function exportDatabase(data) {
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
		getEnvironment(),
		...predefined.paths
	].filter(Boolean).join(' ');

	const path = Paths.join(Paths.folders.project,file);
	await IO.spawn(command);
	const contents = await Tools.readFile(path);
	await Tools.removeFile(path);

	const name = [
		all ? 'exported-database' : 'exported-table',
		all ? Worker.data.database_name : data.table,
		data.target,
		Tools.getTimestamp().replace(' ','-')
	].join('_');

	return {
		href: 'data:application/sql;base64,'+btoa(contents),
		name: name+'.sql'
	}
}

// MIGRATIONS /////////////////////////////////////////////////////////////////

async function listMigrations() {
	const wranglerQuery = async (query,location) => {
		const command = [
			'npx wrangler d1 execute',
			Worker.data.binding,
			'--command',
			'"'+query+'"',
			location,
			getEnvironment(),
			'--json',
			...predefined.paths
		].join(' ');
		const result = await IO.spawn(command);
		return JSON.parse(result);
	}
	const checkTables = async () => {
		IO.log('accept','Checking for migration tables...');
		const query = "SELECT name FROM sqlite_master WHERE type='table' AND name='d1_migrations'";
		const promises = [
			wranglerQuery(query,'--local'),
			wranglerQuery(query,'--remote'),
			wranglerQuery(query,'--remote --preview')
		];
		const tables = await Promise.all(promises);
		const [local,remote,preview] = tables.map(table => table[0].results.length > 0);
		return {local,remote,preview};
	}
	const getMigrationData = async tables => {
		IO.log('accept','Getting migration data...');
		const query = 'SELECT name FROM d1_migrations';
		const empty = [{results:[]}];
		const promises = [
			tables.local ? wranglerQuery(query,'--local') : empty,
			tables.remote ? wranglerQuery(query,'--remote') : empty,
			tables.preview ? wranglerQuery(query,'--remote --preview') : empty
		];
		const data = await Promise.all(promises);
		const getValues = result => result.name;
		const getResults = table => table[0].results.map(getValues);
		const [local,remote,preview] = data.map(getResults);
		return {local,remote,preview};
	}
	const tables = await checkTables();
	return await getMigrationData(tables);
}

function makeMigrationName(query) {
    const s = query.replace(/\s+/g, ' ').trim();
    const inner = s
        .replace(/^\s*BEGIN(\s+TRANSACTION)?\s*;?\s*/i, '')
        .replace(/\s*(COMMIT|END|ROLLBACK)(\s+TRANSACTION)?\s*;?\s*$/i, '')
        .replace(/^PRAGMA\s+\w+\s*=\s*\w+\s*;?\s*/gi, '')
        .trim();
    const patterns = [
        /(?:CREATE(?:\s+VIRTUAL)?|DROP|ALTER)\s+(TABLE|VIEW|INDEX|TRIGGER)\s+(?:IF\s+(?:NOT\s+)?EXISTS\s+)?["'\[]?(\w+)/i,
        /(INSERT|UPDATE|DELETE)\s+(?:INTO|FROM)?\s+["'\[]?(\w+)/i,
    ];
    for (const pattern of patterns) {
        const match = inner.match(pattern);
        if (match) {
            const [, type, name] = match;
            const action = type.toLowerCase().replace(/\s+/g, '_');
            const identifier = name.toLowerCase().replace(/\W+/g, '_');
            return `${action}-${identifier}`;
        }
    }
    return inner.split(' ').slice(0, 4).join('_').toLowerCase().replace(/\W+/g, '_');
}

async function addMigration(query) {
	const timestamp = new Date().toISOString().replace(/\D/g,'').slice(0,14);
	const migration_name = makeMigrationName(query);
	const file_name = timestamp+'-'+migration_name+'.sql';
	const file = Paths.join(Paths.folders.migrations.working,file_name);
	const data = {file_name};
	const promises = [
		Tools.writeFile(file,query,false,true),
		Worker.request('local','addMigration',data)
	];
	await Promise.all(promises);
}

async function applyMigration(target) {
	const string = {
		local: '--local',
		remote: '--remote',
		preview: '--remote --preview'
	}[target];
	const command = [
		'npx wrangler d1 migrations apply',
		Worker.data.database_name,
		string,
		getEnvironment(),
		...predefined.paths
	].join(' ');
	await IO.spawn(command);
}

async function removeMigration(file_name) {
	const data = {file_name};
	const file = Paths.join(Paths.folders.migrations.working,file_name);
	const promises = [
		Worker.request('local','addMigration',data),
		Tools.removeFile(file)
	];
	await Promise.all(promises);
}
