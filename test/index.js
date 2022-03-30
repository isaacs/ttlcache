const t = require('tap')
const Clock = require('clock-mock')
const clock = new Clock()
t.teardown(clock.enter())
clock.advance(1)

const TTL = require('../')

t.test('use date if perf_hooks unavailable', async t => {
  const TTL = t.mock('../', { perf_hooks: null })
  const c = new TTL({ttl: 1000})
  c.set(1, 2)
  t.equal(c.has(1), true)
  t.equal(c.get(1), 2)
  clock.advance(1000)
  t.equal(c.has(1), false)
  t.equal(c.get(1), undefined)
})

t.test('basic operation', async t => {
  const c = new TTL({ttl: 1000})
  c.set(1, 2)
  t.equal(c.has(1), true)
  t.equal(c.get(1), 2)
  clock.advance(1000)
  t.equal(c.has(1), false)
  t.equal(c.get(1), undefined)
})

t.test('bad values', async t => {
  t.throws(() => new TTL({max: -1}))
  t.throws(() => new TTL({ttl: -1}))
  t.throws(() => new TTL({dispose: true}))
  t.throws(() => new TTL({ttl:1}).set(1, 2, { ttl: -1 }))
})

t.test('set', async t => {
  const disposals = []
  const dispose = (val, key, reason) => disposals.push([val, key, reason])
  const c = new TTL({ttl:10, dispose, max: 5})
  c.set('set', 'oldval')
  c.set('set', 'newval')
  t.same(disposals, [['oldval', 'set', 'set']])
  disposals.length = 0
  c.set('set', 'newnewval', { noDisposeOnSet: true })
  t.same(disposals, [])
  clock.advance(5)
  t.equal(c.getRemainingTTL('set'), 5)
  c.set('set', 'newnewval', { noUpdateTTL: true })
  t.equal(c.getRemainingTTL('set'), 5)
  t.same(disposals, [])
  c.set('set', 'newnewval')
  t.equal(c.getRemainingTTL('set'), 10)
  t.same(disposals, [])
  clock.advance(3)
  c.set('set', 'back to old val', { noUpdateTTL: true })
  t.equal(c.getRemainingTTL('set'), 7)
  t.same(disposals, [['newnewval', 'set', 'set']])
  disposals.length = 0
  for (let i = 0; i < 5; i ++) {
    c.set(i, i)
  }
  t.same(disposals, [['back to old val', 'set', 'evict']])
  disposals.length = 0
  c.set(0, 99, { noUpdateTTL: true, noDisposeOnSet: true })
  t.same(disposals, [])
  clock.advance(10)
  t.same(disposals, [
    [99, 0, 'stale'],
    [1, 1, 'stale'],
    [2, 2, 'stale'],
    [3, 3, 'stale'],
    [4, 4, 'stale'],
  ])
  disposals.length = 0

  c.set('key', 'val', { ttl: 1000 })
  for (let i = 0; i < 5; i ++) {
    c.set(i, i, { ttl: 1000 })
    clock.advance(1)
  }
  t.same(disposals, [['val', 'key', 'evict']])
})

t.test('get update age', async t => {
  const c = new TTL({ttl: 10, dispose: (...a) => console.error(clock.now(), a)})
  c.set(0, 0)
  t.equal(c.getRemainingTTL(0), 10)
  clock.advance(7)
  t.equal(c.getRemainingTTL(0), 3)
  t.equal(c.get(0), 0)
  t.equal(c.getRemainingTTL(0), 3)
  t.equal(c.get(0, {updateAgeOnGet: true}), 0)
  t.equal(c.getRemainingTTL(0), 10)
  clock.advance(5)
  t.equal(c.get(0, {updateAgeOnGet: true, ttl: 1000}), 0)
  t.equal(c.getRemainingTTL(0), 1000)
})

t.test('delete', async t => {
  const c = new TTL({ttl:10})
  c.set(0, 0)
  c.set(1, 1)
  t.equal(c.delete(0), true)
  t.equal(c.get(0), undefined)
  t.equal(c.has(0), false)
  t.equal(c.get(1), 1)
  t.equal(c.has(1), true)
  t.equal(c.delete(1), true)
  t.equal(c.get(1), undefined)
  t.equal(c.has(1), false)
  t.equal(c.delete(0), false)
  t.equal(c.getRemainingTTL(0), 0)
})

t.test('iterators', async t => {
  const c = new TTL({ttl:10})
  for (let i = 0; i < 3; i++) {
    c.set(i, i * 2)
  }
  t.same([...c], [[0, 0], [1, 2], [2, 4]])
  t.same([...c.entries()], [...c])
  t.same([...c.values()], [0, 2, 4])
  t.same([...c.keys()], [0, 1, 2])
})
