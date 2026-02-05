
export default new class {
    constructor() {}
	async list(d1, data) {
        // 1. Get all tables
        // We use .all() to get the actual array of rows
        const tablesQuery = `
			SELECT type, name
			FROM sqlite_master
			WHERE type IN ('table', 'index', 'view', 'trigger')
            AND name NOT LIKE 'sqlite_%'
            AND name NOT LIKE '_cf_%'
            ORDER BY type, name;
        `;
        const tables = await d1.prepare(tablesQuery).all();

        // If .all() fails or returns error structure, handle it
        if (!tables.success) throw new Error(tables.error || 'Failed to list tables');

        // 2. Get columns for each table (The "Overview")
        // We can run these in parallel
        const schema = {};

        // tables.results contains the rows
        for (const row of tables.results) {
            const tableName = row.name;
            const columns = await d1.prepare(`PRAGMA table_info("${tableName}")`).all();
            schema[tableName] = columns.results;
        }

        // Return a structured object for the UI
        return schema;
        /* Result structure:
           {
             "users": [ {name: "id", type: "INTEGER", ...}, {name: "email", ...} ],
             "posts": [ ... ]
           }
        */
    }

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
