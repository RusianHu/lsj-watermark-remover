/**
 * UI 模块
 * 处理 DOM 操作、事件监听和 UI 状态管理
 * 像素游戏风格界面增强版
 */

import i18n from './i18n.js';

// DOM 元素引用
export const elements = {
    uploadArea: null,
    fileInput: null,
    singlePreview: null,
    multiPreview: null,
    imageList: null,
    progressText: null,
    progressBar: null,
    downloadAllBtn: null,
    originalImage: null,
    processedSection: null,
    processedImage: null,
    originalInfo: null,
    processedInfo: null,
    downloadBtn: null,
    resetBtn: null,
    langSwitch: null,
    tabButtons: null,
    sceneDecorations: null
};

/**
 * 初始化 DOM 元素引用
 */
export function initElements() {
    elements.uploadArea = document.getElementById('uploadArea');
    elements.fileInput = document.getElementById('fileInput');
    elements.singlePreview = document.getElementById('singlePreview');
    elements.multiPreview = document.getElementById('multiPreview');
    elements.imageList = document.getElementById('imageList');
    elements.progressText = document.getElementById('progressText');
    elements.progressBar = document.getElementById('progressBar');
    elements.downloadAllBtn = document.getElementById('downloadAllBtn');
    elements.originalImage = document.getElementById('originalImage');
    elements.processedSection = document.getElementById('processedSection');
    elements.processedImage = document.getElementById('processedImage');
    elements.originalInfo = document.getElementById('originalInfo');
    elements.processedInfo = document.getElementById('processedInfo');
    elements.downloadBtn = document.getElementById('downloadBtn');
    elements.resetBtn = document.getElementById('resetBtn');
    elements.langSwitch = document.getElementById('langSwitch');
    elements.tabButtons = document.querySelectorAll('[data-tab]');
    elements.sceneDecorations = document.getElementById('sceneDecorations');

    // 初始化标签页事件监听（将在 setupTabs 中设置回调）

    // 初始化增强的拖拽效果
    initEnhancedDragEffects();

    // 初始化装饰物交互（点击掉落）
    setupInteractiveDecorations();

    // 初始化动态云朵系统
    initCloudSystem();
}

/**
 * 动态云朵系统
 * 使用 JS 生成和移动云朵，确保交互性
 */
function initCloudSystem() {
    // 优先使用天空容器，如果没有则回退到 body
    const container = document.getElementById('sky-container') || document.body;
    const maxClouds = 6;
    const clouds = [];

    class Cloud {
        constructor(isInitial = false) {
            this.element = document.createElement('div');
            
            // 随机选择一个云朵变体形状
            const variant = Math.floor(Math.random() * 6) + 1;
            this.element.className = `pixel-cloud pixel-cloud-${variant}`;
            
            // 随机参数
            const scale = 1.2 + Math.random() * 1.0;
            this.speed = 0.3 + Math.random() * 0.4; // 移动速度
            
            // 初始位置
            // 相对于容器宽度
            this.x = isInitial ? Math.random() * container.offsetWidth : -150;
            
            // 垂直位置：在容器高度内随机分布，稍微避开最顶部（header）
            // 容器高度设为了 500px，我们在 50px ~ 400px 之间生成
            this.y = 50 + Math.random() * 350;
            
            this.scale = scale;
            this.isDropping = false;

            // 应用初始样式
            this.updateTransform();
            
            // 插入 DOM
            container.appendChild(this.element);
            
            // 设置 dataset 以便事件委托识别
            this.element.dataset.type = 'cloud';
            
            // 强制启用指针事件，确保能点到
            this.element.style.pointerEvents = 'auto';
        }

        update() {
            if (this.isDropping) return false; // 掉落中不由我们控制移动

            this.x += this.speed;
            
            // 检查是否被标记为掉落（由全局事件处理器处理）
            if (this.element.dataset.dropping === 'true') {
                this.isDropping = true;
                return false; // 移除出管理列表
            }

            // 检查是否超出容器右侧 (使用容器宽度而非窗口宽度，更准确)
            if (this.x > container.offsetWidth + 100) {
                this.element.remove();
                return false; // 需要销毁
            }

            this.updateTransform();
            return true; // 继续存在
        }

        updateTransform() {
            this.element.style.transform = `translate(${this.x}px, ${this.y}px) scale(${this.scale})`;
        }
    }

    // 初始化生成一批云朵
    for (let i = 0; i < maxClouds; i++) {
        clouds.push(new Cloud(true));
    }

    // 游戏循环
    function gameLoop() {
        // 更新现有云朵
        for (let i = clouds.length - 1; i >= 0; i--) {
            if (!clouds[i].update()) {
                clouds.splice(i, 1);
            }
        }

        // 补充新云朵
        if (clouds.length < maxClouds && Math.random() < 0.005) {
            clouds.push(new Cloud(false));
        }

        requestAnimationFrame(gameLoop);
    }

    gameLoop();
}

