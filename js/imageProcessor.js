/**
 * Image Processor Module
 * Handles image processing queue and watermark removal operations
 */

import { WatermarkEngine } from './core/watermarkEngine.js';
import { loadImage, checkOriginal, getOriginalStatus, setStatusMessage } from './utils.js';
import i18n from './i18n.js';
import * as ui from './ui.js';

// Global state
let engine = null;
let imageQueue = [];
let processedCount = 0;
let zoom = null;

/**
 * Initialize the watermark engine
 * @returns {Promise<void>}
 */
export async function initEngine() {
    engine = await WatermarkEngine.create();
}

/**
 * Set the zoom instance for image preview
 * @param {Object} zoomInstance - medium-zoom instance
 */
export function setZoom(zoomInstance) {
    zoom = zoomInstance;
}

/**
 * Get the current image queue
 * @returns {Array} Image queue
 */
export function getImageQueue() {
    return imageQueue;
}

/**
 * Get the processed count
 * @returns {number} Processed count
 */
export function getProcessedCount() {
    return processedCount;
}

/**
 * Reset the processor state
 */
export function reset() {
    // Revoke object URLs to prevent memory leaks
    imageQueue.forEach(item => {
        if (item.originalUrl) URL.revokeObjectURL(item.originalUrl);
        if (item.processedUrl) URL.revokeObjectURL(item.processedUrl);
    });
    
    imageQueue = [];
    processedCount = 0;
}

/**
 * Filter valid image files
 * @param {File[]} files - Input files
 * @returns {File[]} Valid image files
 */
export function filterValidFiles(files) {
    return files.filter(file => {
        if (!file.type.match('image/(jpeg|png|webp)')) return false;
        if (file.size > 20 * 1024 * 1024) return false;
        return true;
    });
}

/**
 * Create image queue from files
 * @param {File[]} files - Valid image files
 * @returns {Array} Image queue items
 */
export function createImageQueue(files) {
    // Revoke old URLs
    imageQueue.forEach(item => {
        if (item.originalUrl) URL.revokeObjectURL(item.originalUrl);
        if (item.processedUrl) URL.revokeObjectURL(item.processedUrl);
    });

    imageQueue = files.map((file, index) => ({
        id: Date.now() + index,
        file,
        name: file.name,
        status: 'pending',
        originalImg: null,
        processedBlob: null,
        originalUrl: null,
        processedUrl: null
    }));

    processedCount = 0;
    return imageQueue;
}

/**
 * Process a single image
 * @param {Object} item - Image queue item
 * @returns {Promise<void>}
 */
export async function processSingle(item) {
    try {
        const img = await loadImage(item.file);
        item.originalImg = img;

        const { is_google, is_original } = await checkOriginal(item.file);
        const status = getOriginalStatus({ is_google, is_original });
        setStatusMessage(status, is_google && is_original ? 'success' : 'warn');

        const watermarkInfo = engine.getWatermarkInfo(img.width, img.height);
        ui.updateOriginalPreview(img, watermarkInfo);

        const result = await engine.removeWatermarkFromImage(img);
        const blob = await new Promise(resolve => result.toBlob(resolve, 'image/png'));
        item.processedBlob = blob;

        item.processedUrl = URL.createObjectURL(blob);
        
        ui.updateProcessedPreview(
            item.processedUrl,
            img.width,
            img.height,
            () => downloadImage(item)
        );

        if (zoom) {
            zoom.detach();
            zoom.attach('[data-zoomable]');
        }
    } catch (error) {
        console.error('Process single image error:', error);
        throw error;
    }
}

/**
 * Process image queue (multi-image mode)
 * @returns {Promise<void>}
 */
export async function processQueue() {
    // First, load all images and show previews
    await Promise.all(imageQueue.map(async item => {
        const img = await loadImage(item.file);
        item.originalImg = img;
        item.originalUrl = img.src;
        
        const resultImg = document.getElementById(`result-${item.id}`);
        if (resultImg) {
            resultImg.src = img.src;
            if (zoom) zoom.attach(`#result-${item.id}`);
        }
    }));

    // Process in batches with concurrency limit
    const concurrency = 3;
    for (let i = 0; i < imageQueue.length; i += concurrency) {
        await Promise.all(imageQueue.slice(i, i + concurrency).map(async item => {
            if (item.status !== 'pending') return;

            item.status = 'processing';
            ui.updateStatus(item.id, i18n.t('status.processing'));

            try {
                const result = await engine.removeWatermarkFromImage(item.originalImg);
                const blob = await new Promise(resolve => result.toBlob(resolve, 'image/png'));
                item.processedBlob = blob;

                item.processedUrl = URL.createObjectURL(blob);
                
                const resultImg = document.getElementById(`result-${item.id}`);
                if (resultImg) resultImg.src = item.processedUrl;

                item.status = 'completed';
                const watermarkInfo = engine.getWatermarkInfo(item.originalImg.width, item.originalImg.height);

                ui.updateStatus(item.id, `
                    <p>${i18n.t('info.size')}: ${item.originalImg.width}×${item.originalImg.height}</p>
                    <p>${i18n.t('info.watermark')}: ${watermarkInfo.size}×${watermarkInfo.size}</p>
                    <p>${i18n.t('info.position')}: (${watermarkInfo.position.x},${watermarkInfo.position.y})</p>
                `, true);

                ui.showDownloadBtn(item.id, () => downloadImage(item));

                processedCount++;
                ui.updateProgress(processedCount, imageQueue.length);

                // Check if original asynchronously
                checkOriginal(item.file).then(({ is_google, is_original }) => {
                    if (!is_google || !is_original) {
                        const status = getOriginalStatus({ is_google, is_original });
                        ui.addStatusWarning(item.id, status);
                    }
                }).catch(() => {});
            } catch (error) {
                item.status = 'error';
                ui.updateStatus(item.id, i18n.t('status.failed'));
                console.error('Process queue item error:', error);
            }
        }));
    }

    if (processedCount > 0) {
        ui.showDownloadAllBtn();
    }
}

/**
 * Download a single processed image
 * @param {Object} item - Image queue item
 */
export function downloadImage(item) {
    if (!item.processedUrl) return;
    
    const a = document.createElement('a');
    a.href = item.processedUrl;
    a.download = `unwatermarked_${item.name.replace(/\.[^.]+$/, '')}.png`;
    a.click();
}