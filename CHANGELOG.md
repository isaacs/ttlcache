## 2.1

- Add `updateAgeOnHas` and `checkAgeOnHas` options to match
  corresponding `get()` options.
- Include items with `Infinity` expirations in iterations like
  `entries()`, `keys()`, `values()`.

## 2.0

- refactor as hybrid typescript module (changes export)
- Blue Oak license

## 1.4

- add checkAgeOnGet option
- Guard against expiration list going missing

## 1.3.0

- make cache.cancelTimer a public method
- Reduce memory usage by only creating one timer

## 1.2

- Add support for immortality
- ensure dispose() only happens after full removal
- Clear timeouts so we don't rely on only unref()
- fix error when deleting immortal entries

## 1.1

- Add `setTTL(key, ttl)`
- avoid off-by-1ms purge failures

## 1.0

- Initial release