/**
 * 设置页面装饰元素的交互效果（点击掉落）
 * 使用事件委托以支持动态添加的元素
 */
function setupInteractiveDecorations() {
    const targetClasses = [
        'pixel-question-block',
        'pixel-coin',
        'pixel-star',
        'pixel-bush',
        'pixel-cloud'
    ];

    // 为所有现有元素添加鼠标指针样式
    const addCursorStyle = () => {
        const selector = targetClasses.map(c => `.${c}`).join(',');
        document.querySelectorAll(selector).forEach(el => {
            el.classList.add('interactive-prop');
        });
    };
    
    // 初始执行一次
    addCursorStyle();

    // 监听 body 的点击事件
    document.body.addEventListener('click', (e) => {
        // 查找最近的匹配元素
        const target = e.target.closest(targetClasses.map(c => `.${c}`).join(','));
        
        if (target && !target.dataset.dropping) {
            e.preventDefault();
            e.stopPropagation();

            // 标记为正在掉落
            target.dataset.dropping = 'true';

            // 1. 获取当前精确的屏幕位置和尺寸
            const rect = target.getBoundingClientRect();
            
            // 2. 锁定元素位置：从文档流/动画流中剥离，改为 Fixed 定位
            // 这一步至关重要，它能“冻结”住飘动的云朵
            target.style.position = 'fixed';
            target.style.left = `${rect.left}px`;
            target.style.top = `${rect.top}px`;
            
            // 如果是云朵，它可能有缩放，getBoundingClientRect 获取的是缩放后的尺寸
            // 我们需要保持这个视觉尺寸
            target.style.width = `${rect.width}px`;
            target.style.height = `${rect.height}px`;
            
            target.style.margin = '0';
            target.style.transform = 'translate(0, 0)'; // 重置 transform，因为位置已经是绝对坐标了
            target.style.animation = 'none'; // 停止所有 CSS 动画
            target.style.transition = 'none'; // 停止 JS 驱动的 transition
            target.style.zIndex = '9999'; // 确保在最上层
            target.style.pointerEvents = 'none'; // 避免再次点击

            // 3. 计算物理参数
            // 随机旋转方向和角度 (Unity 风格的随机力矩)
            const rotateDir = Math.random() > 0.5 ? 1 : -1;
            const rotation = (15 + Math.random() * 30) * rotateDir; // 15~45度
            // 掉落距离：屏幕高度 + 自身高度 + 缓冲
            const dropDist = window.innerHeight - rect.top + rect.height + 50;
            
            // 4. 使用 Web Animations API 执行高性能物理掉落
            // 模拟重力加速曲线 (cubic-bezier)
            const animation = target.animate([
                {
                    transform: 'translate(0, 0) rotate(0deg)',
                    opacity: 1
                },
                {
                    transform: `translate(0, ${dropDist}px) rotate(${rotation}deg)`,
                    opacity: 0
                }
            ], {
                duration: 800, // 800ms 快速下坠
                easing: 'cubic-bezier(0.55, 0.085, 0.68, 0.53)', // 模拟重力加速
                fill: 'forwards'
            });

            // 动画结束后移除元素
            animation.onfinish = () => target.remove();
        }
    });

    // 监听 DOM 变化，为新元素添加鼠标样式 (使用 MutationObserver)
    const observer = new MutationObserver((mutations) => {
        let shouldUpdate = false;
        mutations.forEach(mutation => {
            if (mutation.addedNodes.length) shouldUpdate = true;
        });
        if (shouldUpdate) addCursorStyle();
    });

    observer.observe(document.body, { childList: true, subtree: true });
}

