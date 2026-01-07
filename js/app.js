/**
 * Main Application Entry Point
 * Coordinates all modules and initializes the application
 */

import i18n from './i18n.js';
import * as ui from './ui.js';
import * as processor from './imageProcessor.js';
import { downloadAll } from './download.js';
import { showLoading, hideLoading } from './utils.js';

// Import medium-zoom from CDN (via importmap)
import mediumZoom from 'medium-zoom';

// Global zoom instance
let zoom = null;

/**
 * Initialize the application
 */
async function init() {
    try {
        // Show loading before parallel initialization
        showLoading('Loading...');
        
        // Parallel initialization of i18n and watermark engine
        await Promise.all([
            i18n.init(),
            processor.initEngine()
        ]);

        hideLoading();
        
        // Initialize UI elements
        ui.initElements();
        
        // Setup language switch
        ui.setupLanguageSwitch(() => {
            updateDynamicTexts();
        });
        
        // Setup event listeners
        setupEventListeners();

        // Initialize medium-zoom
        zoom = mediumZoom('[data-zoomable]', {
            margin: 24,
            scrollOffset: 0,
            background: 'rgba(255, 255, 255, .6)',
        });
        
        // Pass zoom instance to processor
        processor.setZoom(zoom);
        
    } catch (error) {
        hideLoading();
        console.error('Initialize error:', error);
    }
}

/**
 * Setup all event listeners
 */
function setupEventListeners() {
    // File upload
    ui.setupFileUpload(handleFiles);
    
    // Download all button
    if (ui.elements.downloadAllBtn) {
        ui.elements.downloadAllBtn.addEventListener('click', () => {
            downloadAll(processor.getImageQueue());
        });
    }
    
    // Reset button
    if (ui.elements.resetBtn) {
        ui.elements.resetBtn.addEventListener('click', reset);
    }
}

/**
 * Reset application state
 */
function reset() {
    ui.resetUI();
    processor.reset();
}

/**
 * Handle selected files
 * @param {File[]} files - Selected files
 */
function handleFiles(files) {
    const validFiles = processor.filterValidFiles(files);
    if (validFiles.length === 0) return;

    const queue = processor.createImageQueue(validFiles);

    if (validFiles.length === 1) {
        ui.showSinglePreview();
        processor.processSingle(queue[0]);
    } else {
        ui.showMultiPreview();
        ui.updateProgress(0, queue.length);
        
        // Create cards for each image
        queue.forEach(item => {
            ui.createImageCard(item, () => processor.downloadImage(item));
        });
        
        // Process queue
        processor.processQueue();
    }
}

/**
 * Update dynamic texts after language switch
 */
function updateDynamicTexts() {
    const queue = processor.getImageQueue();
    if (queue.length > 0) {
        ui.updateProgress(processor.getProcessedCount(), queue.length);
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}