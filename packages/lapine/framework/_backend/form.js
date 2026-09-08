
export class FormError extends Error {
	constructor(field,key,options) {

		super(field+':'+key,options);

		if (Error.captureStackTrace) {
			Error.captureStackTrace(this,FormError);
		}

		this.name = 'invalid';
		this.detail = {
			type: 'reject',
			field: field,
			key: key
		};
	}
}

export class Validation {
	constructor(input) {
		this.input = input;
	}
	missing(value) {
		switch (value) {
			case '':
			case null:
			case undefined:
				return true;
		}
		return false;
	}
	string(key,required,min = 0, max = 0) {

		const value = this.input[key];

		if (this.missing(value) && required) {
			throw new FormError(key,'valueMissing');
		}

		if (min > 0 && value.length < min) {
			throw new FormError(key,'tooShort');
		}

		if (max > 0 && value.length > max) {
			throw new FormError(key,'tooLong');
		}

	}
	mail(key,required) {

		// regex kopierad från whatwg.org och justerad för att ej tillåta repeterade punkter.
		// även justerad med dubbla escape characters för att fungera med eslint no-useless-escape.
		// https://html.spec.whatwg.org/multipage/input.html#valid-e-mail-address
		const pattern = new RegExp('^[a-zA-Z0-9!#$%&\'*+\\/=?^_`{|}~-]+(?:\\.[a-zA-Z0-9!#$%&\'*+\\/=?^_`{|}~-]+)*@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$');
		const value = this.input[key];

		if (this.missing(value) && required) {
			throw new FormError(key,'valueMissing');
		}

		if (pattern.test(value) == false) {
			throw new FormError(key,'patternMismatch');
		}

	}
	token(key,required) {

		const value = this.input[key];

		if (this.missing(value) && required) {
			throw new FormError(key,'valueMissing');
		}

		const object = Session.verifyToken(value);

		if (object.error) {
			throw new FormError(key,object.error);
		}

		this.input[key] = object;

	}
	ssn(key,required) {

		// regex bör kontrolleras mot skatteverkets exempelfiler för personnummer och samordningsnummer.
		// observera att ytterligare beräkningar krävs för att validera giltighet utöver format.
		// https://www7.skatteverket.se/portal/apier-och-oppna-data/utvecklarportalen?dataresurs=oppna-data&dataresurs=oppna-data-api&q=personnummer
		const pattern = new RegExp('^(19|20)?[0-9]{2}[- ]?((0[1-9])|(10|11|12))[- ]?(([06][1-9])|([1278][0-9])|([39][0-1]))[-+ ]?([0-9]{4})$');
		let value = this.input[key];
		let sum = 0;

		if (this.missing(value) && required) {
			throw new FormError(key,'valueMissing');
		}

		value = value.replace(/\D/g,'');

		if (pattern.test(value) == false) {
			throw new FormError(key,'patternMismatch');
		}

		switch (value.length) {
			case 0:
				throw new FormError(key,'patternMismatch');
			case 10:
				let year = value.substring(0,2);
				let date = new Date().getFullYear().toString();
				let century = '20'+year > date ? '19' : '20';
				value = century+value;
			default:
				for (let i = 11; i >= 2; i -= 1) {
					let digit = parseInt(value[i],10);
					if (i%2 == 0) {
						digit *= 2;
						digit -= (digit > 9) ? 9 : 0;
					}
					sum += digit;
				}
				if (sum%10 != 0) {
					throw new FormError(key,'patternMismatch');
				}
		}

	}
	checked(key,required) {

		const value = this.input[key];

		if (this.missing(value) && required) {
			throw new FormError(key,'optionMissing');
		}

	}
	select(key,required,options = null) {

		const value = this.input[key];

		if (options != null) {
			if (this.missing(value)) {
				throw new FormError(key,'optionMissing');
			} else if (options.includes(value) == false) {
				throw new FormError(key,'stepMismatch');
			}
		}

	}
	passwords(password1,password2) {

		const value1 = this.input[password1];
		const value2 = this.input[password2];

		switch (true) {
			case this.missing(value1):
				throw new FormError(password1,'valueMissing');
			case this.missing(value2):
				throw new FormError(password2,'valueMissing');
			case value1 != value2:
				throw new FormError(password2,'patternMismatch');
		}

	}
	file(key,required) {

		const value = this.input[key];

		if (required) {
			switch (true) {
				case this.missing(value):
					throw new FormError(key,'optionMissing');
				case this.missing(value.name):
				case this.missing(value.size):
				case this.missing(value.type):
				case this.missing(value.data):
					throw new FormError(key,'badInput');
				//file type
				//file size
			}
		}

	}
}
