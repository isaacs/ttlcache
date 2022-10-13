import t from 'tap'

// force the reliance on clearTimeout for graceful exit
const timer = setTimeout(() => {})
const { unref } = timer.constructor.prototype
timer.constructor.prototype.unref = null
t.teardown(() => timer.constructor.prototype.unref = unref)

import TTLCache from '../'

const cache = new TTLCache({
  max: 10,
  ttl: 10,
})

const timers: Set<NodeJS.Timeout> = (cache as unknown as { timers: Set<NodeJS.Timeout> }).timers
cache.set('a', 'b', { ttl: 1e9 })
t.equal(timers.size, 1)
cache.clear()
t.equal(timers.size, 0)

cache.set('a', 'b', { ttl: 1e9 })
t.equal(timers.size, 1)
cache.delete('a')
t.equal(timers.size, 0)
