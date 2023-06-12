import { Command, FlagBoolean, Parser } from "https://deno.land/x/flags@0.0.3/mod.ts"

new Parser(new Command({
	use: 'main.ts',
	short: 'Merge several log files and zipped them up.',
	long: 'Merge several log files into one and zipped up. Logs are all sorted alphabetically.',
	prepare(flags) {
		flags.bool({
			name: 'version',
			short: 'v',
			usage: 'Print app\'s version'
		})
		return function (_args) {
			if ((flags.find('version') as FlagBoolean).value)
				return console.log('Version: v0.0.0')
		}
	}
})).parse(Deno.args)
