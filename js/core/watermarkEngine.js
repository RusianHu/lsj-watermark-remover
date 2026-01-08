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
        refWidth: 1672,
        refHeight: 2508,
        wmWidth: 225,
        wmHeight: 43,
        marginRight: 50,
        marginBottom: 50
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

// Gemini watermark scaling parameters
// Based on empirical measurements from actual Gemini-generated images:
// - At short edge 1024: 48×48 watermark, 32px margin
// - At short edge 2048: 96×96 watermark, 64px margin
// - At short edge 3058: 173×173 watermark, 104px margin (measured from 4096×3058 image)
const GEMINI_SCALING = {
    // Threshold for small images (use 48px template)
    smallMaxEdge: 1024,
    
    // Reference points for linear interpolation (for short edge > 2048)
    // Formula derived from two measured points:
    // Point 1: shortEdge=2048, size=96, margin=64
    // Point 2: shortEdge=3058, size=173, margin=104
    sizeSlope: 0.0762376,     // (173-96)/(3058-2048) ≈ 0.0762
    sizeIntercept: -60.15,    // 96 - 0.0762*2048 ≈ -60.15
    marginSlope: 0.0396040,   // (104-64)/(3058-2048) ≈ 0.0396
    marginIntercept: -17.11   // 64 - 0.0396*2048 ≈ -17.11
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
 * Calculate Gemini watermark configuration based on image dimensions
 * Uses different strategies based on image size:
 * - Small (short edge <= 1024): Fixed 48×48 watermark
 * - Medium (1024 < short edge <= 2048): Fixed 96×96 watermark  
 * - Large (short edge > 2048): Linear interpolation for continuous scaling
 * 
 * @param {number} imageWidth - Image width
 * @param {number} imageHeight - Image height
 * @returns {Object} Gemini watermark configuration
 */
function calculateGeminiConfig(imageWidth, imageHeight) {
    const shortEdge = Math.min(imageWidth, imageHeight);
    
    // For small images (short edge <= 1024), use fixed 48px watermark
    if (shortEdge <= GEMINI_SCALING.smallMaxEdge) {
        return {
            type: WATERMARK_TYPE.GEMINI,
            sizeCategory: 'small',
            width: 48,
            height: 48,
            logoSize: 48,
            marginRight: 32,
            marginBottom: 32,
            sourceTemplate: '48'
        };
    }
    
    // For medium images (1024 < short edge <= 2048), use fixed 96px watermark
    if (shortEdge <= 2048) {
        return {
            type: WATERMARK_TYPE.GEMINI,
            sizeCategory: 'medium',
            width: 96,
            height: 96,
            logoSize: 96,
            marginRight: 64,
            marginBottom: 64,
            sourceTemplate: '96'
        };
    }
    
    // For large images (short edge > 2048), use linear interpolation
    // This formula was derived from measured data points
    const logoSize = Math.round(GEMINI_SCALING.sizeSlope * shortEdge + GEMINI_SCALING.sizeIntercept);
    const margin = Math.round(GEMINI_SCALING.marginSlope * shortEdge + GEMINI_SCALING.marginIntercept);
    
    return {
        type: WATERMARK_TYPE.GEMINI,
        sizeCategory: 'large',
        width: logoSize,
        height: logoSize,
        logoSize: logoSize,
        marginRight: margin,
        marginBottom: margin,
        sourceTemplate: '96'  // Will be scaled from 96px template
    };
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
    
    // Default: Gemini watermark with size-based scaling
    return calculateGeminiConfig(imageWidth, imageHeight);
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
        const { type, width, height, aspectCategory, sizeCategory, sourceTemplate } = config;
        const cacheKey = `${type}_${aspectCategory || sizeCategory || 'default'}_${width}x${height}`;

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
            // Gemini watermark - select source template
            if (sourceTemplate === '48' || config.logoSize <= 48) {
                bgImage = this.bgCaptures.bg48;
                srcWidth = 48;
                srcHeight = 48;
            } else {
                // Use 96px template as source for all larger sizes
                bgImage = this.bgCaptures.bg96;
                srcWidth = 96;
                srcHeight = 96;
            }
        }

        // Create temporary canvas to extract and scale ImageData
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        
        // Use high-quality image scaling for better results
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
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
        
        // Debug logging for troubleshooting
        console.log('Watermark config:', {
            imageSize: `${canvas.width}×${canvas.height}`,
            shortEdge: Math.min(canvas.width, canvas.height),
            watermarkSize: `${config.width}×${config.height}`,
            margin: `R:${config.marginRight} B:${config.marginBottom}`,
            position: position,
            sizeCategory: config.sizeCategory
        });

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
            sizeCategory: config.sizeCategory,
            position: position,
            config: config
        };
    }
}