#!/usr/bin/env node

import prompts from 'prompts';
import fs from 'fs/promises';
import path from 'path';
import { spawnSync } from 'child_process';

const helpers = {
	console: function(type,message) {
		const s = '\x1b[48;5;91m \x1b[';
		const e = '\x1b[0m';
		switch (type) {
			case 'begin':
				this.console('purple','////////// LAPINE WEB ENGINE //////////');
				break;
			case 'end':
				this.console('purple','///////////////////////////////////////');
				break;
			case 'line':
				this.console('purple','---------------------------------------');
				break;
			case 'purple':
				console.log(s+'0m\x1b[38;5;91m\x1b[1m '+message+' '+e);
				break;
			case 'log':
				console.log(s+'0m '+message);
				break;
			case 'reject':
				console.log(s+'0m\x1b[38;5;9m '+message+e);
				break;
			case 'accept':
				console.log(s+'0m\x1b[38;5;10m '+message+e);
				break;
			case 'danger':
				console.log(s+'0m\x1b[38;5;214m '+message+e);
				break;
			case 'inform':
				console.log(s+'0m\x1b[38;5;39m '+message+e);
				break;
			case 'prompt':
				return '\x1b[0m\x1b[38;5;229m'+message+e;
			default:
				console.log(s+'0m\x1b[38;5;229m '+message+e);
		}
	},
	validateWorkerName: function(name) {
		switch (true) {
			case typeof name !== 'string' || name.length === 0:
				return 'Name is required.';
			case name.length > 63:
				return 'Must be 63 characters or fewer (DNS label limit).';
			case !/^[a-z0-9-]+$/.test(name):
				return 'Only lowercase letters, digits, and hyphens are allowed.';
			case name.startsWith('-') || name.endsWith('-'):
				return 'Cannot start or end with a hyphen.';
			default:
				return true;
		}
	},
	validateFolderName: async function(name) {
		switch (true) {
			case typeof name !== 'string' || name.length === 0:
				return 'Name is required.';
			case name.length > 100:
				return 'Must be 100 characters or fewer.';
			case name === '.' || name === '..':
				return 'Cannot be "." or "..".';
			case !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(name):
				return 'Use letters, digits, hyphens, underscores, or dots. Must start with a letter or digit.';
			case name.endsWith('.git'):
				return 'Avoid the ".git" suffix (GitHub strips it automatically).';
			default:
				try {
					await fs.stat(name);
					return 'Directory "'+name+'" already exists.';
				} catch {
					return true;
				}
		}
	},
	toWorkerName: function(input) {
		return input
		.toLowerCase()
		.replace(/[^a-z0-9-]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 63);
	},
	getNames: async function() {
		const argName = process.argv[2] ?? 'my-lapine-app';
		const queries = [
			{
				type: 'text',
				name: 'workerName',
				message: this.console('prompt','Project name (Cloudflare Worker name):'),
				initial: this.toWorkerName(argName),
				validate: this.validateWorkerName
			},
			{
				type: 'text',
				name: 'folderName',
				message: this.console('prompt','Folder name (GitHub project name):'),
				initial: previous => previous,
				validate: this.validateFolderName
			}
		];
		const answers = await prompts(queries);
		if (!answers.workerName || !answers.folderName) {
			this.console('danger','Cancelled.');
			process.exit(0);
		}
		return answers;
	},
	createFolder: async function(folderName) {
		const options = { recursive: true };
		await fs.mkdir(folderName,options);
	},
	spawn: function(command) {
		const options = {
			shell: true,
			stdio: 'inherit'
		};
		const result = spawnSync(command,options);
		if (result.status !== 0) {
			throw new Error('Command "'+command+'" failed with code '+result.status);
		}
	},
	cloneDirectory: async function(workerName) {
		const lapineDirectory = path.join('node_modules','lapine','project');
		const options = {
			recursive: true,
			force: false
		};
		await fs.cp(lapineDirectory,'.',options);
	},
	replaceData: async function(fileName,data) {
		const content = await fs.readFile(fileName);
		const object = JSON.parse(content);
		Object.keys(data).map(key => object[key] = data[key]);
		const string = JSON.stringify(object,null,'\t');
		await fs.writeFile(fileName,string);
	},
	promptStart: async function(folderName) {
		const prompt = {
			type: 'confirm',
			name: 'startNow',
			message: this.console('prompt','Start lapine now?'),
			initial: true
		};
		const { startNow } = await prompts(prompt);
		if (startNow) {
			this.spawn('npx lapine start',folderName);
		}
	}
}

async function setup() {

	helpers.console('begin');
	helpers.console('normal','Welcome! Let\'s decide some names:');
	const { workerName,folderName } = await helpers.getNames();
	helpers.console('line');

	helpers.console('normal','Creating project folder...');
	await helpers.createFolder(folderName);
	process.chdir(folderName);

	helpers.console('normal','Installing Lapine Web Engine...');
	//helpers.spawn('npm install lapine --save-dev');

	helpers.console('normal','Installing Cloudflare\'s Wrangler CLI...');
	//helpers.spawn('npm install wrangler --save-dev');
	helpers.console('line');

	helpers.console('normal','Installations complete, proceeding with setup...');
	//await helpers.cloneDirectory();

	//devDependencies
	
	const data = {
		package: {
			name: workerName
		},
		wrangler: {
			name: workerName,
			compatibility_date: '2025-12-30'
		}
	};

	helpers.console('normal','Creating package.json...');
	helpers.replaceData('package.json',data.package);

	helpers.console('normal','Creating wrangler.json...');
	helpers.replaceData('wrangler.json',data.wrangler);

	helpers.console('normal','Setup complete.');
	helpers.console('line');
	helpers.console('inform','To start Lapine Web Engine in the future:');
	helpers.console('inform','1. "cd" into the project folder');
	helpers.console('inform','2. type "npx lapine start"');
	helpers.console('line');

	await helpers.promptStart();

	helpers.console('end');

};

setup();
