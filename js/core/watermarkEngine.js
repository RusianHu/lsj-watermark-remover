/**
 * Watermark engine main module
 * Coordinate watermark detection, alpha map calculation, and removal operations
 * Supports multiple watermark types: Gemini, Doubao
 */

import { calculateAlphaMap } from './alphaMap.js';
import { removeWatermark } from './blendModes.js';

// Watermark type constants
export const WATERMARK_TYPE = {
    GEMINI: 'gemini',
    DOUBAO: 'doubao',
    UNKNOWN: 'unknown'
};

// PNG assets paths (relative paths for subdirectory deployment)
const GEMINI_BG_48_PATH = './assets/bg_48.png';
const GEMINI_BG_96_PATH = './assets/bg_96.png';

// Doubao watermark templates for different aspect ratios
// Each template was extracted from actual watermarked images
const DOUBAO_BG_PATHS = {
    '1x1': './assets/doubao_bg_1x1.png',  // For square images (ratio ~1.0)
    '2x3': './assets/doubao_bg_2x3.png',  // For portrait images (ratio < 0.8)
    '3x2': './assets/doubao_bg_3x2.png'   // For landscape images (ratio > 1.2)
};

// Doubao watermark reference configurations for each aspect ratio
// All measurements are from actual Doubao-generated images
const DOUBAO_CONFIGS = {
    '1x1': {
        refWidth: 2048,
        refHeight: 2048,
        wmWidth: 282,
        wmHeight: 123,
        marginRight: 57,
        marginBottom: 54
    },
    '2x3': {
        refWidth: 1536,
        refHeight: 2730,
        wmWidth: 298,
        wmHeight: 199,
        marginRight: 0,
        marginBottom: 0
    },
    '3x2': {
        refWidth: 2508,
        refHeight: 1672,
        wmWidth: 296,
        wmHeight: 71,
        marginRight: 53,
        marginBottom: 53
    }
};

/**
 * Determine the Doubao aspect ratio category based on image dimensions
 * @param {number} imageWidth - Image width
 * @param {number} imageHeight - Image height
 * @returns {string} Aspect ratio category ('1x1', '2x3', or '3x2')
 */
function getDoubaoAspectCategory(imageWidth, imageHeight) {
    const ratio = imageWidth / imageHeight;
    
    if (ratio < 0.8) {
        return '2x3';  // Portrait (tall)
    } else if (ratio > 1.2) {
        return '3x2';  // Landscape (wide)
    } else {
        return '1x1';  // Square-ish
    }
}

/**
 * Detect watermark type and configuration based on image size
 * @param {number} imageWidth - Image width
 * @param {number} imageHeight - Image height
 * @param {string} watermarkType - Watermark type ('gemini', 'doubao', or 'auto')
 * @returns {Object} Watermark configuration {type, width, height, marginRight, marginBottom}
 */
export function detectWatermarkConfig(imageWidth, imageHeight, watermarkType = 'gemini') {
    if (watermarkType === WATERMARK_TYPE.DOUBAO) {
        // Doubao watermark: uses different templates based on aspect ratio
        // The watermark scales proportionally based on the reference image dimensions
        const aspectCategory = getDoubaoAspectCategory(imageWidth, imageHeight);
        const config = DOUBAO_CONFIGS[aspectCategory];
        
        // Calculate scale factor based on the shorter edge ratio
        const refShortEdge = Math.min(config.refWidth, config.refHeight);
        const imgShortEdge = Math.min(imageWidth, imageHeight);
        const scale = imgShortEdge / refShortEdge;
        
        // Scale watermark dimensions and margins
        const wmWidth = Math.round(config.wmWidth * scale);
        const wmHeight = Math.round(config.wmHeight * scale);
        const marginRight = Math.round(config.marginRight * scale);
        const marginBottom = Math.round(config.marginBottom * scale);
        
        return {
            type: WATERMARK_TYPE.DOUBAO,
            aspectCategory: aspectCategory,
            width: wmWidth,
            height: wmHeight,
            marginRight: marginRight,
            marginBottom: marginBottom,
            // Store reference info for alpha map retrieval
            refConfig: config
        };
    }
    
    // Default: Gemini watermark
    // If both image width and height are greater than 1024, use 96×96 watermark
    // Otherwise, use 48×48 watermark
    if (imageWidth > 1024 && imageHeight > 1024) {
        return {
            type: WATERMARK_TYPE.GEMINI,
            width: 96,
            height: 96,
            logoSize: 96,  // Keep for backward compatibility
            marginRight: 64,
            marginBottom: 64
        };
    } else {
        return {
            type: WATERMARK_TYPE.GEMINI,
            width: 48,
            height: 48,
            logoSize: 48,  // Keep for backward compatibility
            marginRight: 32,
            marginBottom: 32
        };
    }
}

/**
 * Calculate watermark position in image based on image size and watermark configuration
 * @param {number} imageWidth - Image width
 * @param {number} imageHeight - Image height
 * @param {Object} config - Watermark configuration
 * @returns {Object} Watermark position {x, y, width, height}
 */
export function calculateWatermarkPosition(imageWidth, imageHeight, config) {
    const { width, height, marginRight, marginBottom } = config;

    return {
        x: imageWidth - marginRight - width,
        y: imageHeight - marginBottom - height,
        width: width,
        height: height
    };
}

/**
 * Watermark engine class
 * Coordinate watermark detection, alpha map calculation, and removal operations
 */
