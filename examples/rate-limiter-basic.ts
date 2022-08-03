// a super simple rate limiter
// a key is allowed a given number of hits in a window from
// the time of the first hit.
// Note that this means that you can end up spiking up to (2x-1)
// the maxHits within any given window of the specified ttl.

import TTLCache from '../'
import type {Options as TTLCacheOptions} from '../'

export interface Options<K> extends TTLCacheOptions<K, number> {
  maxHits: number
}

export class RateLimiter<K> extends TTLCache<K, number> {
  readonly maxHits: number

  constructor (options: Options<K>) {
    options.updateAgeOnGet = false
    options.noUpdateTTL = true
    if (!options.maxHits || typeof options.maxHits !== 'number' || options.maxHits <= 0) {
      throw new TypeError('must specify a positive number of max hits allowed within the period')
    }
    super(options)
    this.maxHits = options.maxHits
  }

  // call limiter.hit(key) and it'll return true if it's allowed,
  // or false if it should be rejected.
  hit (key:K) {
    const value = (this.get(key) || 0) + 1
    this.set(key, value)
    return value < this.maxHits
  }
}

const rl = new RateLimiter<string>({ ttl: 100, maxHits: 10 })
const run = () => {
  const interval = setInterval(() => {
    const allowed = rl.hit('test')
    console.log(Date.now(), allowed, rl.get('test'))
    if (!allowed) {
      console.error('> > > > > hit rate limit')
      clearInterval(interval)
      setTimeout(run, 1)
    }
  }, 10)
}
run()
