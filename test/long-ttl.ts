import t from 'tap'
import { TTLCache } from '@isaacs/ttlcache'

const clock = t.clock
t.teardown(clock.enter())
t.clock.advance(1)

const cache = new TTLCache<string, number>({
  max: 10,
  // 30 days
  ttl: 1000 * 60 * 60 * 24 * 30,
})

cache.set('a', 1)
cache.set('b', 2, {
  // 2 months, for some reason
  ttl: 1000 * 60 * 60 * 24 * 30 * 2,
})

t.strictSame([...cache.keys()], ['a', 'b'])
t.clock.advance(2 ** 31 - 1)
t.strictSame([...cache.keys()], ['a', 'b'])
t.clock.advance(1000)
t.strictSame([...cache.keys()], ['a', 'b'])
t.clock.advance(cache.getRemainingTTL('a') + 1)
t.strictSame([...cache.keys()], ['b'])
