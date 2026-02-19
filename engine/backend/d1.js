
import IO from './io.js';
import Settings from './settings.js';
import Worker from './worker.js';
import { Tools } from './tools.js';

export default async function(name,value,data,id) {
	try {
		let result,response;
		switch (name+' '+value) {
			// DATABASE ///////////////////////////////////////////////////////
			case 'list databases':
				IO.log('accept','Getting list of D1 databases...');
				result = await listDatabases();
				IO.signal('d1_manager','list','loaded',result);
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
			case 'load schema':
				IO.log('accept','Loading database schema...');
				result = await Worker.request('local','list');
				IO.signal('d1_editor','database','list',result);
				IO.log('accept','Done!');
				IO.log('line');
				break;
			case 'load template':
				IO.log('accept','Loading query template...');
				const file = Settings.paths.lapine+'/engine/frontend/data/queries/'+data+'.sql';
				result = await Tools.readFile(file,false,false);
				IO.signal(id,'template',data,result);
				IO.log('accept','Done!');
				IO.log('line');
				break;
			case 'execute query':
				IO.log('accept','Executing query...');
				await runQuery(id,data);
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
			case 'list migrations':
				IO.log('accept','Getting list of migrations...');
				result = await listMigrations();
				IO.signal('d1_editor','migration','list',result);
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
		Settings.paths.project,
		'--config',
		Settings.paths.project+'/wrangler.json'
	]
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
		'--env',
		Worker.data.binding_environment,
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

async function getDatabaseInfo(data,paths) {
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
	const data = new FormData();
	data.append('query',query);
	const response = await Worker.request('local','query',data);
	IO.signal(id,'result','query',response);
	if (response?.meta?.changed_db) {
		IO.log('normal','Adding migration...');
		result = await addMigration(query);
		IO.signal('d1_editor','migration','added',result);
	}
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
		'--env',
		Worker.data.environment,
		...predefined.paths
	].filter(Boolean).join(' ');

	const path = Settings.paths.project+'/'+file;
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

function getMigrationsdirectory() {
	const directory = Worker.data.migrations_dir || 'migrations';
	return Settings.paths.project+'/'+directory+'/';
}
function getMigrationsTable() {
	return Worker.data.migrations_table || 'd1_migrations';
}

async function listMigrations() {
	const query = async location => {
		const table = getMigrationsTable();
		const command = [
			'npx wrangler d1 execute',
			Worker.data.binding,
			'--command',
			'"SELECT name FROM '+table+';"',
			location,
			'--env',
			Worker.data.binding_environment,
			'--json',
			...predefined.paths
		].join(' ');
		try {
			let result = await IO.spawn(command);
			result = JSON.parse(result);
			return result;//result[0].results.map(entry => entry.name);
		} catch (error) {
			error = JSON.parse(error);
			IO.log('reject','D1 error: '+error.error.text);
			return [];
		}
	}
	const directory = getMigrationsdirectory();
	const promises = [
		query('--local'),
		query('--remote'),
		query('--remote --preview'),
		getMigrationFiles(directory)
	];
	const [local,remote,preview,files] = await Promise.all(promises);
	return {local,remote,preview,files};
}

async function getMigrationFiles(directory) {
	try {
		const files = await Tools.readDirectory(directory,false,false);
		const filter = name => name.endsWith('.sql');
		return files.filter(filter).sort();
	} catch (error) {
		IO.log('reject',error);
		return [];
	}
}

async function addMigration(query) {
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
		Worker.data.binding_environment,
		...predefined.paths
	].join(' ');

	await IO.spawn(command);

	// load migration file and append query
	const directory = getMigrationsdirectory();
	const table = getMigrationsTable();
	const files = await getMigrationFiles(directory);
	const file_name = files.at(-1);

	await Tools.writeFile(directory+file_name,query,false,true);

	// apply migration
	command = makeQuery('INSERT INTO '+table+' (name,applied_at) VALUES (\''+file_name+'\',CURRENT_TIMESTAMP)');

	await IO.spawn(command);

	return file_name;
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
		'--env',
		Worker.data.environment,
		...predefined.paths
	].join(' ');

	await IO.spawn(command);

	return await listMigrations();
}
