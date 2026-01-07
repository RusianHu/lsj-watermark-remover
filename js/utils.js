/**
 * Utility functions module
 * Contains helper functions for image loading, EXIF checking, and UI operations
 */

// Import exifr from CDN (will be imported in HTML via importmap)
import exifr from 'exifr';
import i18n from './i18n.js';

/**
 * Load image from file
 * @param {File} file - Image file
 * @returns {Promise<HTMLImageElement>} Loaded image element
 */
export function loadImage(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

/**
 * Check if image is original Gemini image
 * @param {File} file - Image file
 * @returns {Promise<{is_google: boolean, is_original: boolean}>} Check result
 */
export async function checkOriginal(file) {
    try {
        const exifData = await exifr.parse(file, { xmp: true });
        return {
            is_google: exifData?.Credit === 'Made with Google AI',
            is_original: ['ImageWidth', 'ImageHeight'].every(key => exifData?.[key])
        };
    } catch {
        return { is_google: false, is_original: false };
    }
}

/**
 * Get original status message
 * @param {{is_google: boolean, is_original: boolean}} status - Check result
 * @returns {string} Status message
 */
export function getOriginalStatus({ is_google, is_original }) {
    if (!is_google) return i18n.t('original.not_gemini');
    if (!is_original) return i18n.t('original.not_original');
    return '';
}

// DOM element references for status and loading (lazy initialization)
let statusMessage = null;
let loadingOverlay = null;

function getStatusMessage() {
    if (!statusMessage) statusMessage = document.getElementById('statusMessage');
    return statusMessage;
}

function getLoadingOverlay() {
    if (!loadingOverlay) loadingOverlay = document.getElementById('loadingOverlay');
    return loadingOverlay;
}

/**
 * Set status message
 * @param {string} message - Status message
 * @param {string} type - Message type ('warn', 'success', '')
 */
export function setStatusMessage(message = '', type = '') {
    const el = getStatusMessage();
    if (!el) return;
    el.textContent = message;
    el.style.display = message ? 'block' : 'none';
    const colorMap = { warn: 'text-warn', success: 'text-success' };
    el.classList.remove(...Object.values(colorMap));
    if (colorMap[type]) el.classList.add(colorMap[type]);
}

/**
 * Show loading overlay
 * @param {string|null} text - Loading text
 */
export function showLoading(text = null) {
    const el = getLoadingOverlay();
    if (!el) return;
    el.style.display = 'flex';
    const textEl = el.querySelector('p');
    if (textEl && text) textEl.textContent = text;
}

/**
 * Hide loading overlay
 */
export function hideLoading() {
    const el = getLoadingOverlay();
    if (!el) return;
    el.style.display = 'none';
}