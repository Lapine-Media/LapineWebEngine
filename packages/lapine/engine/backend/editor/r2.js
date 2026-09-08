
export default new class {
    constructor() {}
    async list(r2, data) {
        const options = {
            limit: 500,
            include: ['httpMetadata', 'customMetadata']
        };
		const cursor = data instanceof FormData ? data.get('cursor') : data.cursor;
        if (cursor) options.cursor = cursor;
        const listed = await r2.list(options);
        return listed;
    }
    async upload(r2, data) {
        const file = data.get('file');
		if (!file) throw new Error('No file uploaded');
        const key = data.get('name') || file.name;
		const options = {};
        if (data.has('customMetadata')) {
            try {
                options.customMetadata = JSON.parse(data.get('customMetadata'));
            } catch (e) {
				console.warn('Invalid metadata JSON', e);
            }
        }
        if (data.has('httpMetadata')) {
             try {
                options.httpMetadata = JSON.parse(data.get('httpMetadata'));
            } catch (e) { /* ignore */ }
        }
        return await r2.put(key, file, options);
    }
    async remove(r2, data) {
        const key = data instanceof FormData ? data.get('key') : data.key;
        await r2.delete(key);
        return { success: true, key };
    }
}
