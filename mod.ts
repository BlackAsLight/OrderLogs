import { TextLineStream } from 'https://deno.land/std@0.207.0/streams/mod.ts'
import { tar } from 'https://deno.land/x/compress@v0.4.5/mod.ts'

async function* getLog(path: string): AsyncGenerator<string, void, unknown> {
	let log: string[] = []
	for await (
		const line of (await Deno.open(path))
			.readable
			.pipeThrough(new TextDecoderStream())
			.pipeThrough(new TextLineStream())
	) {
		if (line[ 0 ] === '[') {
			yield log.join('\n')
			log = []
		}
		log.push(line)
	}
	yield log.join('\n')
}

export async function merge(inDir: string, outDir: string, deleteSource: boolean): Promise<number> {
	const startTime = performance.now();
	[ inDir, outDir ] = await Promise.all([
		Deno.realPath(inDir).then(async dir => (await Deno.mkdir(dir, { recursive: true }), dir)),
		Deno.realPath(outDir).then(async dir => (await Deno.mkdir(dir, { recursive: true }), dir))
	])
	const inFiles = []
	for await (const dirEntry of Deno.readDir(inDir))
		if (dirEntry.isFile && dirEntry.name.endsWith('.log'))
			inFiles.push(inDir + '/' + dirEntry.name)
	if (!inFiles.length)
		return performance.now() - startTime

	const outFiles: Record<string, undefined | Deno.FsFile> = {}
	while (inFiles.length) {
		const readers = await Promise.all(inFiles.splice(0, 100).map(async file => {
			const reader = getLog(file)
			await reader.next()
			const log = (await reader.next()).value
			return {
				file,
				reader,
				log,
				timeStamp: log ? getTimeStamp(log) : 0
			}
		}))
		while (true) {
			readers.sort((x, y) => x.timeStamp - y.timeStamp)
			while (readers[ 0 ] && readers[ 0 ].log == undefined) {
				if (deleteSource)
					Deno.remove(readers[ 0 ].file)
				readers.shift()
			}
			if (!readers.length)
				break

			const date = getDate(readers[ 0 ].timeStamp)
			if (outFiles[ date ] == undefined)
				outFiles[ date ] = await Deno.create(outDir + '/' + date + '.log')

			await outFiles[ date ]!.write(new TextEncoder().encode(readers[ 0 ].log + '\n'))
			readers[ 0 ].log = (await readers[ 0 ].reader.next()).value
			readers[ 0 ].timeStamp = readers[ 0 ].log ? getTimeStamp(readers[ 0 ].log) : 0
		}
	}
	for (const key in outFiles) {
		outFiles[ key ]!.close()
		tar.compress(outDir + '/' + key + '.log', outDir + '/' + key + '.log.tar', { debug: false, excludeSrc: true })
			.then(() => Deno.remove(outDir + '/' + key + '.log'))
	}
	return performance.now() - startTime
}

function getTimeStamp(log: string): number {
	return new Date(log.slice(1, Math.min(log.indexOf(' '), log.indexOf(']')))).getTime()
}

function getDate(time: number): string {
	const date = new Date(time)
	return date.getUTCFullYear() + '-' + date.getUTCMonth().toString().padStart(2, '0') + '-' + date.getUTCDate().toString().padStart(2, '0')
}
