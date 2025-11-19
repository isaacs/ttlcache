import { TTLCache } from '@isaacs/ttlcache'

import t from 'tap'

const disposes: unknown[][] = []

const cache = new TTLCache<string, number>({
  max: 1000,
  ttl: 1000,
  updateAgeOnGet: true,
  dispose: (value, key, evt) => {
    disposes.push([value, key, evt])
  },
})

t.equal(cache.get('test'), undefined)

cache.set('test', 1)

t.match(cache.data, new Map([['test', 1]]))
t.equal(cache.has('test'), true)
t.equal(cache.get('test'), 1)
t.equal(cache.getRemainingTTL('test'), 1000)
cache.set('test', 2)
t.strictSame(disposes, [[1, 'test', 'set']])
