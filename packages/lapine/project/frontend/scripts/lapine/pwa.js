
export default {
	static: {
		cache: 'static-v1',
		limit: 0,
		urls: [
			'./',
			'./data/manifest.webmanifest',
			'./data/sitemap.json',
			'./graphics/favicon.svg',
			'./markup/frames/frame.html',
			'./markup/pages/index.html',
			'./scripts/frontend.js',
			'./scripts/index.js',
			'./styles/base.js',
			'./styles/index.js'
		]
	},
	pages: {
		cache: 'pages-v1',
		limit: 20,
		urls: []
	},
	images: {
		cache: 'images-v1',
		limit: 30,
		urls: []
	}
}
