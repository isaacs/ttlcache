import t from 'tap'
import Clock from 'clock-mock'
const clock = new Clock()
clock.enter()
clock.advance(1)

import TTLCache from '../'

t.test('eviction', async t => {
  let didReSet = false
  const c = new TTLCache({
    max: 2,
    ttl: 1000,
    noDisposeOnSet: true,
    dispose: (value, key, reason) => {
      t.equal(reason, 'evict')
      if (!didReSet) {
        t.equal(key, 'key')
        didReSet = true
        t.equal(value, 'val')
        c.set('key', 'otherval')
      } else {
        t.equal(key, 'x')
        t.equal(value, 'y')
      }
    },
  })

  c.set('key', 'val')
  clock.advance(1)
  c.set('x', 'y')
  clock.advance(1)
  c.set('a', 'b')

  t.match(c, {
    expirations: { '1003': [ 'a', 'key' ] },
    data: new Map([['key', 'otherval'], ['a', 'b']]),
  })

  c.cancelTimer()
})

t.test('stale', async t => {
  let didReSet = false
  const c = new TTLCache({
    ttl: 2,
    noDisposeOnSet: true,
    dispose: (value, key, reason) => {
      t.equal(reason, 'stale')
      if (!didReSet) {
        t.equal(key, 'key')
        didReSet = true
        t.equal(value, 'val')
        c.set('key', 'otherval')
      } else {
        t.equal(key, 'x')
        t.equal(value, 'y')
      }
    },
  })

  c.set('key', 'val')
  clock.advance(1)
  c.set('x', 'y')
  clock.advance(1)
  c.set('a', 'b')
  clock.advance(1)

  t.match(c, {
    expirations: { '7': [ 'key', 'a' ] },
    data: new Map([['key', 'otherval'], ['a', 'b']]),
  })

  c.cancelTimer()
})
