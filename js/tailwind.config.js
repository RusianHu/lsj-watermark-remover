/**
 * Tailwind CSS 自定义配置
 * 
 * 项目使用 Tailwind CDN 方式加载，此文件定义自定义主题配置。
 * 包含像素游戏风格的颜色、字体和阴影设置。
 * 
 * @see https://tailwindcss.com/docs/configuration
 */
tailwind.config = {
  theme: {
    extend: {
      colors: {
        // Retro Game Palette - Sky Theme
        'pixel-bg': '#5c94fc', /* Vibrant Blue Sky */
        'pixel-bg-light': '#92ccff',
        'pixel-sky-top': '#5c94fc',
        'pixel-sky-bottom': '#92ccff',
        'pixel-primary': '#00a800', /* Classic Green */
        'pixel-primary-dark': '#257953',
        'pixel-secondary': '#3B7DD8',
        'pixel-accent': '#e64e4e', /* Vibrant Red */
        'pixel-gold': '#f8b800', /* Coin Gold */
        'pixel-red': '#d01000',
        'pixel-purple': '#8b5fbf',
        'pixel-pink': '#f77eb3',
        'pixel-text': '#2d3748',
        'pixel-text-dim': '#4a5568',
        'pixel-text-light': '#ffffff',
        'pixel-border': '#000000',
        'pixel-shadow': '#000000',
        'pixel-cloud': '#ffffff',
        'pixel-ground': '#00a800',
        'pixel-ground-dark': '#008000',
        'pixel-brick': '#b84818',
        'pixel-brick-dark': '#883000',
        'pixel-dark': '#202020',
      },
      fontFamily: {
        'pixel': ['"Press Start 2P"', '"fusion-pixel-12px-proportional-zh_hans"', 'sans-serif'],
        'pixel-zh': ['"fusion-pixel-12px-proportional-zh_hans"', '"Press Start 2P"', 'sans-serif'],
      },
      boxShadow: {
        'pixel': '4px 4px 0 0 #000000',
        'pixel-sm': '2px 2px 0 0 #000000',
        'pixel-lg': '6px 6px 0 0 #000000',
        'pixel-inset': 'inset 2px 2px 0 0 rgba(255,255,255,0.4), inset -2px -2px 0 0 rgba(0,0,0,0.2)',
        'pixel-title': '4px 4px 0px #000000',
      }
    }
  }
};