export class WatermarkEngine {
    constructor(bgCaptures) {
        this.bgCaptures = bgCaptures;
        this.alphaMaps = {};
        this.currentWatermarkType = WATERMARK_TYPE.GEMINI;
    }

    static async create() {
        const bg48 = new Image();
        const bg96 = new Image();
        const doubao1x1 = new Image();
        const doubao2x3 = new Image();
        const doubao3x2 = new Image();

        await Promise.all([
            new Promise((resolve, reject) => {
                bg48.onload = resolve;
                bg48.onerror = reject;
                bg48.src = GEMINI_BG_48_PATH;
            }),
            new Promise((resolve, reject) => {
                bg96.onload = resolve;
                bg96.onerror = reject;
                bg96.src = GEMINI_BG_96_PATH;
            }),
            new Promise((resolve, reject) => {
                doubao1x1.onload = resolve;
                doubao1x1.onerror = reject;
                doubao1x1.src = DOUBAO_BG_PATHS['1x1'];
            }),
            new Promise((resolve, reject) => {
                doubao2x3.onload = resolve;
                doubao2x3.onerror = reject;
                doubao2x3.src = DOUBAO_BG_PATHS['2x3'];
            }),
            new Promise((resolve, reject) => {
                doubao3x2.onload = resolve;
                doubao3x2.onerror = reject;
                doubao3x2.src = DOUBAO_BG_PATHS['3x2'];
            })
        ]);

        return new WatermarkEngine({
            bg48,
            bg96,
            doubao: {
                '1x1': doubao1x1,
                '2x3': doubao2x3,
                '3x2': doubao3x2
            }
        });
    }

    /**
     * Set the current watermark type to process
     * @param {string} type - Watermark type ('gemini' or 'doubao')
     */
    setWatermarkType(type) {
        if (Object.values(WATERMARK_TYPE).includes(type)) {
            this.currentWatermarkType = type;
        }
    }

    /**
     * Get the current watermark type
     * @returns {string} Current watermark type
     */
    getWatermarkType() {
        return this.currentWatermarkType;
    }

    /**
     * Get alpha map from background captured image based on watermark config
     * @param {Object} config - Watermark configuration
     * @returns {Promise<Float32Array>} Alpha map
     */
    async getAlphaMap(config) {
        const { type, width, height, aspectCategory } = config;
        const cacheKey = `${type}_${aspectCategory || 'default'}_${width}x${height}`;

        // If cached, return directly
        if (this.alphaMaps[cacheKey]) {
            return this.alphaMaps[cacheKey];
        }

        let bgImage;
        let srcWidth, srcHeight;

        if (type === WATERMARK_TYPE.DOUBAO) {
            // Get the appropriate Doubao template based on aspect category
            const category = aspectCategory || '1x1';
            bgImage = this.bgCaptures.doubao[category];
            srcWidth = bgImage.width;
            srcHeight = bgImage.height;
        } else {
            // Gemini watermark
            const size = config.logoSize || width;
            bgImage = size === 48 ? this.bgCaptures.bg48 : this.bgCaptures.bg96;
            srcWidth = size;
            srcHeight = size;
        }

        // Create temporary canvas to extract and scale ImageData
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        
        // Draw and scale the background image
        ctx.drawImage(bgImage, 0, 0, srcWidth, srcHeight, 0, 0, width, height);

        const imageData = ctx.getImageData(0, 0, width, height);

        // Calculate alpha map
        const alphaMap = calculateAlphaMap(imageData);

        // Cache result
        this.alphaMaps[cacheKey] = alphaMap;

        return alphaMap;
    }

    /**
     * Remove watermark from image
     * @param {HTMLImageElement|HTMLCanvasElement} image - Input image
     * @param {string} watermarkType - Optional: override the current watermark type
     * @returns {Promise<HTMLCanvasElement>} Processed canvas
     */
    async removeWatermarkFromImage(image, watermarkType = null) {
        const type = watermarkType || this.currentWatermarkType;

        // Create canvas to process image
        const canvas = document.createElement('canvas');
        canvas.width = image.width;
        canvas.height = image.height;
        const ctx = canvas.getContext('2d');

        // Draw original image onto canvas
        ctx.drawImage(image, 0, 0);

        // Get image data
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        // Detect watermark configuration
        const config = detectWatermarkConfig(canvas.width, canvas.height, type);
        const position = calculateWatermarkPosition(canvas.width, canvas.height, config);

        // Get alpha map for watermark
        const alphaMap = await this.getAlphaMap(config);

        // Remove watermark from image data
        removeWatermark(imageData, alphaMap, position);

        // Write processed image data back to canvas
        ctx.putImageData(imageData, 0, 0);

        return canvas;
    }

    /**
     * Get watermark information (for display)
     * @param {number} imageWidth - Image width
     * @param {number} imageHeight - Image height
     * @param {string} watermarkType - Optional: watermark type
     * @returns {Object} Watermark information {type, size, position, config}
     */
    getWatermarkInfo(imageWidth, imageHeight, watermarkType = null) {
        const type = watermarkType || this.currentWatermarkType;
        const config = detectWatermarkConfig(imageWidth, imageHeight, type);
        const position = calculateWatermarkPosition(imageWidth, imageHeight, config);

        return {
            type: config.type,
            size: config.width,  // For display, show the width
            sizeDisplay: `${config.width}×${config.height}`,
            position: position,
            config: config
        };
    }
}