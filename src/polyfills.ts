/**
 * WebKit / Safari / Android WebView Polyfills
 * Mendukung PDF.js v6 dan ES2024 modern di iOS WKWebView (<17.4) & Android WebView lama.
 * Semua properti diset enumerable: false agar tidak mengganggu iterasi objek prototype.
 */

// 1. Polyfill Promise.withResolvers (Wajib untuk PDF.js v4+ & v6+)
if (typeof (Promise as any).withResolvers === 'undefined') {
  Object.defineProperty(Promise, 'withResolvers', {
    value: function <T>() {
      let resolve!: (value: T | PromiseLike<T>) => void;
      let reject!: (reason?: any) => void;
      const promise = new Promise<T>((res, rej) => {
        resolve = res;
        reject = rej;
      });
      return { promise, resolve, reject };
    },
    writable: true,
    configurable: true,
    enumerable: false,
  });
}

// 2. Polyfill URL.parse
if (typeof (URL as any).parse === 'undefined') {
  Object.defineProperty(URL, 'parse', {
    value: function (url: string, base?: string | URL) {
      try {
        return new URL(url, base);
      } catch {
        return null;
      }
    },
    writable: true,
    configurable: true,
    enumerable: false,
  });
}

// 3. Polyfill Object.hasOwn
if (typeof Object.hasOwn === 'undefined') {
  Object.defineProperty(Object, 'hasOwn', {
    value: function (obj: any, prop: PropertyKey): boolean {
      return Object.prototype.hasOwnProperty.call(obj, prop);
    },
    writable: true,
    configurable: true,
    enumerable: false,
  });
}

// 4. Polyfill Uint8Array.prototype.toHex (Wajib untuk PDF.js v6 fingerprinting)
if (typeof (Uint8Array.prototype as any).toHex === 'undefined') {
  Object.defineProperty(Uint8Array.prototype, 'toHex', {
    value: function (): string {
      return Array.from(this)
        .map((b: any) => Number(b).toString(16).padStart(2, '0'))
        .join('');
    },
    writable: true,
    configurable: true,
    enumerable: false,
  });
}

// 5. Polyfill Object.groupBy
if (typeof (Object as any).groupBy === 'undefined') {
  Object.defineProperty(Object, 'groupBy', {
    value: function (items: Iterable<any>, callback: (item: any, index: number) => any) {
      const result: Record<string, any[]> = {};
      let i = 0;
      for (const item of items) {
        const key = callback(item, i++);
        if (!result[key]) result[key] = [];
        result[key].push(item);
      }
      return result;
    },
    writable: true,
    configurable: true,
    enumerable: false,
  });
}

// 6. Polyfill Array.fromAsync
if (typeof (Array as any).fromAsync === 'undefined') {
  Object.defineProperty(Array, 'fromAsync', {
    value: async function (asyncIterable: any) {
      const result: any[] = [];
      for await (const item of asyncIterable) {
        result.push(item);
      }
      return result;
    },
    writable: true,
    configurable: true,
    enumerable: false,
  });
}

export {};
