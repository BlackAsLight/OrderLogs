import { Command, FlagBoolean, FlagString, Parser } from 'https://deno.land/x/flags@0.0.3/mod.ts'
import { merge } from "./mod.ts"

new Parser(new Command({
	use: 'main.ts',
	short: 'Merge several log files and zipped them up.',
	long: 'Merge several log files into one and zipped up. Logs are all sorted by TimeStamp.',
	prepare(flags) {
		flags.bool({
			name: 'version',
			short: 'v',
			usage: 'Print app\'s version.'
		})
		flags.string({
			name: 'in-dir',
			usage: 'Directory to find the log files in.'
		})
		flags.string({
			name: 'out-dir',
			usage: 'Optional: Directory to output the merged and zipped log files.'
		})
		flags.bool({
			name: 'del-src',
			usage: 'Will delete the source log files used once merging has completed.'
		})
		return async function (_args) {
			if ((flags.find('version') as FlagBoolean).value)
				return console.log('Version: v2.0.0')

			console.log((
				await merge(
					(flags.find('in-dir') as FlagString).value,
					(flags.find('out-dir') as FlagString).value || (flags.find('in-dir') as FlagString).value,
					(flags.find('del-src') as FlagBoolean).value
				)).toLocaleString('en-US', { maximumFractionDigits: 2 }) + 'ms')
		}
	}
})).parse(Deno.args)
