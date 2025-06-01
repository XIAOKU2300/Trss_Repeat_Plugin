import plugin from '../../lib/plugins/plugin.js';
import fetch from 'node-fetch';

export default class BaisiPlugin extends plugin {
  constructor() {
    super({
      name: '雪糕我爱',
      dsc: '获取白丝图片',
      event: 'message',
      priority: 5000,
      rule: [
        {
          reg: '^wwbs$',
          fnc: 'getBaisiImage'
        }
      ]
    });
    
    // 缓存上次请求时间，防止频繁请求
    this.lastRequestTime = 0;
    this.cooldown = 5000; // 3秒冷却时间
  }

  // 获取百思不得姐图片
  async getBaisiImage(e) {
    // 检查冷却时间
    const now = Date.now();
    if (now - this.lastRequestTime < this.cooldown) {
      await e.reply('⌛ 请求太频繁了，请稍后再试~');
      return true;
    }
    this.lastRequestTime = now;

    try {
      await e.reply('🚀 正在获取白丝（雪糕）图片...');

      // 设置请求头部
      const headers = {
        'User-Agent': 'xiaoxiaoapi/1.0.0 (https://xxapi.cn)',
        'Accept': 'application/json'
      };

      // 发送API请求
      const response = await fetch('https://v2.xxapi.cn/api/baisi', { headers });
      
      // 检查响应状态
      if (!response.ok) {
        throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
      }

      // 解析JSON数据
      const result = await response.json();
      
      // 验证响应数据
      if (result.code !== 200 || !result.data) {
        throw new Error(`API返回无效数据: ${JSON.stringify(result)}`);
      }

      // 发送图片
      await e.reply(segment.image(result.data));
      
      // 添加随机搞笑文案
      const funnyTexts = [
        '😂 斯哈斯哈真好吃！',
        '🤣 美味！！！！',
        '😆 人间美味大奶糕',
        '🤪 卡哇伊戴斯',
        '😜 好可爱'
      ];
      const randomText = funnyTexts[Math.floor(Math.random() * funnyTexts.length)];
      await e.reply(randomText);
      
      return true;
    } catch (error) {
      console.error('获取雪糕失败:', error);
      
      // 错误处理 - 发送备用图片
      const fallbackImages = [
        'https://cdn.api-m.com/images/baisi/fallback1.jpg',
        'https://cdn.api-m.com/images/baisi/fallback2.jpg',
        'https://cdn.api-m.com/images/baisi/fallback3.jpg'
      ];
      const randomImage = fallbackImages[Math.floor(Math.random() * fallbackImages.length)];
      
      await e.reply([
        '❌ 获取图片失败，可能是网络问题或API限制',
        segment.image(randomImage),
        '💡 你看你妈呢~'
      ]);
      
      return true;
    }
  }
}
