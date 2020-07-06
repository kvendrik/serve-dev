class HotModuleReplacement {
  #listeners = [];

  onChange(path, callback) {
    this.#listeners[path] = callback;
  }

  replaceModule(path) {
    const isStyleSheet = path.includes('.css');
    const isJs = path.includes('.js') || path.includes('.mjs');

    if (isStyleSheet) {
      const sheet = [...document.querySelectorAll('link')]
        .find(({href}) => href.includes(path));

      if (!sheet) {
        return false;
      }

      sheet.setAttribute('href', this.updateCacheKey(sheet.href));
      if (this.#listeners[path]) this.#listeners[path]();
      return true;
    }

    if (isJs) {
      const script = [...document.scripts].find(({src}) => src.includes(path));

      if (!script) {
        return false;
      }

      script.setAttribute('src', this.updateCacheKey(script.src));
      if (this.#listeners[path]) this.#listeners[path]();
      return true;
    }

    return false;
  }

  updateCacheKey(href) {
    if (!href.includes('?')) {
      return `${href}?${this.uniqueKey()}`;
    }
    return href.replace(/\?[^\&]+/, `?${this.uniqueKey()}`);
  }

  uniqueKey() {
    return Math.random().toString(36).substring(2, 18);
  }
};

window.hot = new HotModuleReplacement();
