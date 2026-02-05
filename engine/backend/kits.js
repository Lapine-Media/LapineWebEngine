
import IO from './io.js';
import { Tools, Cleanup, Scripts } from './tools.js';

export const Package = {
    // No more 'kit: null' here. We keep it local.

    getObjects: async function(files) {
        // 1. Initialize the container locally
        const kit = {
            scripts: [],
            templates: '',
            assets: {},
            data: {},
            comments: []
        };

        // 2. Define the processor map
        const methods = {
            '.txt': this.getText,
            '.html': this.getTemplate,
            '.js': this.getScript,
            '.css': this.getAsset,
            '.json': this.getData,
            '.svg': this.getSVG
        };

        // 3. Process all files in parallel
        // We map the files to promises that return specific partial data
        const promises = files.map(file => {
            const method = methods[file.type] || this.getAsset;
            // Pass the 'kit' reference down so handlers can push to it.
            // (Or typically we'd return data, but pushing to a passed object
            // is fine for this structure and simpler to refactor)
            return method.call(this, file, kit);
        });

        await Promise.all(promises);

        return kit;
    },

    // Note: All functions now accept 'kit' as the second argument

    getAsset: async function(file, kit) {
        kit.assets[file.name + file.type] = {
            mime: file.mime,
            data: await Tools.readFile(file.path, false, false)
        };
    },

    getText: async function(file, kit) {
        const content = await Tools.readFile(file.path, false, false);
        const separator = '/'.repeat(78 - file.name.length);
        kit.comments.push(file.name + ' ' + separator, content);
    },

    getTemplate: async function(file, kit) {
        const content = await Tools.readFile(file.path, false, false);
        kit.templates += content;
    },

    getScript: async function(file, kit) {
        // No async needed here, but keeping async signature is fine
        kit.scripts.push(file.path);
    },

    getData: async function(file, kit) {
        const content = await Tools.readFile(file.path, true, false);
        kit.data[file.name] = content;
    },

    getSVG: async function(file, kit) {
        const styles = [];
        let counter = -1;

        // Helper methods for the replace logic
        const methods = {
            collectStyles: (match, styleValue) => {
                styles.push(styleValue);
                return 'class="style' + styles.length + '"';
            },
            addStyles: (style, index) => '.style' + index + ' {' + style + '}',
            addParts: (match, tagName, rest) => {
                counter++;
                return '<' + tagName + ' part="part' + counter + '"' + rest;
            }
        };

        let content = await Tools.readFile(file.path, false, false);

        // Sanitize and Transform
        content = content.replace(/<\?xml[^>]*\?>|<!DOCTYPE[^>]*>/g, '');
        content = content.replace(/\sid="([^"]+)"/g, ' part="$1"');
        content = content.replace(/\sstyle="([^"]+)"/g, methods.collectStyles);
        content = content.replace(/<(path|circle|rect)(\s|>)/g, methods.addParts);

        const css = styles.map(methods.addStyles).join(' ');

        // Append to the passed 'kit' object
        kit.templates += [
            '<template id="' + file.name + '.svg">',
            '<style>' + css + '</style>',
            content,
            '</template>'
        ].join('');
    }
};

export const Builder = {
    // getFileList is now a pure async function
    getFileList: async function(source) {
        let list = [];
        // Note: If you really need stats (size/count), you can calculate them
        // at the end by reducing the returned list, or return { list, stats }.

        const files = await Tools.readDirectory(source, true);

        for (const file of files) {
            const path = source + '/' + file.name;

            // Skip hidden files
            if (file.name.startsWith('.') || file.name.startsWith('_')) {
                IO.log('danger', '(Ignoring ' + file.name + ')');
                continue;
            }

            if (file.isDirectory()) {
                const directory = await this.getFileList(path);
                list = list.concat(directory);
            } else {
                const data = await Tools.fileData(path);

                // You can track stats locally here if needed, or just sum them up later
                if (data.mime === undefined) {
                    IO.log('reject', 'Not allowed: ' + data.path, true);
                } else {
                    IO.log('normal', data.path, true);
                    list.push(data);
                }
            }
        }
        return list;
    },

    compileKit: async function(kit) {
        try {
            IO.log('normal', 'Merging scripts');
            kit.scripts = await Scripts.mergeScripts(kit.scripts);

            IO.log('normal', 'Minifying scripts');
            kit.scripts = await Cleanup.js(kit.scripts);

            IO.log('normal', 'Minifying styles');
            // Iterate assets to find CSS
            for (const key in kit.assets) {
                if (kit.assets[key].mime === 'text/css') {
                    kit.assets[key].data = await Cleanup.css(kit.assets[key].data);
                }
            }

            IO.log('normal', 'Minifying templates');
            kit.templates = await Cleanup.html(kit.templates); // Assuming Cleanup.html might be async?

            IO.log('normal', 'Compressing kit');
            const jsonString = JSON.stringify(kit);

            // Return the final Buffer
            return await Tools.compress(jsonString);

        } catch (error) {
            throw error;
        }
    }
};
