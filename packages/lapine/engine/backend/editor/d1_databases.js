
import Editor from './editor.js';

export default new class extends Editor {
    constructor() {
		super();
	}
	async createMigrationTable() {
		const query = [
			'CREATE TABLE IF NOT EXISTS d1_migrations (',
			'id INTEGER PRIMARY KEY AUTOINCREMENT,',
			'name TEXT UNIQUE,',
			'applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL',
			');'
		].join(' ');
		return await this.binding.prepare(query).run();
	}
	async loadDatabase() {
		const queries = {
			tables: [
				'SELECT name,type',
				'FROM sqlite_master',
				'WHERE type IN ("table","view")',
				'AND name NOT IN ("_cf_METADATA","d1_migrations","sqlite_sequence")',
				'ORDER BY type,name'
			].join(' '),
			triggers: [
				'SELECT COUNT(name) AS triggers, tbl_name AS "table"',
				'FROM sqlite_master',
				'WHERE type = "trigger"',
				'GROUP BY tbl_name'
			].join(' '),
			rows: table => this.binding.prepare('SELECT \''+table.name+'\' AS name, COUNT(*) AS rows FROM "'+table.name+'"'),
			indicies: table => this.binding.prepare('PRAGMA index_list("'+table.name+'")'),
			fkeys: table => this.binding.prepare('PRAGMA foreign_key_list("'+table.name+'")')
		}
		const statements = [
			this.binding.prepare(queries.tables),
			this.binding.prepare(queries.triggers)
		];
		const [tables,triggers] = await this.binding.batch(statements);
		if (tables.results.length > 0) {
			const getResults = async list => {
				const batch = tables.results.map(list);
				return await this.binding.batch(batch)
			}
			const rows = await getResults(queries.rows);
			const indicies = await getResults(queries.indicies);
			const fkeys = await getResults(queries.fkeys);

			const count = entry => [entry.table,entry.triggers];
			const list = triggers.results.map(count);
			const object = Object.fromEntries(list);

			const getTables = (table,index) => {
				const entry = {
					name: table.name,
					type: table.type,
					rows: rows[index].results[0].rows
				}
				if (table.type == 'table') {
					entry.indicies = indicies[index].results.length;
					entry.triggers = object[table.name] || 0;
				}
				return entry;
			};

			const c = entry => [entry.from,[entry.table,entry.to]];
			const a = entry => entry.results.length > 0;
			const b = entry => entry.results.map(c);
			const foreignKeys = fkeys.filter(a).map(b).flat();

			return {
				tables: await tables.results.map(getTables),
				fkeys: Object.fromEntries(foreignKeys)
			};
		} else {
			return {
				tables: tables,
				fkeys: {}
			};
		}
	}
	async loadTable(details) {
		const {table,limit,offset} = details;
		const statements = [
			this.binding.prepare('SELECT * FROM "'+table+'" LIMIT ? OFFSET ?').bind(limit,offset),
			this.binding.prepare('SELECT sql FROM sqlite_master WHERE name = "'+table+'"'),
			this.binding.prepare('PRAGMA index_list("'+table+'")'),
			this.binding.prepare('SELECT name FROM sqlite_master WHERE type="trigger" AND tbl_name="'+table+'"')
		];
		const [entries, sql, indices, triggers] = await this.binding.batch(statements);
		return {entries, sql, indices, triggers, details};
	}
	async loadRow(details) {
		const {table,column,value} = details;
		const statements = [
			this.binding.prepare('SELECT * FROM "'+table+'" WHERE "'+column+'" = ?').bind(value),
			this.binding.prepare('SELECT sql FROM sqlite_master WHERE name = ?').bind(value),
			this.binding.prepare('PRAGMA index_list("'+table+'")'),
			this.binding.prepare('SELECT name FROM sqlite_master WHERE type="trigger" AND tbl_name="'+table+'"')
		];
		const [entries, sql, indices, triggers] = await this.binding.batch(statements);
		return {entries, sql, indices, triggers, details};
	}
	async loadIndex(input) {
		const query = 'SELECT sql FROM sqlite_master WHERE type="index" AND name=?';
		return await this.binding.prepare(query).bind(input.name).all();
	}
	async loadTrigger(input) {
		const query = 'SELECT sql FROM sqlite_master WHERE type="trigger" AND name=?';
		return await this.binding.prepare(query).bind(input.name).all();
	}
	async runQuery(input) {
		try {
			const result = await this.binding.prepare(input.query).all();
			return {
				query: input.query,
				changed_db: result.meta.changed_db,
				details: {
					table: 'Custom query',
					limit: result.results.length,
					offset: 0
				},
				entries: result
			};
		} catch (error) {
			return {error: error.message};
			//throw new Error(error.message);
			/*return {
				success: false,
				meta: {
					error: error.message
				},
				results: []
			}*/
		}
	}
	async addMigration(input) {
		const query = 'INSERT INTO d1_migrations (name,applied_at) VALUES (?,CURRENT_TIMESTAMP)';
		return await this.binding.prepare(query).bind(input.file_name).run();
	}
	async removeMigration(input) {
		const query = 'DELETE FROM d1_migrations WHERE name = ?';
		return await this.binding.prepare(query).bind(input.file_name).run();
	}
}
