/**
 * 装饰效果模块
 * 处理游戏化视觉效果：云朵系统、星星装饰、点击掉落、拖拽反馈、金币特效
 * 
 * 所有装饰效果为可选功能，不影响核心水印移除功能
 */

// 模块配置
const config = {
    // 云朵系统配置
    cloud: {
        enabled: true,
        maxClouds: 6,
        speedRange: [0.3, 0.7],  // 移动速度范围
        scaleRange: [1.2, 2.2],  // 缩放范围
        spawnRate: 0.005         // 生成概率
    },
    // 星星装饰配置
    stars: {
        enabled: true,
        count: 8,
        topRange: 40  // 顶部百分比范围
    },
    // 交互装饰配置
    interactive: {
        enabled: true,
        dropDuration: 800,       // 掉落动画时长 (ms)
        rotationRange: [15, 45]  // 旋转角度范围
    },
    // 金币特效配置
    coinEffect: {
        enabled: true,
        count: 5,
        duration: 2000  // 动画时长 (ms)
    }
};

// 内部状态
let cloudsArray = [];
let cloudContainer = null;
let sceneContainer = null;
let uploadAreaElement = null;
let animationFrameId = null;
let isInitialized = false;

/**
 * 云朵类
 * 管理单个云朵的生命周期和动画
 */
class Cloud {
    constructor(container, isInitial = false) {
        this.container = container;
        this.element = document.createElement('div');
        
        // 随机选择云朵变体形状 (1-6)
        const variant = Math.floor(Math.random() * 6) + 1;
        this.element.className = `pixel-cloud pixel-cloud-${variant}`;
        
        // 随机参数
        const [minScale, maxScale] = config.cloud.scaleRange;
        const [minSpeed, maxSpeed] = config.cloud.speedRange;
        
        this.scale = minScale + Math.random() * (maxScale - minScale);
        this.speed = minSpeed + Math.random() * (maxSpeed - minSpeed);
        
        // 初始位置
        this.x = isInitial ? Math.random() * container.offsetWidth : -150;
        // 垂直位置：50px ~ 400px 之间（避开顶部导航栏）
        this.y = 50 + Math.random() * 350;
        
        this.isDropping = false;

        // 应用初始样式
        this.updateTransform();
        
        // 设置交互属性
        this.element.dataset.type = 'cloud';
        this.element.style.pointerEvents = 'auto';
        
        // 插入 DOM
        container.appendChild(this.element);
    }

    /**
     * 更新云朵位置
     * @returns {boolean} 是否继续存在
     */
    update() {
        if (this.isDropping) return false;

        this.x += this.speed;
        
        // 检查是否被标记为掉落
        if (this.element.dataset.dropping === 'true') {
            this.isDropping = true;
            return false;
        }

        // 检查是否超出容器右侧
        if (this.x > this.container.offsetWidth + 100) {
            this.element.remove();
            return false;
        }

        this.updateTransform();
        return true;
    }

    updateTransform() {
        this.element.style.transform = `translate(${this.x}px, ${this.y}px) scale(${this.scale})`;
    }
}

/**
 * 初始化云朵系统
 * 创建动态飘动的云朵背景
 */
function initCloudSystem() {
    if (!config.cloud.enabled) return;

    // 优先使用天空容器
    cloudContainer = document.getElementById('sky-container') || document.body;
    
    // 初始化云朵数组
    cloudsArray = [];
    
    // 初始生成一批云朵
    for (let i = 0; i < config.cloud.maxClouds; i++) {
        cloudsArray.push(new Cloud(cloudContainer, true));
    }

    // 启动游戏循环
    function gameLoop() {
        // 更新现有云朵
        for (let i = cloudsArray.length - 1; i >= 0; i--) {
            if (!cloudsArray[i].update()) {
                cloudsArray.splice(i, 1);
            }
        }

        // 补充新云朵
        if (cloudsArray.length < config.cloud.maxClouds && Math.random() < config.cloud.spawnRate) {
            cloudsArray.push(new Cloud(cloudContainer, false));
        }

        animationFrameId = requestAnimationFrame(gameLoop);
    }

    gameLoop();
}

/**
 * 初始化星星装饰
 * 在场景容器中生成随机分布的星星
 */
function initStars() {
    if (!config.stars.enabled) return;

    sceneContainer = document.getElementById('sceneDecorations');
    if (!sceneContainer) return;

    // 生成随机星星
    for (let i = 0; i < config.stars.count; i++) {
        const star = document.createElement('div');
        star.className = 'pixel-star';
        star.style.left = `${Math.random() * 100}%`;
        star.style.top = `${Math.random() * config.stars.topRange}%`;
        star.style.animationDelay = `${Math.random() * 2}s`;
        sceneContainer.appendChild(star);
    }
}

/**
 * 设置页面装饰元素的交互效果（点击掉落）
 * 使用事件委托以支持动态添加的元素
 */
