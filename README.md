# OrderLogs
Mergers .log files alphematically and produces a .tar version of the end result.

## Usage

### Flags
- `--version` | `-v`
- `--in-dir <path>`
- `--out-dir <path>` (If omitted then `--in-dir` will be used)
- `--out-name <name>`
- `--del-src`

### Example
```
deno task exec --in-dir ./logs/ --out-name latest.log
```
