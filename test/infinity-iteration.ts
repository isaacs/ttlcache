import { TTLCache } from '@isaacs/ttlcache'
import t from 'tap'

const cache = new TTLCache({ max: 10, ttl: 1000 })
cache.set(1, 11, { ttl: Infinity })
t.equal(cache.has(1), true)
t.strictSame([...cache.keys()], [1])
t.strictSame([...cache.entries()], [[1, 11]])
t.strictSame([...cache.values()], [11])

cache.set(2, 22, { ttl: 1000 })
t.equal(cache.has(2), true)
t.strictSame([...cache.keys()], [2, 1])
t.strictSame(
  [...cache.entries()],
  [
    [2, 22],
    [1, 11],
  ],
)
t.strictSame([...cache.values()], [22, 11])
