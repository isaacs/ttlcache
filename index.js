// A simple TTL cache with max capacity option, ms resolution,
// autopurge, and reasonably optimized performance
// Relies on the fact that integer Object keys are kept sorted,
// and managed very efficiently by V8.

const maybeReq = (mod, fallback) => {
  try {
    return require(mod)
  } catch (e) {
    return fallback
  }
}
const {performance: {now}} = maybeReq('perf_hooks', { performance: Date })
const isPosInt = n => n && n === Math.floor(n) && n > 0 && isFinite(n)

class TTLCache {
  constructor ({ max = Infinity, ttl, updateAgeOnGet = false, noUpdateTTL = false, dispose }) {
    // {[expirationTime]: [keys]}
    this.expirations = Object.create(null)
    // {key=>val}
    this.data = new Map()
    // {key=>expiration}
    this.expirationMap = new Map()
    if (ttl !== undefined && !isPosInt(ttl)) {
      throw new TypeError('ttl must be positive integer if set')
    }
    if (!isPosInt(max) && max !== Infinity) {
      throw new TypeError('max must be positive integer or Infinity')
    }
    this.ttl = ttl
    this.max = max
    if (dispose !== undefined) {
      if (typeof dispose !== 'function') {
        throw new TypeError('dispose must be function if set')
      }
      this.dispose = dispose
    }
  }

  set (key, val, { ttl = this.ttl, noUpdateTTL = this.noUpdateTTL, noDisposeOnSet = this.noDisposeOnSet } = {}) {
    if (!isPosInt(ttl)) {
      throw new TypeError('ttl must be positive integer')
    }
    const current = this.expirationMap.get(key)
    if (current !== undefined) {
      if (noUpdateTTL) {
        const oldValue = this.data.get(key)
        this.data.set(key, val)
        if (!noDisposeOnSet) {
          this.dispose(oldValue, key, 'set')
        }
        return this
      } else {
        this.delete(key, { reason: 'set', noDispose: noDisposeOnSet })
      }
    }
    const expiration = Math.ceil(now() + ttl)
    this.expirationMap.set(key, expiration)
    this.data.set(key, val)
    if (!this.expirations[expiration]) {
      const t = setTimeout(() => this.purgeStale(), ttl)
      if (t.unref) t.unref()
      this.expirations[expiration] = []
    }
    this.expirations[expiration].push(key)
    while (this.size > this.max) {
      this.purgeToCapacity()
    }
    return this
  }

  has (key) {
    return this.data.has(key)
  }

  getRemainingTTL (key) {
    const expiration = this.expirationMap.get(key)
    return expiration !== undefined ? Math.max(0, expiration - now()) : 0
  }

  get (key, { updateAgeOnGet = this.updateAgeOnGet, ttl = this.ttl } = {}) {
    const val = this.data.get(key)
    if (updateAgeOnGet) {
      this.set(key, val, { noUpdateTTL: false, noDisposeOnSet: true, ttl })
    }
    return val
  }

  dispose (value, key) {}

  delete (key, { reason = 'delete', noDispose = false } = {}) {
    const current = this.expirationMap.get(key)
    if (current !== undefined) {
      this.data.delete(key)
      const value = this.data.get(key)
      const exp = this.expirations[current]
      if (exp.length === 1) {
        delete this.expirations[current]
      } else {
        this.expirations[current] = exp.filter(k => k !== key)
      }
      if (!noDispose) {
        this.dispose(value, key, reason)
      }
      return true
    }
    return false
  }

  purgeToCapacity () {
    for (const exp in this.expirations) {
      const keys = this.expirations[exp]
      if (this.size - keys.length >= this.max) {
        for (const key of keys) {
          const val = this.data.get(key)
          this.data.delete(key)
          this.expirationMap.delete(key)
          this.dispose(val, key, 'evict')
        }
        delete this.expirations[exp]
      } else {
        const s = this.max - this.size
        const del = this.expirations.splice(0, s)
        for (const key of del) {
          const val = this.data.get(key)
          this.data.delete(key)
          this.expirationMap.delete(key)
          this.dispose(val, key, 'evict')
        }
      }
      return
    }
  }

  get size () {
    return this.data.size
  }

  purgeStale () {
    for (const exp in this.expirations) {
      for (const key of this.expirations[exp]) {
        const val = this.data.get(key)
        this.data.delete(key)
        this.expirationMap.delete(key)
        this.dispose(val, key, 'stale')
      }
      delete this.expirations[exp]
    }
  }

  *entries () {
    for (const exp in this.expirations) {
      for (const key of this.expirations[exp]) {
        if (this.data.has(key)) {
          yield [key, this.data.get(key)]
        }
      }
    }
  }
  *keys () {
    for (const exp in this.expirations) {
      for (const key of this.expirations[exp]) {
        if (this.data.has(key)) {
          yield key
        }
      }
    }
  }
  *values () {
    for (const exp in this.expirations) {
      for (const key of this.expirations[exp]) {
        if (this.data.has(key)) {
          yield this.data.get(key)
        }
      }
    }
  }
  [Symbol.iterator] () {
    return this.entries()
  }
}

module.exports = TTLCache
