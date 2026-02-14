
export default new class {
    constructor() {}
	async list(d1, data) {
        // 1. Fetch all schema objects (Tables, Indexes, Views, Triggers)
        const schemaQuery = `
            SELECT type, name, tbl_name, sql
            FROM sqlite_schema
            WHERE name NOT LIKE 'sqlite_%'
            AND name NOT LIKE '_cf_%'
            ORDER BY type, name
        `;
        const schemaRes = await d1.prepare(schemaQuery).all();

        if (!schemaRes.success) throw new Error(schemaRes.error || 'Failed to fetch schema');

		return schemaRes;

		/*const overview = {
            tables: {},
            views: {}
        };

        const columnRequests = [];

        // 2. Organize Tables and Views
        for (const item of schemaRes.results) {
            if (item.type === 'table') {
                overview.tables[item.name] = {
                    type: 'table',
                    name: item.name,
                    sql: item.sql,
                    columns: [],
                    indexes: [],
                    triggers: []
                };
                // Queue the column fetch
                columnRequests.push(this.#getColumns(d1, item.name, overview.tables[item.name]));
            }
            else if (item.type === 'view') {
                overview.views[item.name] = {
                    type: 'view',
                    name: item.name,
                    sql: item.sql,
                    columns: []
                };
                columnRequests.push(this.#getColumns(d1, item.name, overview.views[item.name]));
            }
        }

        // 3. Wait for all PRAGMA queries to finish
        await Promise.all(columnRequests);

        // 4. Associate Indexes and Triggers with their parents
        for (const item of schemaRes.results) {
            if (item.type === 'index' && overview.tables[item.tbl_name]) {
                overview.tables[item.tbl_name].indexes.push(item);
            }
            else if (item.type === 'trigger' && overview.tables[item.tbl_name]) {
                overview.tables[item.tbl_name].triggers.push(item);
            }
        }

		return overview;*/
    }
	/*async #getColumns(d1, tableName, targetObj) {
        // PRAGMA table_info returns: cid, name, type, notnull, dflt_value, pk
        const res = await d1.prepare(`PRAGMA table_info("${tableName}")`).all();
        if (res.success) {
            targetObj.columns = res.results;
        }
	}*/

    async query(d1, data) {
        const sql = data.query || data.get('query');
        // Always use .all() for a generic editor so we see results
        const result = await d1.prepare(sql).all();
        return result;
    }
    async addMigration() {
        // Logic to apply migration
    }
    async removeMigration() {
        // Logic to revert? (D1 doesn't strictly support down-migrations easily yet)
    }
}
