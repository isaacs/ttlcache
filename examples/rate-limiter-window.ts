// a more advanced rate limiter, where a given key can
// have up to max hits within a given ttl time window.
// Same usage as rate-limiter-basic.ts, call hit() and
// it'll return true if it's allowed, false otherwise.
//
// Each entry in the RateLimiter object is a TTLCache
// that stores the time of each hit, so the size of the
// entry is the number of hits within a given window.

import type {Options as TTLCacheOptions} from '../'
import TTLCache from '../'

export interface Options {
  window: number
  max: number
}

interface RLEntryOptions extends TTLCacheOptions<number, boolean> {
  onEmpty: () => any
}

class RLEntry extends TTLCache<number, boolean> {
  onEmpty: () => any
  constructor(options: RLEntryOptions) {
    super(options)
    this.onEmpty = options.onEmpty
  }
  purgeStale() {
    const ret = super.purgeStale()
    if (this.size === 0 && ret) {
      this.onEmpty()
    }
    return ret
  }
}

class RateLimiter<K> extends Map<K, TTLCache<number, boolean>> {
  window: number
  max: number
  constructor(options: Options) {
    super()
    this.window = options.window
    this.max = options.max
  }
  hit(key: K) {
    const c = super.get(key) || new RLEntry({
      ttl: this.window,
      onEmpty: () => this.delete(key),
    })

    this.set(key, c)

    if (c.size > this.max) {
      // rejected, too many hits within window
      return false
    }
    c.set(performance.now(), true)
    return true
  }

  count (key: K) {
    const c = super.get(key)
    return c ? c.size : 0
  }
}

const rl = new RateLimiter<string>({ window: 200, max: 10 })
const run = () => {
  const interval = setInterval(() => {
    const allowed = rl.hit('test')
    console.log(Date.now(), allowed, rl.count('test'))
    if (!allowed) {
      console.error('> > > > > hit rate limit')
      clearInterval(interval)
      setTimeout(run, 10)
    }
  }, 5)
}
run()
