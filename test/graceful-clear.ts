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

const cacheWithTimer = (cache as unknown as { timer: NodeJS.Timeout | undefined })
cache.set('a', 'b', { ttl: 1e9 })
t.type(cacheWithTimer.timer, 'object')
cache.clear()
t.equal(cacheWithTimer.timer, undefined)

cache.set('a', 'b', { ttl: 1e9 })
t.type(cacheWithTimer.timer, 'object')
cache.delete('a')
t.equal(cacheWithTimer.timer, undefined)