/**
 * 设置 AI 模型选项卡，带有切换回调
 * @param {Function} onTabSwitch - 标签页切换时的回调函数，参数为引擎名称
 */
export function setupTabs(onTabSwitch) {
    if (!elements.tabButtons) return;

    elements.tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            if (btn.disabled) return;

            // 移除所有标签页的 active 类
            elements.tabButtons.forEach(t => t.classList.remove('active'));
            // 为点击的标签页添加 active 类
            btn.classList.add('active');

            // 切换处理引擎
            const tabName = btn.getAttribute('data-tab');
            console.log(`Switched to ${tabName} engine`);

            // 调用回调函数
            if (onTabSwitch) {
                onTabSwitch(tabName);
            }

            // 添加点击动画效果
            btn.style.transform = 'scale(0.95)';
            setTimeout(() => {
                btn.style.transform = '';
            }, 100);
        });
    });
}

/**
 * 初始化增强的拖拽效果
 */
function initEnhancedDragEffects() {
    const { uploadArea } = elements;
    if (!uploadArea) return;

    // 拖拽进入时的粒子效果
    uploadArea.addEventListener('dragenter', () => {
        // 添加额外的视觉反馈
        const icon = uploadArea.querySelector('.pixel-icon-box');
        if (icon) {
            icon.classList.add('pixel-wiggle');
        }
    });

    uploadArea.addEventListener('dragleave', () => {
        const icon = uploadArea.querySelector('.pixel-icon-box');
        if (icon) {
            icon.classList.remove('pixel-wiggle');
        }
    });

    uploadArea.addEventListener('drop', () => {
        const icon = uploadArea.querySelector('.pixel-icon-box');
        if (icon) {
            icon.classList.remove('pixel-wiggle');
            // 添加成功反馈动画
            icon.style.transform = 'scale(1.2)';
            setTimeout(() => {
                icon.style.transform = '';
            }, 200);
        }
    });
}

/**
 * 获取当前激活的标签页/引擎
 * @returns {string} 当前引擎名称 (gemini, qwen, doubao)
 */
export function getCurrentEngine() {
    const activeTab = document.querySelector('[data-tab].active');
    return activeTab ? activeTab.getAttribute('data-tab') : 'gemini';
}

/**
 * 设置语言切换按钮
 * @param {Function} onSwitch - 语言切换时的回调函数
 */
export function setupLanguageSwitch(onSwitch) {
    const btn = elements.langSwitch;
    if (!btn) return;

    btn.textContent = i18n.locale === 'zh-CN' ? 'EN' : '中文';
    btn.addEventListener('click', async () => {
        // 添加按钮点击动画
        btn.style.transform = 'scale(0.9)';

        const newLocale = i18n.locale === 'zh-CN' ? 'en-US' : 'zh-CN';
        await i18n.switchLocale(newLocale);
        btn.textContent = newLocale === 'zh-CN' ? 'EN' : '中文';

        setTimeout(() => {
            btn.style.transform = '';
        }, 100);

        if (onSwitch) onSwitch();
    });
}

/**
 * 设置文件上传事件监听
 * @param {Function} onFilesSelected - 文件选择时的回调函数
 */
