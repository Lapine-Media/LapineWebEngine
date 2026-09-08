
import IO from './io.js';
import Tools from './tools.js';
import { parse } from 'acorn';
import { minify } from 'terser';
import MagicString, { Bundle } from 'magic-string';
import autoprefixer from 'autoprefixer';
import postcss from 'postcss';
import path from 'path';

const helpers = {
	processFile: function(source, sourceDirectory, fileDirectory, fileName) {
		const options = {
			sourceType: 'module',
			ecmaVersion: 'latest'
		};
		const ast = parse(source,options);
		const imports = [];
		const exports = new Map();
		const cuts = [];
		const constructors = [];
		const isInternal = module => module.startsWith('.') ? path.resolve(fileDirectory,module).startsWith(sourceDirectory) : false;
		const descendingOrder = (a, b) => b[0] - a[0];

		for (const node of ast.body) {
			switch (node.type) {
				case 'ImportDeclaration':
					const parsed = this.parseImportNode(node);
					if (isInternal(parsed.module) === false) {
						imports.push(parsed);
					}
					cuts.push([node.start, node.end]);
					break;
				case 'ExportNamedDeclaration':
					if (node.declaration) {
						let names = [];
						switch (node.declaration.type) {
							case 'ClassDeclaration':
								constructors.push(node.declaration.id.name);
							case 'FunctionDeclaration':
								names = [node.declaration.id.name];
								break;
							case 'VariableDeclaration':
								names = node.declaration.declarations.map(d => d.id.name).filter(Boolean);
						}
						for (const name of names) {
							exports.set(name, name);
						}
						cuts.push([node.start, node.declaration.start]);
					} else {
						for (const spec of node.specifiers) {
							exports.set(spec.local.name, spec.exported.name);
						}
						cuts.push([node.start, node.end]);
					}
					break;
				case 'ExportDefaultDeclaration':
					switch (true) {
						case node.declaration.id && node.declaration.type === 'ClassDeclaration':
						case node.declaration.id && node.declaration.type === 'FunctionDeclaration':
							exports.set(node.declaration.id.name, 'default');
							cuts.push([node.start, node.declaration.start]);
							break;
						default:
							const end = Math.min(node.end, node.start + 60);
							const line = source.slice(node.start, end);
							IO.console('danger', 'Skipping anonymous default export in '+file.name+' ('+line+')');
							cuts.push([node.start, node.end]);
					}
					break;
				case 'ExportAllDeclaration':
					if (isInternal(node.source.value) === true) {
						cuts.push([node.start, node.end]);
					}
			}
		}

		return {
			imports,
			exports,
			cuts: cuts.sort(descendingOrder),
			constructors
		};
	},
	parseImportNode: function(node) {
		const result = {
			module: node.source.value,
			default: null,
			namespace: null,
			named: new Map(),
			sideEffect: node.specifiers.length === 0,
		};
		for (const spec of node.specifiers) {
			switch (spec.type) {
				case 'ImportDefaultSpecifier':
					result.default = spec.local.name;
					break;
				case 'ImportNamespaceSpecifier':
					result.namespace = spec.local.name;
					break;
				case 'ImportSpecifier':
					if (spec.imported.type === 'Literal') {
						const string = JSON.stringify(spec.imported.value);
						result.named.set(spec.local.name,string);
					} else {
						result.named.set(spec.local.name,spec.imported.name);
					}
			}
		}
		return result;
	},
	mergeImport: function(map, imp) {
		const entry = map.get(imp.module) ?? { default: null, namespace: null, named: new Map() };
		if (imp.default && !entry.default) {
			entry.default = imp.default;
		}
		if (imp.namespace && !entry.namespace) {
			entry.namespace = imp.namespace;
		}
		for (const [local, imported] of imp.named) {
			if (!entry.named.has(local)) {
				entry.named.set(local, imported);
			}
		}
		map.set(imp.module, entry);
	},
	render: function(entry) {
		const [local,imported] = entry;
		return imported === local ? local : imported+' as '+local;
	},
	renderImports: function(map) {
		const lines = [];
		for (const [module, entry] of map) {
			const parts = [];
			if (entry.default) {
				parts.push(entry.default);
			}
			if (entry.namespace) {
				parts.push('* as '+entry.namespace);
			}
			if (entry.named.size > 0) {
				const named = [...entry.named].map(helpers.render).join(', ');
				parts.push('{ '+named+' }');
			}
			const joined = parts.join(', ');
			const string = JSON.stringify(module);
			lines.push('import '+joined+' from '+string+';');
		}
		return lines.join('\n');
	},
	renderExports: function(exports) {
		const parts = [...exports].map(helpers.render).join(', ');
		return 'export { '+parts+' };';
	}
}

