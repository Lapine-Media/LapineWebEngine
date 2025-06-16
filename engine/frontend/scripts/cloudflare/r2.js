
import { Settings,Index,IO,Overlay,Bindings,R2Bucket } from '../frontend.js';

const methods = {
	listR2Buckets: function(data) {
		const fragment = document.createDocumentFragment();
		const bindings = Object.values(Settings.bindings);
		for (const item of data) {
			item.type = 'r2_buckets';
			item.binding = bindings.find(values => values[values.item] == item.name);
			const element = new R2Bucket(item);
			fragment.append(element);
		}
		Index.update(Index.elements.subpage.r2_buckets,fragment);
	}
}

export const R2 = new class {
	constructor() {
		window.addEventListener('r2',this,false);
	}
	async handleEvent(event) {
		try {
			switch (event.detail.name+' '+event.detail.value) {
				case 'menu visible':
					if (Settings.r2list) {
						methods.listR2Buckets(Settings.r2list);
					} else {
						IO.send('r2','buckets','list',null);
					}
					break;
				case 'buckets loaded':
					Settings.r2list = event.detail.data.result.buckets;
					methods.listR2Buckets(event.detail.data.result.buckets);
					break;
				case 'buckets create options':
					Overlay.open('Create R2 bucket','/markup/cloudflare/r2_create.html',null);
					break;
				case 'buckets create confirm': {
					const exist = Settings.r2list.find(item => item.name == event.detail.data.name);
					if (/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(event.detail.data.name) == false) {
						const message = IO.getMessage('reject','Not a valid name','Only use lower case letters, numbers, and hyphens.');
						message.display();
					} else if (exist) {
						const message = IO.getMessage('reject','Bucket already exist','The bucket needs another name.');
						message.display();
					} else {
						IO.send('r2','buckets','create',event.detail.data);
						Overlay.close();
					}
				} break;
				case 'buckets created': {
					const message = IO.getMessage('accept','Bucket created','You now have an R2 bucket named "'+event.detail.data.name+'".');
					message.display();
					IO.send('r2','buckets','list',null);
				} break;
				case 'buckets remove options':
					Overlay.open('Remove R2 bucket','/markup/cloudflare/r2_remove.html',null);
					break;
				case 'buckets remove confirm': {
					const bucket = Settings.r2list.find(item => item.name == event.detail.data.name);
					if (!bucket) {
						const message = IO.getMessage('reject','Error','Bucket "'+event.detail.data.name+'" does not exist.');
						message.display();
					} else {
						IO.send('r2','buckets','remove',bucket);
						Overlay.close();
					}
				} break;
				case 'buckets removed': {
					const message = IO.getMessage('accept','Bucket removed','Any bindings have also been removed.');
					message.display(true);
					IO.send('r2','buckets','list',null);
				} break;
				case 'editor start options':
				case 'editor start confirm':
					event.detail.data.context = 'r2';
					IO.send('cloudflare','editor','start',event.detail.data);
					break;
				case 'editor started':
					methods.editor = event.detail.data;
					await Index.openLink('/markup/cloudflare/r2_editor.html','editor');
					IO.send('r2','objects','list',event.detail.data);
					document.body.dataset.editor = true;
					break;
				case 'editor stop':
					IO.send('cloudflare','editor','stop',null);
					break;
				case 'editor stopped':
					document.body.dataset.editor = false;
					break;
				case 'objects list':
					console.log(event.detail.data);
					break;
				case 'objects upload options':
					const elements = await Overlay.open('Upload file to R2','/markup/cloudflare/r2_upload.html');
					const form = document.forms.r2_upload;
					form.elements.file.onchange = event => {
						const file = event.target.files[0];
						form.elements.name.value = file.name;
						form.elements.contentType.value = file.type;
					}
					break;
				case 'objects upload confirm':
					const name = event.detail.data.get('name');
					IO.log('accept','Uploading file to bucket...');
					IO.log('normal',name);
					const result = IO.worker('upload',event.detail.data);
					console.log(result);
					IO.log('accept','Done!');
					IO.log('line');
					Overlay.close();
					break;
				case 'objects upload complete':
					console.log(event.detail.data);
					break;
				default:
					console.log(event.detail);
			}
		} catch (error) {
			console.log(error);
		}
	}
}
