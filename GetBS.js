//刚看的开发文档拉了坨大的写出来的插件
import plugin from '../../lib/plugins/plugin.js';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { segment } from 'oicq'; // 导入segment

export default class BaisiPlugin extends plugin {
  constructor() {
    super({
      name: '雪糕我爱',
      dsc: '仅限指定群聊使用的白丝图片插件',
      event: 'message',
      priority: 5000,
      rule: [
        {
          reg: /^ww(开启|关闭)bs$/, // 修正正则表达式，添加/包裹
          fnc: 'togglePlugin'
        },
        {
          reg: /^wwbs$/, // 修正正则表达式，添加/包裹
          fnc: 'getBaisiImage'
        }
      ]
    });

    this.configPath = path.join(process.cwd(), 'data/baisi-plugin');
    this.configFile = path.join(this.configPath, 'config.json');
    this.allowedGroups = [];
    this.initConfig();
    this.lastRequestTime = 0;
    this.cooldown = 3000;
  }

  initConfig() {
    if (!fs.existsSync(this.configPath)) fs.mkdirSync(this.configPath, { recursive: true });
    if (fs.existsSync(this.configFile)) {
      try {
        this.allowedGroups = JSON.parse(fs.readFileSync(this.configFile, 'utf8'));
      } catch (e) {
        this.allowedGroups = [];
        this.saveConfig();
      }
    } else {
      this.saveConfig();
    }
  }

  saveConfig() {
    fs.writeFileSync(this.configFile, JSON.stringify(this.allowedGroups, null, 2));
  }

  async togglePlugin(e) {
    if (!e.isMaster) return e.reply('只有主人才能执行此操作！，请联系主人使用');
    if (!e.isGroup) return e.reply('请在群聊中操作！');
    
    const action = e.msg.match(/开启|关闭/)[0];
    const groupId = e.group_id;
    
    if (action === '开启') {
      if (!this.allowedGroups.includes(groupId)) {
        this.allowedGroups.push(groupId);
        this.saveConfig();
        return e.reply(`已在群 ${groupId} 开启功能`);
      }
      return e.reply('该群已开启');
    } else {
      this.allowedGroups = this.allowedGroups.filter(id => id !== groupId);
      this.saveConfig();
      return e.reply(`已在群 ${groupId} 关闭功能`);
    }
  }

  async getBaisiImage(e) {
    if (!e.isGroup || !this.allowedGroups.includes(e.group_id)) {
      return e.reply('该功能仅在指定群聊可用，联系主人开启');
    }
    
    if (Date.now() - this.lastRequestTime < this.cooldown) {
      return e.reply('⌛ 冷却中，稍后再试');
    }
    this.lastRequestTime = Date.now();
    
    try {
      await e.reply('🚀 正在获取图片...');
      const res = await fetch('https://v2.xxapi.cn/api/baisi', {
        headers: { 'User-Agent': 'xiaoxiaoapi/1.0.0' }
      });
      if (!res.ok) throw new Error('API请求失败');
      const data = await res.json();
      if (data.code !== 200 || !data.data) throw new Error('无效数据');
      
      await e.reply(segment.image(data.data));
      const texts = ['😂 斯哈斯哈', '🤣 美味！', '😆 大奶糕', '🤪 卡哇伊', '😜 好可爱'];
      await e.reply(texts[Math.floor(Math.random() * texts.length)]);
    } catch (error) {
      console.error(error);
      const fallbacks = [
        'https://cdn.api-m.com/images/baisi/fallback1.jpg',
        'https://cdn.api-m.com/images/baisi/fallback2.jpg',
        'https://cdn.api-m.com/images/baisi/fallback3.jpg'
      ];
      await e.reply([
        '❌ 获取失败，备用图片奉上',
        segment.image(fallbacks[Math.floor(Math.random() * fallbacks.length)]),
        '💡 请稍后重试'
      ]);
    }
  }
}
