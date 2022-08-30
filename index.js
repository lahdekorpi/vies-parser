// JavaScript implementation of https://github.com/sunkaflek/vies-parser

export class ViesParser {
	// Returns currently supported countries. Not all countries return all data, see RO for example
	get_supported_countries() {
		return ["SK", "NL", "BE", "FR", "PT", "IT", "FI", "RO", "SI", "AT", "PL", "HR", "EL", "DK", "EE", "CZ"];
	}

	get_parsed_address(vat_number, address, config_flags = []) {
		address = address.trim();
		const vat = vat_number.trim();
		const country_code = vat.substr(0, 2);
		const newlines = address.split("\n").length - 1;

		/*
        Only attempt parsing for countries tested, the rest returns false

        -DE does not return address on VIES at all
        -IE has pretty much unparsable addresses in VIES - split by commas, in different orders, without zip codes, often without street number etc
        -ES VIES does not return address unless you tell it what it is
        -RO does not have ZIP codes in VIES data, but we parse the rest. ZIP will return false - needs to be input by customer manualy
        -EL additionaly gets transliterated to English characters (resulting in Greeklish)
        */
		if (!this.get_supported_countries().includes(country_code)) {
			return false;
		}

		if (newlines === 1 && ["NL", "BE", "FR", "FI", "AT", "PL", "DK"].includes(country_code)) {
			// Countries in expected format
			const address_split = address.split("\n");
			const street = address_split[0];
			const [zip, city] = address_split[1].split(" ");
			return {
				address,
				street: street.trim(),
				zip: zip.trim(),
				city: city.trim(),
				country_code: country_code.trim()
			};
		}

		// Slovenia has everything on one line, split by comma, but seems fairly regular
		if (newlines === 0 && ["SI", "HR"].includes(country_code)) {
			const address_split = address.split(",");
			let street = address_split[0];
			if (address_split.length === 3) {
				street = street + ", " + address_split[1].trim();
			} // sometimes they have aditional thing after street, seems to be city, but better not to omit
			const [zip, city] = address_split[address_split.length - 1].trim();
			return {
				address,
				street: street.trim(),
				zip: zip.trim(),
				city: city.trim(),
				country_code: country_code.trim()
			};
		}

		if (newlines === 0 && ["EL"].includes(country_code)) {
			address = this.make_greeklish(address);
			const hyphen_pos = address.indexOf(" - ");
			const city = address.substr(hyphen_pos + 3);
			const address_without_city = address.substr(0, hyphen_pos);
			const zip_pos = address_without_city.indexOf(" ");
			const zip = address_without_city.substr(zip_pos + 1);
			const address_without_zip_and_city = address_without_city.substr(0, zip_pos);
			const street = address_without_zip_and_city.trim();

			return {
				address,
				street: street.trim(),
				zip: zip.trim(),
				city: city.trim(),
				country_code: country_code.trim()
			};
		}

		// Romania does not have ZIP codes in VIES data
		if (newlines === 1 && country_code === "RO") {
			const address_split = address.split("\n");
			const street = address_split[1].trim();
			const city = address_split[0].trim();
			return {
				address,
				street: street.trim(),
				zip: false,
				city: city.trim(),
				country_code: country_code.trim()
			};
		}

		// Romania does not have ZIP codes in VIES data
		// With 3 lines, it has apartement in the last line - we put it on the start of street line
		if (newlines === 2 && country_code === "RO") {
			const address_split = address.split("\n");
			const street = address_split[2].trim() + ", " + address_split[1].trim();
			const city = address_split[0].trim();
			return {
				address,
				street: street.trim(),
				zip: false,
				city: city.trim(),
				country_code: country_code.trim()
			};
		}

		if (newlines === 1 && country_code === "IT") {
			const address_split = address.split("\n");
			const street = address_split[0];
			const [zip, city] = address_split[1].split(" ");
			return {
				address,
				street: street.trim(),
				zip: zip.trim(),
				city: city.trim(),
				country_code: country_code.trim()
			};
		}

		if (newlines === 2 && country_code === "PT") {
			const address_split = address.split("\n");
			const street = address_split[0];
			const city = address_split[1];
			const [zip] = address_split[2].split(" ");
			return {
				address,
				street: street.trim(),
				zip: zip.trim(),
				city: city.trim(),
				country_code: country_code.trim()
			};
		}

		// in these cases the first line is "name of the place", not exactly street, but for ordering something to this address you put in in the street line
		if (newlines === 2 && country_code === "FR") {
			const address_split = address.split("\n");
			const street = address_split[0] + ", " + address_split[1];
			const [zip, city] = address_split[2].split(" ");
			return {
				address,
				street: street.trim(),
				zip: zip.trim(),
				city: city.trim(),
				country_code: country_code.trim()
			};
		}

		if (newlines === 2 && country_code === "SK") {
			// Vetsina SK address
			const address_split = address.split("\n");
			const street = address_split[0];
			// eslint-disable-next-line prefer-const
			let [zip, city] = address_split[1].split(" ");
			if (config_flags.includes("sk_delete_mc")) {
				city = city.replace("mestská časť ", "");
				city = city.replace("m. č. ", "");
			}
			return {
				address,
				street: street.trim(),
				zip: zip.trim(),
				city: city.trim(),
				country_code: country_code.trim()
			};
		}

		if (newlines === 1 && country_code === "SK") {
			// vetsinou ma tenhle format Bratislava
			const address_split = address.split("\n");
			let street = address_split[0];
			let [zip, city] = ["", ""];
			if (address_split[1] === "Slovensko") {
				[zip, city] = address_split[0].split(" ");
				street = ""; // v techto pripadech nemame ulici a cislo popisne, tj. nesmime prepisovat
			} else {
				[zip, city] = address_split[1].split(" ");
			}

			if (config_flags.includes("sk_delete_mc")) {
				city = city.replace("mestská časť ", "");
				city = city.replace("m. č. ", "");
			}

			return {
				address,
				street: street.trim(),
				zip: zip.trim(),
				city: city.trim(),
				country_code: country_code.trim()
			};
		}

		if (newlines === 0 && country_code === "EE" && address.indexOf("  ") !== -1) {
			let address_split = address.split("  ");
			// sometimes they have more than 2 space as divider, we trim the additional ones here
			address_split = address_split.map(value => value.trim());
			const street = address_split[0];
			const [zip, city] = address_split[1].split(" ");
			return {
				address,
				street: street.trim(),
				zip: zip.trim(),
				city: city.trim(),
				country_code: country_code.trim()
			};
		}

		if (newlines === 1 && country_code === "CZ") {
			// Countries in expected format
			const address_split = address.split("\n");
			const street = address_split[0];
			const pos = address_split[1].indexOf(" ", address_split[1].indexOf(" ") + 1); // second space marks ending of ZIP code
			if (pos === false) {
				return false;
			}
			const [zip, city] = [address_split[1].substr(0, pos), address_split[1].substr(pos)];
			return {
				address,
				street: street.trim(),
				zip: zip.trim(),
				city: city.trim(),
				country_code: country_code.trim()
			};
		}

		if (newlines === 2 && country_code === "CZ") {
			// Countries in expected format
			const address_split = address.split("\n");
			const street = address_split[0] + ", ".address_split[1];
			const pos = address_split[2].indexOf(" ", address_split[2].indexOf(" ") + 1); // second space marks ending of ZIP code
			if (pos === false) {
				return false;
			}
			const [zip, city] = [address_split[2].substr(0, pos), address_split[2].substr(pos)];
			return {
				address,
				street: street.trim(),
				zip: zip.trim(),
				city: city.trim(),
				country_code: country_code.trim()
			};
		}

		return false;
	}

