import Clock from 'clock-mock'
import t from 'tap'

const clock = new Clock()
t.teardown(clock.enter())
clock.advance(1)

import TTL from '../'

const floor = (t: Tap.Test, n: number, e: number, msg?: string) =>
  t.equal(Math.floor(n), Math.floor(e), msg)

t.test('use date if performance unavailable', async t => {
  // @ts-ignore
  const { performance } = global
  // @ts-ignore
  global.performance = null
  // @ts-ignore
  t.teardown(() => (global.performance = performance))

  const TTL = t.mock('../', {})
  const c = new TTL({ ttl: 1000 })
  c.set(1, 2)
  t.equal(c.has(1), true)
  t.equal(c.get(1), 2)
  clock.advance(1001)
  t.equal(c.has(1), false)
  t.equal(c.get(1), undefined)
})

t.test('basic operation', async t => {
  const c = new TTL({ ttl: 1000 })
  c.set(1, 2)
  t.equal(c.has(1), true)
  t.equal(c.get(1), 2)
  clock.advance(1001)
  t.equal(c.has(1), false)
  t.equal(c.get(1), undefined)
})

t.test('constructor - updateAgeOnGet', async t => {
  const c = new TTL({ ttl: 1000, updateAgeOnGet: true })
  c.set(1, 2)

  floor(t, c.getRemainingTTL(1), 1000)
  clock.advance(5)
  floor(t, c.getRemainingTTL(1), 995)

  c.get(1) // Should reset timer
  floor(t, c.getRemainingTTL(1), 1000)

  c.get(1, { ttl: 100 })
  floor(t, c.getRemainingTTL(1), 100)
})

t.test('constructor - noUpdateTTL', async t => {
  const c = new TTL({ ttl: 1000, noUpdateTTL: true })
  c.set(1, 2)

  floor(t, c.getRemainingTTL(1), 1000)
  clock.advance(5)
  floor(t, c.getRemainingTTL(1), 995)

  c.set(1, 3) // Should not update timer
  floor(t, c.getRemainingTTL(1), 995)
})

t.test('bad values', async t => {
  t.throws(() => new TTL({ max: -1 }))
  t.throws(() => new TTL({ ttl: -1 }))
  //@ts-expect-error
  t.throws(() => new TTL({ dispose: true }))
  t.throws(() => new TTL({ ttl: 1 }).set(1, 2, { ttl: -1 }))
})

t.test('set', async t => {
  type SN = string | number
  const disposals: [SN, SN, string][] = []
  const dispose = (val: SN, key: SN, reason: string) =>
    disposals.push([val, key, reason])
  const c = new TTL<SN, SN>({
    ttl: 10,
    dispose,
    max: 5,
  })
  c.set('set', 'oldval')
  c.set('set', 'newval')
  t.same(disposals, [['oldval', 'set', 'set']])
  disposals.length = 0
  c.set('set', 'newnewval', { noDisposeOnSet: true })
  t.same(disposals, [])
  clock.advance(5)
  floor(t, c.getRemainingTTL('set'), 5)
  c.set('set', 'newnewval', { noUpdateTTL: true })
  floor(t, c.getRemainingTTL('set'), 5)
  t.same(disposals, [])
  c.set('set', 'newnewval')
  floor(t, c.getRemainingTTL('set'), 10)
  t.same(disposals, [])
  clock.advance(3)
  c.set('set', 'back to old val', { noUpdateTTL: true })
  floor(t, c.getRemainingTTL('set'), 7)
  t.same(disposals, [['newnewval', 'set', 'set']])
  disposals.length = 0
  for (let i = 0; i < 5; i++) {
    c.set(i, i)
  }
  t.same(disposals, [['back to old val', 'set', 'evict']])
  disposals.length = 0
  c.set(0, 99, { noUpdateTTL: true, noDisposeOnSet: true })
  t.same(disposals, [])
  clock.advance(11)
  t.same(disposals, [
    [99, 0, 'stale'],
    [1, 1, 'stale'],
    [2, 2, 'stale'],
    [3, 3, 'stale'],
    [4, 4, 'stale'],
  ])
  disposals.length = 0

  c.set('key', 'val', { ttl: 1000 })
  for (let i = 0; i < 5; i++) {
    c.set(i, i, { ttl: 1000 })
    clock.advance(1)
  }
  t.same(disposals, [['val', 'key', 'evict']])
})

