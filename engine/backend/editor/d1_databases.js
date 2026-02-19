
import Editor from './editor.js';

export default new class extends Editor {
    constructor() {
		super();
	}
	async list(binding, data) {
		const query = `
            SELECT type, name, tbl_name, sql
            FROM sqlite_schema
            WHERE name NOT LIKE 'sqlite_%'
            AND name NOT LIKE '_cf_%'
            ORDER BY type, name
        `;
		data.set('query',query);
		return await this.query(binding,data);
	}
	async query(binding, data) {
		const query = data.get('query');
        const response = await binding.prepare(query).all();
        return response;
    }
    async addMigration() {

    }
    async removeMigration() {

    }
}
