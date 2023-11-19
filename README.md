# OrderLogs
Mergers .log files by timestamp and produces a .tar version of the end result. Logs are required to start with `[` followed immediately by the timestamp, where the end of the timestamp is either marked by a space or `]`

## Usage

### Flags
- `--version` | `-v`
- `--in-dir <path>`
- `--out-dir <path>` (If omitted then `--in-dir` will be used)
- `--del-src`

### Example
```
deno task exec --in-dir ./logs/
```
