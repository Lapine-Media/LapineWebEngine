
export default new class {
    constructor() {}
    async list(d1, data) {
        const query = `
            SELECT name, type
            FROM sqlite_master
            WHERE type IN ('table', 'index', 'view', 'trigger')
            AND name NOT LIKE 'sqlite_%'
            AND name NOT LIKE '_cf_%'
            ORDER BY type, name
        `;
        return await d1.prepare(query).all();
    }
    async query(d1, data) {
        const sql = data instanceof FormData ? data.get('query') : data.query;
		if (!sql) throw new Error('No query provided');
		return await d1.prepare(sql).all();
    }
    async addMigration() {
        // Logic to apply migration
    }
    async removeMigration() {
        // Logic to revert? (D1 doesn't strictly support down-migrations easily yet)
    }
}
