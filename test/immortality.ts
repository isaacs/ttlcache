import t from 'tap'
import Clock from 'clock-mock'

const clock = new Clock()
t.teardown(clock.enter())
clock.advance(1)

import TTLCache from '../'

const c = new TTLCache({ ttl: Infinity })
c.set(1, 1, { ttl: Infinity })
t.equal(c.getRemainingTTL(1), Infinity)
c.set(2, 2, { ttl: 100 })
t.equal(c.getRemainingTTL(2), 100)
t.match(c, {
  expirations: { '101': [2] },
  data: new Map([
    [1, 1],
    [2, 2],
  ]),
  expirationMap: new Map([
    [2, 101],
  ]),
  ttl: Infinity,
  max: Infinity,
  updateAgeOnGet: false,
  noUpdateTTL: false,
})

clock.advance(200)
t.match(c, {
  expirations: {},
  data: new Map([[1, 1]]),
  expirationMap: new Map(),
  ttl: Infinity,
  max: Infinity,
  updateAgeOnGet: false,
  noUpdateTTL: false,
})

c.set(1, 2, { ttl: 100 })
t.match(c, {
  expirations: { '301': [1] },
  data: new Map([[1, 2]]),
  expirationMap: new Map([[1, 301]]),
  ttl: Infinity,
  max: Infinity,
  updateAgeOnGet: false,
  noUpdateTTL: false,
})
