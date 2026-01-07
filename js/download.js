/**
 * Download Module
 * Handles single and batch image downloads
 */

// Import JSZip from vendor (with ES module export)
import JSZip from 'jszip';

/**
 * Download a single image
 * @param {Object} item - Image item with processedUrl and name
 */
export function downloadSingle(item) {
    if (!item.processedUrl) return;
    
    const a = document.createElement('a');
    a.href = item.processedUrl;
    a.download = `unwatermarked_${item.name.replace(/\.[^.]+$/, '')}.png`;
    a.click();
}

/**
 * Download all processed images as a ZIP file
 * @param {Array} imageQueue - Array of image items
 * @returns {Promise<void>}
 */
export async function downloadAll(imageQueue) {
    const completed = imageQueue.filter(item => item.status === 'completed');
    if (completed.length === 0) return;

    const zip = new JSZip();
    
    completed.forEach(item => {
        const filename = `unwatermarked_${item.name.replace(/\.[^.]+$/, '')}.png`;
        zip.file(filename, item.processedBlob);
    });

    const blob = await zip.generateAsync({ type: 'blob' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `unwatermarked_${Date.now()}.zip`;
    a.click();
    
    // Clean up
    URL.revokeObjectURL(a.href);
}