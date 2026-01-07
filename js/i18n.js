/**
 * Internationalization module
 * Handles language detection, loading, and switching
 */

const i18n = {
    locale: localStorage.getItem('locale') || (navigator.language.startsWith('zh') ? 'zh-CN' : 'en-US'),
    translations: {},

    async init() {
        await this.loadTranslations(this.locale);
        this.applyTranslations();
        document.body.classList.remove('loading');
    },

    async loadTranslations(locale) {
        const res = await fetch(`./i18n/${locale}.json`);
        this.translations = await res.json();
        this.locale = locale;
        localStorage.setItem('locale', locale);
    },

    t(key) {
        return this.translations[key] || key;
    },

    applyTranslations() {
        document.documentElement.lang = this.locale;
        document.title = this.t('title');
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (el.tagName === 'INPUT' && el.placeholder !== undefined) {
                el.placeholder = this.t(key);
            } else if (el.tagName === 'BUTTON' && el.children.length === 0) {
                 // For buttons without children (plain text buttons), update textContent
                 el.textContent = this.t(key);
            } else if (el.childNodes.length === 1 && el.childNodes[0].nodeType === Node.TEXT_NODE) {
                // For elements with only text content
                el.textContent = this.t(key);
            } else {
                // For elements with children (like icons), we need to be careful not to remove the children.
                // We'll try to find the text node and update it, or if it's a specific structure we know.
                // A safer simple approach for Mixed content is often complex.
                // However, looking at the HTML structure, many elements have data-i18n on the container.
                // Let's check if the element has direct text content we can replace.
                
                let textNode = null;
                for (let i = 0; i < el.childNodes.length; i++) {
                    if (el.childNodes[i].nodeType === Node.TEXT_NODE && el.childNodes[i].textContent.trim().length > 0) {
                        textNode = el.childNodes[i];
                        break;
                    }
                }

                if (textNode) {
                    textNode.textContent = this.t(key);
                } else {
                     // Fallback for empty elements or if we want to replace everything (but we tried to avoid that for icons)
                     // If it has children and no clear text node, maybe we shouldn't touch it or the data-i18n should be on a span inside.
                     // But for the tab buttons, they have no icons in the text part usually, or the icon is a separate element?
                     // Let's look at the HTML again.
                     // <button class="..." data-tab="gemini"> ✦ GEMINI </button>
                     // It has text content " ✦ GEMINI ".
                     el.childNodes.forEach(node => {
                        if(node.nodeType === Node.TEXT_NODE) {
                             node.textContent = this.t(key);
                        }
                     });
                     if (!el.hasChildNodes()) {
                         el.textContent = this.t(key);
                     }
                }
            }
        });
    },

    async switchLocale(locale) {
        await this.loadTranslations(locale);
        this.applyTranslations();
    }
};

export default i18n;