function setupInteractiveDecorations() {
    if (!config.interactive.enabled) return;

    const targetClasses = [
        'pixel-question-block',
        'pixel-coin',
        'pixel-star',
        'pixel-bush',
        'pixel-cloud'
    ];

    // 为所有元素添加鼠标指针样式
    const addCursorStyle = () => {
        const selector = targetClasses.map(c => `.${c}`).join(',');
        document.querySelectorAll(selector).forEach(el => {
            el.classList.add('interactive-prop');
        });
    };
    
    // 初始执行一次
    addCursorStyle();

    // 监听 body 的点击事件（事件委托）
    document.body.addEventListener('click', (e) => {
        const target = e.target.closest(targetClasses.map(c => `.${c}`).join(','));
        
        if (target && !target.dataset.dropping) {
            e.preventDefault();
            e.stopPropagation();

            // 标记为正在掉落
            target.dataset.dropping = 'true';

            // 获取当前精确的屏幕位置和尺寸
            const rect = target.getBoundingClientRect();
            
            // 锁定元素位置：改为 Fixed 定位
            target.style.position = 'fixed';
            target.style.left = `${rect.left}px`;
            target.style.top = `${rect.top}px`;
            target.style.width = `${rect.width}px`;
            target.style.height = `${rect.height}px`;
            target.style.margin = '0';
            target.style.transform = 'translate(0, 0)';
            target.style.animation = 'none';
            target.style.transition = 'none';
            target.style.zIndex = '9999';
            target.style.pointerEvents = 'none';

            // 计算物理参数
            const [minRot, maxRot] = config.interactive.rotationRange;
            const rotateDir = Math.random() > 0.5 ? 1 : -1;
            const rotation = (minRot + Math.random() * (maxRot - minRot)) * rotateDir;
            const dropDist = window.innerHeight - rect.top + rect.height + 50;
            
            // 使用 Web Animations API 执行物理掉落
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
                duration: config.interactive.dropDuration,
                easing: 'cubic-bezier(0.55, 0.085, 0.68, 0.53)', // 模拟重力加速
                fill: 'forwards'
            });

            // 动画结束后移除元素
            animation.onfinish = () => target.remove();
        }
    });

    // 监听 DOM 变化，为新元素添加鼠标样式
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
 * 初始化增强的拖拽效果
 * 为上传区域添加视觉反馈
 * @param {HTMLElement} uploadArea - 上传区域元素
 */
function initEnhancedDragEffects(uploadArea) {
    if (!uploadArea) {
        uploadAreaElement = document.getElementById('uploadArea');
    } else {
        uploadAreaElement = uploadArea;
    }
    
    if (!uploadAreaElement) return;

    // 拖拽进入时的视觉反馈
    uploadAreaElement.addEventListener('dragenter', () => {
        const icon = uploadAreaElement.querySelector('.pixel-icon-box');
        if (icon) {
            icon.classList.add('pixel-wiggle');
        }
    });

    uploadAreaElement.addEventListener('dragleave', () => {
        const icon = uploadAreaElement.querySelector('.pixel-icon-box');
        if (icon) {
            icon.classList.remove('pixel-wiggle');
        }
    });

    uploadAreaElement.addEventListener('drop', () => {
        const icon = uploadAreaElement.querySelector('.pixel-icon-box');
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
 * 触发成功金币收集效果
 * 在处理成功时调用，创建金币飘动动画
 */
export function triggerCoinEffect() {
    if (!config.coinEffect.enabled) return;

    const container = sceneContainer || document.getElementById('sceneDecorations');
    if (!container) return;

    // 创建金币效果
    for (let i = 0; i < config.coinEffect.count; i++) {
        const coin = document.createElement('div');
        coin.className = 'pixel-coin floating-collectible';
        coin.style.left = `${30 + Math.random() * 40}%`;
        coin.style.animationDelay = `${i * 0.1}s`;
        coin.style.animationDuration = '2s';
        container.appendChild(coin);

        // 动画结束后移除
        setTimeout(() => {
            coin.remove();
        }, config.coinEffect.duration);
    }
}

/**
 * 初始化所有装饰效果
 * 统一的入口函数，在应用启动时调用
 * @param {Object} options - 可选配置覆盖
 */
export function initDecorations(options = {}) {
    if (isInitialized) {
        console.warn('Decorations module already initialized');
        return;
    }

    // 合并配置
    Object.assign(config, options);

    // 按顺序初始化各个系统
    initStars();
    initCloudSystem();
    setupInteractiveDecorations();
    initEnhancedDragEffects();

    isInitialized = true;
    console.log('Decorations module initialized');
}

/**
 * 销毁所有装饰效果
 * 用于清理资源（如页面卸载时）
 */
export function destroyDecorations() {
    // 停止云朵动画循环
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }

    // 清理云朵元素
    cloudsArray.forEach(cloud => {
        if (cloud.element && cloud.element.parentNode) {
            cloud.element.remove();
        }
    });
    cloudsArray = [];

    isInitialized = false;
}

/**
 * 获取当前配置（用于调试）
 * @returns {Object} 当前配置对象
 */
export function getConfig() {
    return { ...config };
}

/**
 * 更新配置
 * @param {Object} newConfig - 新的配置对象
 */
export function updateConfig(newConfig) {
    Object.assign(config, newConfig);
}

// 默认导出初始化函数
export default {
    init: initDecorations,
    destroy: destroyDecorations,
    triggerCoinEffect,
    getConfig,
    updateConfig
};