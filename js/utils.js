/**
 * Utility functions module
 * Contains helper functions for image loading, EXIF checking, and UI operations
 */

// Import exifr from CDN (will be imported in HTML via importmap)
import exifr from 'exifr';
import i18n from './i18n.js';

// Watermark type constants (should match watermarkEngine.js)
const WATERMARK_TYPE = {
    GEMINI: 'gemini',
    DOUBAO: 'doubao',
    UNKNOWN: 'unknown'
};

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
 * Check if image is from the expected AI source based on watermark type
 * @param {File} file - Image file
 * @param {string} watermarkType - The expected watermark type ('gemini', 'doubao', etc.)
 * @returns {Promise<{is_valid_source: boolean, is_original: boolean, watermarkType: string}>} Check result
 */
export async function checkOriginal(file, watermarkType = WATERMARK_TYPE.GEMINI) {
    try {
        const exifData = await exifr.parse(file, { xmp: true });
        
        let is_valid_source = false;
        
        switch (watermarkType) {
            case WATERMARK_TYPE.GEMINI:
                // Gemini images have Credit = 'Made with Google AI'
                is_valid_source = exifData?.Credit === 'Made with Google AI';
                break;
            case WATERMARK_TYPE.DOUBAO:
                // Doubao images: we don't have a reliable EXIF marker to check
                // So we assume the image is valid if it has standard image dimensions
                // This allows Doubao processing without false warnings
                is_valid_source = true;
                break;
            default:
                is_valid_source = false;
        }
        
        return {
            is_valid_source,
            is_original: ['ImageWidth', 'ImageHeight'].every(key => exifData?.[key]),
            watermarkType
        };
    } catch {
        // For Doubao, we still consider it valid even if EXIF parsing fails
        return {
            is_valid_source: watermarkType === WATERMARK_TYPE.DOUBAO,
            is_original: false,
            watermarkType
        };
    }
}

/**
 * Get original status message based on watermark type
 * @param {{is_valid_source: boolean, is_original: boolean, watermarkType: string}} status - Check result
 * @returns {string} Status message
 */
export function getOriginalStatus({ is_valid_source, is_original, watermarkType }) {
    if (!is_valid_source) {
        // Return the appropriate message based on watermark type
        const msgKey = `original.not_${watermarkType}`;
        const msg = i18n.t(msgKey);
        // If translation doesn't exist, fall back to a generic message
        if (msg === msgKey) {
            return i18n.t('original.not_valid_source');
        }
        return msg;
    }
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