export function setupFileUpload(onFilesSelected) {
    const { uploadArea, fileInput } = elements;
    if (!uploadArea || !fileInput) return;

    uploadArea.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', (e) => {
        onFilesSelected(Array.from(e.target.files));
    });

    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });

    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragover');
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        onFilesSelected(Array.from(e.dataTransfer.files));
    });
}

/**
 * 重置 UI 到初始状态
 */
export function resetUI() {
    const { singlePreview, multiPreview, fileInput, progressBar } = elements;
    if (singlePreview) singlePreview.style.display = 'none';
    if (multiPreview) multiPreview.style.display = 'none';
    if (fileInput) fileInput.value = '';
    if (progressBar) progressBar.style.width = '0%';
}

/**
 * 显示单图预览模式
 */
export function showSinglePreview() {
    const { singlePreview, multiPreview } = elements;
    if (singlePreview) {
        singlePreview.style.display = 'block';
        // 添加入场动画
        singlePreview.style.opacity = '0';
        singlePreview.style.transform = 'translateY(20px)';
        requestAnimationFrame(() => {
            singlePreview.style.transition = 'all 0.3s ease';
            singlePreview.style.opacity = '1';
            singlePreview.style.transform = 'translateY(0)';
        });
    }
    if (multiPreview) multiPreview.style.display = 'none';
}

/**
 * 显示多图预览模式
 */
