
export const Tools = {
	formatTimestamp: function(timestamp,timeZone = 'Europe/Paris') {
		const now = new Date(timestamp);
		const timeOptions = {
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit',
			timeZone: timeZone,
			hour12: false
		};
		const time = new Intl.DateTimeFormat('en-GB',timeOptions).format(now);
		const [day, month, year, hour, minute, second] = time.match(/\d+/g);
		return year+'-'+month+'-'+day+' '+hour+':'+minute+':'+second;
	},
	formatFileSize: function(sizeInBytes = 0) {
		const units = ['B','KB','MB','GB'];
		let index = 0;
		while (sizeInBytes >= 1024 && index < units.length - 1) {
			sizeInBytes /= 1024;
			index++;
		}
		const bytes = sizeInBytes.toFixed(2);
		return bytes+' '+units[index];
	},
	cleanSQL: function(sql) {
		//sql = sql.replace(/^\s+|\s+$/g,sql);
		const multi_lines = match => {
			let lines = match.split(/\r?\n/);
			return lines.map(() => '').join('\n');
		}
		sql = sql.replace(/\/\*[\s\S]*?\*\//g, multi_lines);
		return sql.replace(/--[^\r\n]*/g, '').trim();
	},
	/**
	* Converts a string collected from a textfield input into a valid JSON string.
	* The input string can contain array-like data with potentially non-standard
	* string quoting and escapes. The output string will be formatted as valid JSON,
	* suitable for parsing with JSON.parse().
	*
	* This function handles:
	* - Single-quoted strings, converting them to double-quoted JSON strings.
	* - SQL-style escapes for single quotes (e.g., 'It''s') within single-quoted strings.
	* - C-style escapes (e.g., '\'', '\\n', '\uXXXX') within single-quoted strings.
	* - Double-quoted strings are preserved, assuming they are already JSON-compliant or close.
	* - Other parts of the input string (like numbers, brackets, commas) are passed through.
	*
	* @param {string} inputText The input string to process.
	* @returns {string} A string formatted as valid JSON.
	*/
	cleanJSON: function(input) {
		const outputParts = [];
		const len = input.length;
		let i = 0;
		while (i < len) {
			const char = input[i];
			if (char === '\'') {
				const contentChars = [];
				i++; // Move past the opening '
				while (i < len) {
					let c = input[i];
					if (c === '\'') { // Potential end of string or SQL-style escape ''
						if (i + 1 < len && input[i + 1] === '\'') {
							contentChars.push('\'');
							i += 2;
						} else {
							i++;
							break;
						}
					} else if (c === '\\') { // C-style escape
						i++;
						if (i >= len) { contentChars.push('\\'); break; } // Unterminated escape
						c = input[i]; // The character after backslash
						switch (c) {
							case '\'': contentChars.push('\''); i++; break;
							case '"': contentChars.push('"'); i++; break;
							case '\\': contentChars.push('\\'); i++; break;
							case 'b': contentChars.push('\b'); i++; break;
							case 'f': contentChars.push('\f'); i++; break;
							case 'n': contentChars.push('\n'); i++; break;
							case 'r': contentChars.push('\r'); i++; break;
							case 't': contentChars.push('\t'); i++; break;
							case 'u': { // Block scope for hex
								// i is at 'u'
								if (i + 4 < len) { // Need 4 hex digits after 'u'
									const hex = input.substring(i + 1, i + 5);
									if (/^[0-9a-fA-F]{4}$/.test(hex)) { // Validate hex
										contentChars.push(String.fromCharCode(parseInt(hex, 16)));
										i += 5; // Consumed uXXXX
									} else {
										contentChars.push('\\u' + hex); // Invalid hex, preserve
										i += 5;
									}
								} else {
									contentChars.push('\\u'); // Not enough chars for uXXXX
									i++; // Consumed 'u'
								}
								break;
							}
							default: contentChars.push('\\' + c); i++; break; // Unrecognized escape
						}
					} else { // Normal character
						contentChars.push(c);
						i++;
					}
				}
				outputParts.push(JSON.stringify(contentChars.join('')));
			} else if (char === '"') { // Double-quoted string
				const start = i;
				i++; // Move past opening "
				while (i < len) {
					if (input[i] === '\\') {
						i++; // Skip backslash
						if (i < len) i++; else break; // Skip escaped char, or break if unterminated
					} else if (input[i] === '"') {
						i++; // Move past closing "
						break;
					} else {
						i++; // Normal char
					}
				}
				outputParts.push(input.substring(start, i)); // Append the entire "..." segment
			} else { // Non-string part
				const start = i;
				while (i < len && input[i] !== '\'' && input[i] !== '"') {
					i++;
				}
				outputParts.push(input.substring(start, i)); // Append segment
				// i is now at the next quote or end of string, main loop continues
			}
		}
		return outputParts.join('').trim();
	}
}
