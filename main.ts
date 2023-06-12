import { readLines } from 'https://deno.land/std@0.191.0/io/mod.ts'
import { Command, FlagBoolean, FlagString, Parser } from 'https://deno.land/x/flags@0.0.3/mod.ts'
import { compress } from "https://deno.land/x/compress@v0.4.5/tar/mod.ts"

new Parser(new Command({
	use: 'main.ts',
	short: 'Merge several log files and zipped them up.',
	long: 'Merge several log files into one and zipped up. Logs are all sorted alphabetically.',
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
		flags.string({
			name: 'out-name',
			usage: 'Name of the out file before the .tar'
		})
		flags.bool({
			name: 'del-src',
			usage: 'Will delete the source log files used once merging has completed.'
		})
		return async function (_args) {
			if ((flags.find('version') as FlagBoolean).value)
				return console.log('Version: v1.0.0')

			let dirPath = await Deno.realPath((flags.find('in-dir') as FlagString).value)
			const filePaths = []
			for await (const dirEntry of Deno.readDir(dirPath))
				if (dirEntry.isFile && dirEntry.name.endsWith('.log'))
					filePaths.push(`${dirPath}/${dirEntry.name}`)
			if (!filePaths.length)
				return

			const logs = await Promise.all(filePaths.map(async filePath => {
				const gen = (async function* (): AsyncGenerator<string, null> {
					const file = await Deno.open(filePath)
					for await (const line of readLines(file))
						// TODO: Make it check for multiple line logs
						yield line
					file.close()
					return null
				})()
				return {
					log: (await gen.next()).value!,
					async take(): Promise<string> {
						const currentLine = this.log!
						this.log = (await gen.next()).value
						return currentLine
					}
				} satisfies { log: string | null, take: (() => Promise<string>) }
			}))

			{
				const outDir = (flags.find('out-dir') as FlagString).value
				if (outDir.length)
					dirPath = await Deno.realPath(outDir)
			}
			const outName = (flags.find('out-name') as FlagString).value
			const dest = await Deno.create(`${dirPath}/${outName}`)
			while (logs.length) {
				logs.sort((x, y) => x.log > y.log ? 1 : 0)
				await dest.write(Uint8Array.from(new TextEncoder().encode(await logs[ 0 ].take() + '\n')))
				if (logs[ 0 ].log == null)
					logs.shift()
			}
			dest.close()

			const promises = [
				compress(`${dirPath}/${outName}`, `${dirPath}/${outName}.tar`, { debug: false, excludeSrc: true })
					.then(() => Deno.remove(`${dirPath}/${outName}`))
			]
			if ((flags.find('del-src') as FlagBoolean).value)
				promises.push(...filePaths.map(filePath => Deno.remove(filePath)))

			await Promise.allSettled(promises)
		}
	}
})).parse(Deno.args)