export function showMultiPreview() {
    const { singlePreview, multiPreview, imageList } = elements;
    if (singlePreview) singlePreview.style.display = 'none';
    if (multiPreview) {
        multiPreview.style.display = 'block';
        // 添加入场动画
        multiPreview.style.opacity = '0';
        multiPreview.style.transform = 'translateY(20px)';
        requestAnimationFrame(() => {
            multiPreview.style.transition = 'all 0.3s ease';
            multiPreview.style.opacity = '1';
            multiPreview.style.transform = 'translateY(0)';
        });
        setTimeout(() => {
            multiPreview.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    }
    if (imageList) imageList.innerHTML = '';
}

/**
 * 更新进度文本和进度条
 * @param {number} processed - 已处理的图片数量
 * @param {number} total - 总图片数量
 */
export function updateProgress(processed, total) {
    const { progressText, progressBar } = elements;
    if (progressText) {
        progressText.textContent = `${i18n.t('progress.text')}: ${processed}/${total}`;
    }
    if (progressBar) {
        const percentage = total > 0 ? (processed / total) * 100 : 0;
        progressBar.style.width = `${percentage}%`;

        // 100% 完成时添加闪烁效果
        if (percentage >= 100) {
            progressBar.style.animation = 'progress-stripes 0.3s linear infinite, badge-shine 1s ease-in-out 3';
        }
    }
}

/**
 * 更新图片卡片的状态
 * @param {number} id - 图片 ID
 * @param {string} text - 状态文本
 * @param {boolean} isHtml - 是否为 HTML 内容
 */
export function updateStatus(id, text, isHtml = false) {
    const el = document.getElementById(`status-${id}`);
    if (el) {
        el.innerHTML = isHtml ? text : text.replace(/\n/g, '<br>');

        // 添加状态更新动画
        el.style.opacity = '0';
        requestAnimationFrame(() => {
            el.style.transition = 'opacity 0.2s ease';
            el.style.opacity = '1';
        });
    }
}

/**
 * 创建多图模式下的图片卡片（像素风格）
 * @param {Object} item - 图片项 {id, name}
 * @param {Function} onDownload - 下载回调函数
 */
export function createImageCard(item, onDownload) {
    const { imageList } = elements;
    if (!imageList) return;

    const card = document.createElement('div');
    card.id = `card-${item.id}`;
    card.className = 'pixel-panel overflow-hidden';

    // 添加入场动画延迟
    card.style.opacity = '0';
    card.style.transform = 'translateX(-20px)';

    card.innerHTML = `
        <div class="flex flex-wrap">
            <div class="w-full md:w-auto flex border-b-4 md:border-b-0 md:border-r-4 border-pixel-border">
                <div class="w-20 md:w-40 flex-shrink-0 pixel-transparency-grid p-2 flex items-center justify-center">
                    <img id="result-${item.id}" class="max-w-full max-h-16 md:max-h-28" style="image-rendering: auto;" data-zoomable />
                </div>
                <div class="flex-1 p-2 md:p-3 flex flex-col min-w-0 bg-[#f0f0f0]">
                    <h4 class="text-[9px] md:text-[10px] text-black mb-1 md:mb-2 truncate flex items-center gap-1 font-bold">
                        <svg class="w-2 h-2 md:w-3 md:h-3 flex-shrink-0" viewBox="0 0 16 16" fill="currentColor">
                            <rect x="2" y="2" width="12" height="10"/>
                            <rect x="4" y="4" width="8" height="6" fill="white"/>
                            <rect x="5" y="5" width="3" height="3" fill="currentColor"/>
                        </svg>
                        <span class="truncate">${item.name}</span>
                    </h4>
                    <div class="text-[8px] md:text-[9px] text-gray-600 flex items-center gap-1" id="status-${item.id}">
                        <span class="inline-block w-2 h-2 bg-pixel-accent animate-pulse"></span>
                        ${i18n.t('status.pending')}
                    </div>
                </div>
            </div>
            <div class="w-full md:w-auto ml-auto flex-shrink-0 p-2 md:p-3 flex items-center justify-center bg-[#f0f0f0]">
                <button id="download-${item.id}" class="pixel-btn pixel-btn-primary px-3 md:px-4 py-1.5 md:py-2 text-[8px] md:text-[9px] text-white hidden flex items-center gap-1">
                    <svg class="w-3 h-3" viewBox="0 0 16 16" fill="currentColor">
                        <rect x="7" y="2" width="2" height="8"/>
                        <rect x="5" y="8" width="2" height="2"/>
                        <rect x="9" y="8" width="2" height="2"/>
                        <rect x="3" y="12" width="10" height="2"/>
                    </svg>
                    ${i18n.t('btn.download')}
                </button>
            </div>
        </div>
    `;
    imageList.appendChild(card);

    // 添加入场动画
    requestAnimationFrame(() => {
        card.style.transition = 'all 0.3s ease';
        card.style.transitionDelay = `${item.id * 0.05}s`;
        card.style.opacity = '1';
        card.style.transform = 'translateX(0)';
    });
}

/**
 * 显示全部下载按钮
 */
export function showDownloadAllBtn() {
    const { downloadAllBtn } = elements;
    if (downloadAllBtn) {
        downloadAllBtn.style.display = 'flex';
        // 添加成功动画
        downloadAllBtn.classList.add('status-success');
        setTimeout(() => {
            downloadAllBtn.classList.remove('status-success');
        }, 500);
    }
}

/**
 * 更新单图预览的原始图片信息
 * @param {HTMLImageElement} img - 原始图片
 * @param {Object} watermarkInfo - 水印信息 {size, position}
 */
export function updateOriginalPreview(img, watermarkInfo) {
    const { originalImage, originalInfo } = elements;
    if (originalImage) originalImage.src = img.src;
    if (originalInfo) {
        const sizeDisplay = watermarkInfo.sizeDisplay || `${watermarkInfo.size}×${watermarkInfo.size}`;
        originalInfo.innerHTML = `
            <span class="flex items-center gap-1">
                <svg class="w-2 h-2" viewBox="0 0 8 8" fill="currentColor">
                    <rect x="0" y="0" width="8" height="8"/>
                </svg>
                ${i18n.t('info.size')}: ${img.width}×${img.height}
            </span>
            <span class="mx-1 md:mx-2">|</span>
            <span>${i18n.t('info.watermark')}: ${sizeDisplay}</span>
        `;
    }
}

/**
 * 更新单图预览的处理后图片
 * @param {string} url - 处理后图片的 URL
 * @param {number} width - 图片宽度
 * @param {number} height - 图片高度
 * @param {Function} onDownload - 下载回调函数
 */
export function updateProcessedPreview(url, width, height, onDownload) {
    const { processedSection, processedImage, processedInfo, downloadBtn } = elements;

    if (processedImage) processedImage.src = url;
    if (processedSection) {
        processedSection.style.display = 'block';
        // 添加成功动画
        processedSection.classList.remove('status-success');
        void processedSection.offsetWidth; // 强制重绘
        processedSection.classList.add('status-success');

        setTimeout(() => {
            processedSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    }
    if (downloadBtn) {
        downloadBtn.style.display = 'flex';
        downloadBtn.onclick = onDownload;
    }
    if (processedInfo) {
        processedInfo.innerHTML = `
            <span class="flex items-center gap-1">
                <svg class="w-2 h-2" viewBox="0 0 8 8" fill="currentColor">
                    <rect x="0" y="0" width="8" height="8"/>
                </svg>
                ${i18n.t('info.size')}: ${width}×${height}
            </span>
            <span class="mx-1 md:mx-2">|</span>
            <span class="flex items-center gap-1 text-pixel-primary">
                <svg class="w-2 h-2" viewBox="0 0 8 8" fill="currentColor">
                    <rect x="1" y="4" width="2" height="2"/>
                    <rect x="3" y="5" width="2" height="2"/>
                    <rect x="5" y="2" width="2" height="2"/>
                </svg>
                ${i18n.t('info.removed')}
            </span>
        `;
    }
}

/**
 * 显示单个图片的下载按钮
 * @param {number} id - 图片 ID
 * @param {Function} onClick - 点击回调函数
 */
export function showDownloadBtn(id, onClick) {
    const downloadBtn = document.getElementById(`download-${id}`);
    if (downloadBtn) {
        downloadBtn.classList.remove('hidden');
        downloadBtn.onclick = onClick;
        // 添加成功动画
        downloadBtn.classList.add('status-success');
        setTimeout(() => {
            downloadBtn.classList.remove('status-success');
        }, 500);
    }

    // 更新状态图标为成功
    const statusEl = document.getElementById(`status-${id}`);
    if (statusEl) {
        const icon = statusEl.querySelector('.animate-pulse');
        if (icon) {
            icon.classList.remove('bg-pixel-accent', 'animate-pulse');
            icon.classList.add('bg-pixel-primary');
        }
    }
}

/**
 * 为图片状态添加警告信息
 * @param {number} id - 图片 ID
 * @param {string} status - 警告消息
 */
export function addStatusWarning(id, status) {
    const statusEl = document.getElementById(`status-${id}`);
    if (statusEl) {
        statusEl.innerHTML += `
            <p class="mt-1 text-[8px] md:text-[9px] text-pixel-accent flex items-center gap-1">
                <svg class="w-2 h-2 flex-shrink-0" viewBox="0 0 8 8" fill="currentColor">
                    <rect x="3" y="1" width="2" height="4"/>
                    <rect x="3" y="6" width="2" height="2"/>
                </svg>
                ${status}
            </p>
        `;

        // 添加警告动画
        statusEl.classList.add('status-fail');
        setTimeout(() => {
            statusEl.classList.remove('status-fail');
        }, 500);
    }
}

/**
 * 触发成功金币收集效果
 */
export function triggerCoinEffect() {
    const container = elements.sceneDecorations;
    if (!container) return;

    // 创建金币效果
    for (let i = 0; i < 5; i++) {
        const coin = document.createElement('div');
        coin.className = 'pixel-coin floating-collectible';
        coin.style.left = `${30 + Math.random() * 40}%`;
        coin.style.animationDelay = `${i * 0.1}s`;
        coin.style.animationDuration = '2s';
        container.appendChild(coin);

        // 动画结束后移除
        setTimeout(() => {
            coin.remove();
        }, 2000);
    }
}