t.test('get update age', async t => {
  const c = new TTL({ ttl: 10 })
  c.set(0, 0)
  floor(t, c.getRemainingTTL(0), 10)
  clock.advance(7)
  floor(t, c.getRemainingTTL(0), 3)
  t.equal(c.get(0), 0)
  floor(t, c.getRemainingTTL(0), 3)
  t.equal(c.get(0, { updateAgeOnGet: true }), 0)
  floor(t, c.getRemainingTTL(0), 10)
  clock.advance(5)
  t.equal(c.get(0, { updateAgeOnGet: true, ttl: 1000 }), 0)
  floor(t, c.getRemainingTTL(0), 1000)
})

t.test('delete', async t => {
  const c = new TTL({ ttl: 10 })
  c.set(0, 0)
  c.set(1, 1)
  c.set(2, 2, { ttl: Infinity })
  t.equal(c.delete(2), true)
  t.equal(c.delete(0), true)
  t.equal(c.get(0), undefined)
  t.equal(c.has(0), false)
  t.equal(c.get(1), 1)
  t.equal(c.has(1), true)
  t.equal(c.delete(1), true)
  t.equal(c.get(1), undefined)
  t.equal(c.has(1), false)
  t.equal(c.delete(0), false)
  floor(t, c.getRemainingTTL(0), 0)
})

t.test('iterators', async t => {
  const c = new TTL({ ttl: 10 })
  for (let i = 0; i < 3; i++) {
    c.set(i, i * 2)
  }
  t.same(
    [...c],
    [
      [0, 0],
      [1, 2],
      [2, 4],
    ]
  )
  t.same([...c.entries()], [...c])
  t.same([...c.values()], [0, 2, 4])
  t.same([...c.keys()], [0, 1, 2])
})

t.test('clear', async t => {
  const disposals: [number, number, string][] = []
  const dispose = (...a: [number, number, string]) =>
    disposals.push(a)
  const c = new TTL({ ttl: 10, dispose })
  for (let i = 0; i < 3; i++) {
    c.set(i, i * 2)
  }
  c.clear()
  t.same(disposals, [
    [0, 0, 'delete'],
    [2, 1, 'delete'],
    [4, 2, 'delete'],
  ])
  //@ts-expect-error
  delete c.dispose
  disposals.length = 0
  for (let i = 0; i < 3; i++) {
    c.set(i, i * 2)
  }
  c.clear()
  t.same(disposals, [])
})

t.test('update TTL, multiple same expiration', async t => {
  const c = new TTL({ ttl: 10 })
  for (let i = 0; i < 10; i++) {
    c.set(i, i * 2)
  }
  clock.advance(5)
  c.set(5, 500)
  for (let i = 0; i < 10; i++) {
    floor(t, c.getRemainingTTL(i), i === 5 ? 10 : 5)
  }
})

t.test('set ttl explicitly', async t => {
  const c = new TTL<number, number>({ ttl: 10 })
  c.set(1, 1)
  floor(t, c.getRemainingTTL(1), 10, 'starts at default')
  c.setTTL(1, 1000)
  floor(t, c.getRemainingTTL(1), 1000, 'set explicitly')
  c.setTTL(1)
  floor(t, c.getRemainingTTL(1), 10, 'reset to default')
})

t.test('ctor ok with no argument', async t => {
  const c = new TTL<number, number>()
  t.match(c, { ttl: undefined })
})

t.test(
  'validate the TTL even if the timer has not fired',
  async t => {
    const c = new TTL<number, number>({
      ttl: 10,
      checkAgeOnGet: true,
    })
    c.set(1, 1)
    t.equal(c.get(1), 1)
    c.cancelTimer()
    clock.advance(1000)
    t.equal(c.size, 1)
    t.equal(c.get(1, { checkAgeOnGet: false }), 1)
    t.equal(c.get(1), undefined)
    t.equal(c.get(1, { checkAgeOnGet: false }), undefined)
  }
)
