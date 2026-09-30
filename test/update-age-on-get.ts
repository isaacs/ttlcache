import { TTLCache } from '@isaacs/ttlcache'

import t from 'tap'
const clock = t.clock
t.teardown(clock.enter())

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

t.test(
  'getting a missing key does not create an expiring entry',
  async t => {
    const disposals: unknown[][] = []
    const cache = new TTLCache<string, number>({
      ttl: 10,
      updateAgeOnGet: true,
      dispose: (value, key, reason) => {
        disposals.push([value, key, reason])
      },
    })

    t.equal(cache.get('missing'), undefined)
    t.strictSame([...cache], [])
    clock.advance(11)
    t.strictSame(disposals, [])
  },
)

t.test('getting a stored undefined value refreshes its TTL', async t => {
  const cache = new TTLCache<string, undefined>({
    ttl: 10,
    updateAgeOnGet: true,
  })

  cache.set('present', undefined)
  clock.advance(5)
  t.equal(cache.get('present'), undefined)
  clock.advance(6)
  t.equal(cache.has('present'), true)
})
