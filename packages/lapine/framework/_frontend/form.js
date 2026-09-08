
import Session from './session.js';

export class Form {
	constructor(id) {

		this.url = new URL(document.location.href);
		this.form = document.forms[id];
		this.errors = {
			valid: 'Valid',
			customError: '',
			badInput: 'Bad input detected',
			patternMismatch: 'Incomplete or wrong',
			rangeOverflow: 'The value exceeds maximum',
			rangeUnderflow: 'The value is below minimum',
			stepMismatch: 'Incorrect value',
			tooLong: 'Too many characters',
			tooShort: 'Too few characters',
			typeMismatch: 'Invalid data type',
			valueMissing: 'Please fill in this field',
			optionMissing: 'Kindly select one option'
		};
		this.patterns = {
			mail: new RegExp('^[a-zA-Z0-9!#$%&\'*+\\/=?^_`{|}~-]+(?:\\.[a-zA-Z0-9!#$%&\'*+\\/=?^_`{|}~-]+)*@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$'),
			ssn: new RegExp('^(19|20)?[0-9]{2}[- ]?((0[1-9])|(10|11|12))[- ]?(([06][1-9])|([1278][0-9])|([39][0-1]))[-+ ]?([0-9]{4})$'),
			phone: new RegExp('^[0-9 -+]+$')
		};
		this.onResponse = () => {};

		this.form.noValidate = true;
		this.form.addEventListener('submit',this,false);
		this.form.addEventListener('reset',this,false);

		for (let element of this.form.elements) {
			if (element instanceof HTMLInputElement) {
				if (this.patterns[element.pattern] != undefined) {
					element.pattern = this.patterns[element.pattern];
				}
				element.addEventListener('change',this,false);
				element.addEventListener('invalid',this,false);
			}
		}

	}
	async handleEvent(event) {

		switch (event.type) {
			case 'submit':
				event.preventDefault();
				this.clearFormState();
				await this.submit(event);
				break;
			case 'reset':
				this.clearFormState();
				break;
			case 'change':
				if (event.target.pattern == 'ssn') {
					this.checkSSN(event.target);
				} else {
					event.target.checkValidity();
				}
				break;
			case 'invalid':
				this.invalid(event.target);
				break;
		}

	}
	invalid(element) {
		switch (element.type) {
			case 'hidden':
				break;
			case 'radio':
				this.form.elements[element.name][0].setCustomValidity(this.errors.optionMissing);
				break;
			default:
				for (let error in element.validity) {
					if (element.validity[error]) {
						this.setError(element,error);
						break;
					}
				}
		}
		for (let i = 0; i < element.labels.length; i += 1) {
			if (!element.validity.valid) {
				element.labels[i].dataset.error = element.validationMessage;
			}
		}
	}
	setError(element,error) {
		const custom = this.errors[element.name];
		const message = custom && custom[error] ? custom[error] : this.errors[error];
		element.setCustomValidity(message);
	}
	checkSSN(element) {
		let ssn = element.value.replace(/\D/g, '');
		let sum = 0;
		switch (ssn.length) {
			case 0:
				this.setError(element,'patternMismatch');
				break;
			case 10:
				let year = ssn.substring(0, 2);
				let date = new Date().getFullYear().toString();
				let century = '20' + year > date ? '19' : '20';
				ssn = century + ssn;
			default:
				for (let i = 11; i >= 2; i -= 1) {
					let digit = parseInt(ssn[i], 10);
					if (i % 2 == 0) {
						digit *= 2;
						digit -= (digit > 9) ? 9 : 0;
					}
					sum += digit;
				}
				if (sum % 10 != 0) {
					this.setError(element,'patternMismatch');
				}
		}
		element.checkValidity();
	}
	async submit(event) {

		const valid = this.form.checkValidity();

		for (const element of this.form.elements) {
			if (!element.validity.valid) {
				element.labels[0].scrollIntoView();
				break;
			}
		}

		if (valid) {

			const action = this.form.getAttribute('action');
			const path = ['api',action,event.submitter.name,event.submitter.value].join('/');
			const url = new URL(path,document.baseURI);
			const formData = new FormData(this.form);
			const body = {};

			for (const [key,value] of formData) {
				if (value instanceof File) {
					let binary = '';
					const buffer = await value.arrayBuffer();
					const bytes = new Uint8Array(buffer);
					bytes.forEach(byte => binary += String.fromCharCode(byte));
					const file = {
						name: value.name,
						size: value.size,
						type: value.type,
						data: btoa(binary)
					};
					body[key] = JSON.stringify(file);
				} else {
					body[key] = value;
				}
			}

			const options = {
				method: 'POST',
				headers: {'Content-Type': 'application/json'},
				body: JSON.stringify(body)
			};
			const request = new Request(url.href,options);
			const response = await fetch(request);
			const signals = await response.json();

			await Session.update(response);

			for (const signal of signals) {
				console.log(signal);
				if (signal.detail.field) {
					this.setFormState(signal.detail);
				}
				this.onResponse(signal);
			}

		}
	}
	reset() {

	}
	setFormState(data) {
		const element = this.form.elements[data.field];
		if (element == undefined) {
			throw new Error('Missing form field: '+data.field);
		}
		element.dataset.type = data.type;
		for (const label of element.labels) {
			label.dataset.type = data.type;
			if (this.errors[data.field]) {
				if (this.errors[data.field][data.key]) {
					label.dataset.text = this.errors[data.field][data.key];
				} else {
					label.dataset.text = this.errors[data.key];
				}
			} else if (this.errors[data.key]) {
				label.dataset.text = this.errors[data.key];
			}
		}
	}
	clearFormState() {
		for (const element of this.form.elements) {
			if (element.labels) {
				delete element.dataset.type;
				for (const label of element.labels) {
					delete label.dataset.text;
					delete label.dataset.type;
				}
			}
		}
	}
}
