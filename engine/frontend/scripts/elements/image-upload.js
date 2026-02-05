import { Index, IO } from '../frontend.js';

export class ImageUpload extends HTMLElement {
    #template;
    #internals;
    #context;
	#fill = 'false';
	#currentSrc = null;
    constructor() {
        super();
        this.#internals = this.attachInternals();
		this.#template = Index.getTemplate('image-upload');
        this.attachShadow({ mode: 'open', delegatesFocus: true });
    }
    static get formAssociated() {
		return true;
	}
    static get observedAttributes() {
		return ['width', 'height', 'fill'];
	}
	/*set name(value) {
		this.setAttribute('name',value);
	}
    get name() {
		return this.getAttribute('name');
	}
    set width(value) {
		this.#setObservedAttribute('width',value);
	}
    get width() {
		return this.getAttribute('width');
	}
    set height(value) {
		this.#setObservedAttribute('height',value);
	}
    get height() {
		return this.getAttribute('height');
	}
	set fill(value) {
		this.#setObservedAttribute('fill',value);
	}
	get fill() {
		return this.getAttribute('fill');
	}
    #setObservedAttribute(key, value) {
        value = String(value);
        if (this.getAttribute(key) !== value) {
            this.setAttribute(key, value);
        }
    }*/
	get #fillColor() {
		switch (true) {
			case this.#fill === 'false':
				return false;
			case this.#fill === 'true':
			case this.#fill === '':
				return '#ffffff';
			default:
				return this.#fill;
		}
	}
    attributeChangedCallback(name, oldValue, newValue) {
        switch (name) {
            case 'width':
            case 'height':
                this.#template.canvas[name] = newValue;
                break;
			case 'fill':
				this.#fill = newValue || 'false';
				if (this.#fill !== 'false') {
					this.style.setProperty('--fill-color', this.#fill === 'true' ? '#ffffff' : this.#fill);
				} else {
					this.removeAttribute('style');
				}
                break;
        }
		if (this.#currentSrc) {
			this.#processImage(this.#currentSrc.type, this.#currentSrc.src);
		}
    }
    connectedCallback() {
        this.shadowRoot.appendChild(this.#template.fragment);
        this.#context = this.#template.canvas.getContext('2d');
		this.#template.input.addEventListener('change', this);
        this.#template.container.addEventListener('click', this);
        this.#template.container.addEventListener('dragover', this);
        this.#template.container.addEventListener('dragleave', this);
        this.#template.container.addEventListener('drop', this);
    }
	validateMimeTypes(item) {
		return item.kind === 'file' && item.type.startsWith('image/');
	}
    handleEvent(event) {
        switch (event.type) {
            case 'click':
                this.#template.input.click();
                break;
            case 'dragover':
                event.preventDefault();
                const valid = Array.from(event.dataTransfer.items).every(this.validateMimeTypes);
                this.#highlight(valid);
                break;
            case 'dragleave':
                this.#highlight(null);
                break;
            case 'drop':
                event.preventDefault();
                this.#highlight(null);
                if (event.dataTransfer.files.length) {
                    this.upload(event.dataTransfer.files[0]);
                }
                break;
            case 'change':
                if (event.target.files.length) {
                    this.upload(event.target.files[0]);
                }
                event.target.value = '';
                break;
        }
    }
    #highlight(state) {
        this.#template.container.dataset.over = state;
    }
    #loadImage(src) {
		const promise = (resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            img.onload = () => resolve(img);
            img.onerror = (err) => reject(err);
            img.src = src;
        }
        return new Promise(promise);
    }
	#calculateLayout(imgW, imgH, maxW, maxH, fill, allowUpscale = false) {
		let scale = Math.min(maxW / imgW, maxH / imgH);
		if (!allowUpscale) {
			scale = Math.min(scale, 1);
		}
		const w = Math.floor(imgW * scale);
		const h = Math.floor(imgH * scale);
		if (fill) {
			return {
				width: w,
				height: h,
				x: (maxW - w) / 2,
				y: (maxH - h) / 2,
				canvasWidth: maxW,
				canvasHeight: maxH
			};
		} else {
			return {
				width: w,
				height: h,
				x: 0,
				y: 0,
				canvasWidth: w,
				canvasHeight: h
			};
		}
	}
	async #processImage(type, src) {
		this.#currentSrc = { type, src };
		const maxWidth = parseInt(this.width) || 512;
		const maxHeight = parseInt(this.height) || 512;
		const isSvg = type === 'image/svg+xml';
		const image = await this.#loadImage(src);
		const layout = this.#calculateLayout(
			image.width,
			image.height,
			maxWidth,
			maxHeight,
			this.#fillColor ? true : false,
			isSvg
		);

		let resultSrc = src;
		let finalWidth = layout.canvasWidth;
		let finalHeight = layout.canvasHeight;

		if (isSvg) {
			this.#template.container.dataset.state = 'svg';
			this.#template.preview.src = src;

			if (this.#fillColor == false) {
	            finalWidth = layout.width;
	            finalHeight = layout.height;
	        }

			if (!src.startsWith('data:')) {
				try {
					const response = await fetch(src);
					const blob = await response.blob();
					const promise = (resolve, reject) => {
						const reader = new FileReader();
						reader.onload = () => resolve(reader.result);
						reader.onerror = reject;
						reader.readAsDataURL(blob);
					};
					resultSrc = await new Promise(promise);
				} catch (error) {
					console.error(error);
					IO.log('reject','SVG Fetch Error: '+src);
				}
			}
		} else {
			this.#template.container.dataset.state = 'image';
			this.#template.canvas.width = layout.canvasWidth;
			this.#template.canvas.height = layout.canvasHeight;
			this.#context.clearRect(0, 0, layout.canvasWidth, layout.canvasHeight);
			if (this.#fillColor) {
				this.#context.fillStyle = this.#fillColor;
				this.#context.fillRect(0, 0, layout.canvasWidth, layout.canvasHeight);
			}
			this.#context.drawImage(image, layout.x, layout.y, layout.width, layout.height);
			resultSrc = this.#template.canvas.toDataURL('image/png');
		}
		return {
			type: type,
			sizes: finalWidth + 'x' + finalHeight,
			form_factor: finalWidth > finalHeight ? 'wide' : 'narrow',
			src: resultSrc,
			fill: this.#fillColor
		};
	}
	async upload(file) {
		if (!file) return;
        try {
            let src;
			let type = file.type;
            let fileMetadata = {};

			switch (true) {
				case file instanceof File:
					fileMetadata = {
	                    name: file.name,
	                    size: file.size,
	                    type: file.type,
	                    lastModified: file.lastModified
	                };
					const promise = (resolve) => {
	                    const reader = new FileReader();
						reader.onload = event => resolve(event.target.result);
	                    reader.readAsDataURL(file);
	                }
					src = await new Promise(promise);
					break;
				case file.type.startsWith('image/') === false:
					throw new Error('Not an image.');
				default:
					fileMetadata = { ...file };
					src = window.location.href.replace(/\/$/, '') + '/local-image?path=' + encodeURIComponent(file.src);
			}

            const processedData = await this.#processImage(type, src);
			const combined = { ...fileMetadata, ...processedData };

			const json = JSON.stringify(combined);
            this.#internals.setFormValue(json);

			const options = {
                detail: combined,
                bubbles: true
            };
			const event = new CustomEvent('change', options);
            this.dispatchEvent(event);

            return combined;

        } catch (error) {
            IO.console('reject', error);
            throw error;
        }
    }
}

window.customElements.define('image-upload', ImageUpload);
