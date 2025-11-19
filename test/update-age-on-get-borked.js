import { TTLCache } from '@isaacs/ttlcache'

import t from 'tap'

const cache = new TTLCache({
  max: 1000,
  ttl: 1000,
  updateAgeOnGet: true,
})

t.equal(cache.get('test'), undefined)

cache.set('test', 1)

t.match(cache.data, new Map([['test', 1]]))
t.equal(cache.has('test'), true)
t.equal(cache.get('test'), 1)
t.equal(cache.getRemainingTTL('test'), 1000)
