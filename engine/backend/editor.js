/*
{
  success: true,
  meta: {
    served_by: 'miniflare.db',
    duration: 1,
    changes: 0,
    last_row_id: 0,
    changed_db: false,
    size_after: 8192,
    rows_read: 1,
    rows_written: 0
  },
  results: [
    {
      type: 'table',
      name: '_cf_METADATA',
      tbl_name: '_cf_METADATA',
      rootpage: 2,
      sql: 'CREATE TABLE _cf_METADATA (\n' +
        '        key INTEGER PRIMARY KEY,\n' +
        '        value BLOB\n' +
        '      )'
    }
  ]
}
*/

const d1_databases = {
	list: async function(d1,data) {
		const query = [
			'SELECT name, type',
			'FROM sqlite_master',
			'WHERE type IN ("table", "index", "view", "trigger")',
				'AND name NOT LIKE "sqlite_%"',
				'AND name NOT LIKE "_cf_%"',
				'AND sql IS NOT NULL',
			'ORDER BY type, name'
		].join(' ');
		const statement = d1.prepare(query);
		return await statement.run();
	},
	query: async function(d1,data) {
		const query = data.get('query');
		const statement = d1.prepare(query);
		return await statement.run();
	},
	addMigration: async function() {

	},
	removeMigration: async function() {

	}
}

const r2_buckets = {
	list: async function(r2,data) {

		const options = {
			limit: 500,
			include: ['httpMetadata','customMetadata'],
			//cursor
		};
		const listed = await r2.list(options);
		console.log(listed);
		/*let truncated = listed.truncated;
		let cursor = truncated ? listed.cursor : undefined;

		while (truncated) {
			const o = {
				...options,
				cursor: cursor
			};
			const next = await r2.list(o);
			listed.objects.push(...next.objects);

			truncated = next.truncated;
			cursor = next.cursor;
		}*/

		return listed;

	},
	upload: async function(r2,data) {
		/*
		cacheControl: ""
		cacheExpiry: ""
		contentDisposition: "inline"
		contentEncoding: ""
		contentLanguage: ""
		contentType: ""
		customMetadata: ""
		file: File {
			lastModified: 1747265895673
			lastModifiedDate: Thu May 15 2025 01:38:15 GMT+0200 (Central European Summer Time) {}
			name: "177965751-origpic-1a26ad.jpg"
			size: 804040
			type: "image/jpeg"
			webkitRelativePath: ""
		}
		jurisdiction: "default"
		name: ""
		storageClass: "Standard"
		target: "local"
		*/

		try {
			const entries = data.entries();
			const options = Object.fromEntries(entries);
			if (options.customMetadata) {
				options.customMetadata = JSON.parse(options.customMetadata);
			} else {
				options.customMetadata = {};
			}
			const file = data.get('file');
			const body = await file.arrayBuffer();
			return await r2.put(file.name,body,options);
		} catch (error) {
			console.log(error);
			throw error;
		}

	},
	download: async function() {

	},
	remove: async function() {

	}
}

export default {
	async fetch(request,env) {
		try {
			const url = new URL(request.url);
			const context = env.context == 'd1_databases' ? d1_databases : r2_buckets;
			const method = url.pathname.split('/')[1];
			const binding = env[BINDING];
			const type = request.headers.get('Content-Type');
			let data = {};
			switch (true) {
				case type == null:
					break;
				case type.includes('multipart/form-data'):
					data = await request.formData();
					break;
				case type.includes('application/json'):
					data = await request.json();
					break;
			}
			const result = await context[method](binding,data);
			const options = {
				status: 200,
				statusText: 'OK',
				headers: {
					'Access-Control-Allow-Origin': 'http://127.0.0.1:3000'
				}
			};
			return Response.json(result,options);
		} catch (error) {
			console.log(error);
			const options = {
				status: 500,
				statusText: 'Editor error'
			};
			const body = {
				error: error.toString()
			}
			return Response.json(body,options);
		}
	}
}