	// https://gist.github.com/teomaragakis/7580134
	// transliterates Greek characters to English
	make_greeklish(text) {
		const expressions = [
			[/[αΑ][ιίΙΊ]/u, "e"],
			[/[οΟΕε][ιίΙΊ]/u, "i"],
			[/[αΑ][υύΥΎ]([θΘκΚξΞπΠσςΣτTφΡχΧψΨ]|s|$)/u, "af$1"],
			[/[αΑ][υύΥΎ]/u, "av"],
			[/[εΕ][υύΥΎ]([θΘκΚξΞπΠσςΣτTφΡχΧψΨ]|s|$)/u, "ef$1"],
			[/[εΕ][υύΥΎ]/u, "ev"],
			[/[οΟ][υύΥΎ]/u, "ou"],
			[/(^|s)[μΜ][πΠ]/u, "$1b"],
			[/[μΜ][πΠ](s|$)/u, "b$1"],
			[/[μΜ][πΠ]/u, "mp"],
			[/[νΝ][τΤ]/u, "nt"],
			[/[τΤ][σΣ]/u, "ts"],
			[/[τΤ][ζΖ]/u, "tz"],
			[/[γΓ][γΓ]/u, "ng"],
			[/[γΓ][κΚ]/u, "gk"],
			[/[ηΗ][υΥ]([θΘκΚξΞπΠσςΣτTφΡχΧψΨ]|s|$)/u, "if$1"],
			[/[ηΗ][υΥ]/u, "iu"],
			[/[θΘ]/u, "th"],
			[/[χΧ]/u, "ch"],
			[/[ψΨ]/u, "ps"],
			[/[αά]/u, "a"],
			[/[βΒ]/u, "v"],
			[/[γΓ]/u, "g"],
			[/[δΔ]/u, "d"],
			[/[εέΕΈ]/u, "e"],
			[/[ζΖ]/u, "z"],
			[/[ηήΗΉ]/u, "i"],
			[/[ιίϊΙΊΪ]/u, "i"],
			[/[κΚ]/u, "k"],
			[/[λΛ]/u, "l"],
			[/[μΜ]/u, "m"],
			[/[νΝ]/u, "n"],
			[/[ξΞ]/u, "x"],
			[/[οόΟΌ]/u, "o"],
			[/[πΠ]/u, "p"],
			[/[ρΡ]/u, "r"],
			[/[σςΣ]/u, "s"],
			[/[τΤ]/u, "t"],
			[/[υύϋΥΎΫ]/u, "i"],
			[/[φΦ]/iu, "f"],
			[/[ωώ]/iu, "o"],
			[/[Α]/iu, "a"] // added as otherwise "A" kept as capitals
		];

		expressions.forEach(([regex, replacement]) => (text = text.replace(regex, replacement)));
		return text;
	}
}