export default {
	mergeJS: async function(sourceDirectory,filename,cli = false) {

		const elements = [];
		const imports = new Map();
		const exports = new Map();
		const bundle = new Bundle();
		const sources = [];
		const constructors = [];
		const list = await Tools.readDirectory(sourceDirectory,true,true);
		let count = 0;
		let size = 0;

		for (const file of list) {
			const filePath = path.join(file.parentPath,file.name);
			const data = await Tools.fileData(filePath);
			switch (true) {
				case file.name.startsWith('.'):
				case file.name.startsWith('_'):
					if (cli) {
						IO.console('danger', 'Ignoring ' + file.name);
					}
				case data.mime != 'text/javascript':
					continue;
			}

			const content = await Tools.readFile(filePath);
			const processed = helpers.processFile(content, sourceDirectory, file.parentPath, file.name);
			const ms = new MagicString(content);

			for (const imp of processed.imports) {
				helpers.mergeImport(imports, imp);
			}
			for (const [local, exported] of processed.exports) {
				if (!exports.has(local)) {
					exports.set(local, exported);
				}
			}
			for (const [start, end] of processed.cuts) {
				ms.remove(start, end);
			}

			const codeSource = {
				filename: filePath,
				content: ms
			}
			sources.push(codeSource);
			constructors.push(...processed.constructors);

			if (data.name.includes('-')) {
				const match = content.match(/export\s+(?:default\s+)?class\s+(\w+)\s+extends\s+\w+/);
				if (match) {
					elements.push('window.customElements.define(\''+data.name+'\','+match[1]+');');
				}
			}

			count += 1;
			size += data.size;

		}

		const header = helpers.renderImports(imports);
		const headerSource = {
			filename: 'imports',
			content: new MagicString(header)
		}
		bundle.addSource(headerSource);
		for (const source of sources) {
			bundle.addSource(source);
		}

		const mapOptions = { includeContent: true };
		const map = bundle.generateMap(mapOptions);
		const code = [
			bundle.toString(),
			...elements,
			'',
			exports.size === 0 ? '' : helpers.renderExports(exports)
		].filter(Boolean).join('\n\n');

		const minifyOptions = {
			sourceMap: {
				content: map.toString(),
				//filename: filename+'.js',
				url: filename
			}
		}
		const minified = await minify(code,minifyOptions);

		return { size, count, code: minified.code, map: minified.map, constructors };

	},
	mergeCSS: function(sourceDirectory) {

	},
	cleanCSS: async function(css,minify = true) {
		const plugins = [autoprefixer];
		const options = {from: undefined};
		const result = await postcss(plugins).process(css,options);
		result.warnings().forEach(warn => IO.log('reject',warn));
		css = minify == false ? result.css : result.css
			.replace(/\/\*[\s\S]*?\*\//g, '') // Remove comments
			.replace(/\s*([{}:;,])\s*/g, '$1') // Remove spaces around symbols
			.replace(/\s+/g, ' ') // Replace multiple spaces with single space
			.replace(/;}/g, '}') // Remove unnecessary semicolons before a closing brace
			.trim(); // Remove leading/trailing whitespace
		return css;
	},
	minifyHTML: function(markup) {
		return markup
			.replace(/>\s+</g, '><') // Remove whitespace between tags
			.replace(/\s{2,}/g, ' ') // Replace multiple spaces with a single space
			.replace(/<!--[\s\S]*?-->/g, '') // Remove comments
			.trim(); // Remove leading/trailing whitespace
	}
}
