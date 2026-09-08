
export const Site = {
	url: null,
	getAsset: async function(env,path,type = null) {
		const url = new URL(path,this.url.origin);
		const result = await env.ASSETS.fetch(url);
		if (result.ok) {
			switch (type) {
				case 'text':
					return await result.text();
				case 'json':
					return await result.json();
				default:
					return result;
			}
		}
		throw new class AssetError extends Error {
			constructor() {
				super('Not found: '+path);
				this.name = 'AssetError';
			}
		}
	},
	decompress: async function(response) {
		const data = await response.arrayBuffer();
		const ds = new DecompressionStream('gzip');
		const writer = ds.writable.getWriter();
		writer.write(data);
		writer.close();
		const arrayBuffer = await new Response(ds.readable).arrayBuffer();
		return new TextDecoder().decode(arrayBuffer);
	}
}
