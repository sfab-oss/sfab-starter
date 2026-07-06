/**
 * jsdom doesn't implement the browser APIs the shadcn shell primitives reach for
 * (the sidebar's mobile query, resize observation, focus scrolling). Stub them so
 * a Layer-1 render of a block exercises real component code instead of crashing
 * on a missing global.
 */

if (!window.matchMedia) {
  window.matchMedia = (query: string): MediaQueryList =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    }) as MediaQueryList;
}

if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = class {
    observe() {
      return undefined;
    }
    unobserve() {
      return undefined;
    }
    disconnect() {
      return undefined;
    }
  };
}

if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => undefined;
}

// pdf.js (react-pdf) constructs a `DOMMatrix` at module load and uses it while
// painting to canvas — neither of which jsdom implements. A no-op identity matrix
// lets the viewer import and mount; real rendering only happens in a browser.
if (!globalThis.DOMMatrix) {
  globalThis.DOMMatrix = class {
    a = 1;
    b = 0;
    c = 0;
    d = 1;
    e = 0;
    f = 0;
    multiplySelf() {
      return this;
    }
    scaleSelf() {
      return this;
    }
    translateSelf() {
      return this;
    }
    // biome-ignore lint/suspicious/noExplicitAny: minimal jsdom stub, not the real DOMMatrix
  } as any;
}
