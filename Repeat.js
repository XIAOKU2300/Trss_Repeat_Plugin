// 路径: plugins/repeater-plugin/index.js
import plugin from '../../lib/plugins/plugin.js';
import fs from 'fs';
import path from 'path';
import _ from 'lodash';

export default class RepeaterPlugin extends plugin {
  constructor() {
    super({
      name: '群复读检测',
      dsc: '检测群复读行为并自动加入复读',
      event: 'message.group',
      priority: 5000,
      rule: [
        {
          reg: '^#开机机器人复读$',
          fnc: 'enableRepeater'
        },
        {
          reg: '^#关机机器人复读$',
          fnc: 'disableRepeater'
        },
        {
          reg: '^#复读状态$',
          fnc: 'showStatus'
        },
        {
          reg: '.*',
          fnc: 'detectRepeater',
          log: false
        }
      ]
    });

    // 配置文件路径
    this.configPath = path.join(process.cwd(), 'data/repeater-plugin');
    this.configFile = path.join(this.configPath, 'config.json');
    
    // 确保配置目录存在
    if (!fs.existsSync(this.configPath)) {
      fs.mkdirSync(this.configPath, { recursive: true });
    }
    
    // 加载配置
    this.loadConfig();
  }
  
  // 加载配置
  loadConfig() {
    try {
      if (fs.existsSync(this.configFile)) {
        this.config = JSON.parse(fs.readFileSync(this.configFile, 'utf8'));
      } else {
        // 默认配置
        this.config = {
          enabledGroups: [],
          settings: {
            threshold: 3,
            ignoreCommands: true,
            ignoreMasters: true
          },
          records: {}
        };
        this.saveConfig();
      }
    } catch (e) {
      console.error('复读插件配置加载失败:', e);
      // 初始化配置
      this.config = {
        enabledGroups: [],
        settings: {
          threshold: 3,
          ignoreCommands: true,
          ignoreMasters: true
        },
        records: {}
      };
      this.saveConfig();
    }
  }
  
  // 保存配置
  saveConfig() {
    try {
      fs.writeFileSync(this.configFile, JSON.stringify(this.config, null, 2));
    } catch (e) {
      console.error('复读插件配置保存失败:', e);
    }
  }
  
  // 开启复读功能
  async enableRepeater(e) {
    const groupId = e.group_id;
    
    if (!this.config.enabledGroups.includes(groupId)) {
      this.config.enabledGroups.push(groupId);
      
      // 初始化群记录
      if (!this.config.records[groupId]) {
        this.config.records[groupId] = {
          lastMessage: '',
          repeatCount: 0,
          repeatUsers: []
        };
      }
      
      this.saveConfig();
      
      await e.reply([
        `群复读检测功能已开启！\n`,
        `当群友复读相同消息超过${this.config.settings.threshold}次时，我会加入复读\n`,
        `发送 #关机机器人复读 可以关闭此功能`
      ], true);
    } else {
      await e.reply('本群复读检测功能已经开启啦~', true);
    }
    
    return true;
  }
  
  // 关闭复读功能
  async disableRepeater(e) {
    const groupId = e.group_id;
    
    if (this.config.enabledGroups.includes(groupId)) {
      this.config.enabledGroups = this.config.enabledGroups.filter(id => id !== groupId);
      this.saveConfig();
      await e.reply('群复读检测功能已关闭', true);
    } else {
      await e.reply('本群复读检测功能尚未开启哦', true);
    }
    
    return true;
  }
  
  // 显示状态
  async showStatus(e) {
    const groupId = e.group_id;
    const isEnabled = this.config.enabledGroups.includes(groupId);
    const settings = this.config.settings;
    
    await e.reply([
      `本群复读功能状态: ${isEnabled ? '已开启' : '已关闭'}\n`,
      `当前设置:\n`,
      `- 触发阈值: ${settings.threshold}次\n`,
      `- 忽略命令: ${settings.ignoreCommands ? '是' : '否'}\n`,
      `- 忽略主人: ${settings.ignoreMasters ? '是' : '否'}`
    ], true);
    
    return true;
  }
  
  // 检测复读行为
  async detectRepeater(e) {
    const groupId = e.group_id;
    const userId = e.user_id;
    const msg = e.msg;
    
    // 检查本群是否启用功能
    if (!this.config.enabledGroups.includes(groupId)) {
      return false;
    }
    
    // 获取群记录
    const groupRecord = this.config.records[groupId] || {
      lastMessage: '',
      repeatCount: 0,
      repeatUsers: []
    };
    
    // 忽略机器人自己的消息
    if (userId === e.bot.uin) return;
    
    // 忽略命令消息（可选）
    if (this.config.settings.ignoreCommands && /^[#\/]/.test(msg)) return;
    
    // 忽略主人消息（可选）
    if (this.config.settings.ignoreMasters && e.isMaster) return;
    
    // 复读检测逻辑
    if (msg === groupRecord.lastMessage) {
      // 避免同一用户重复计数
      if (!groupRecord.repeatUsers.includes(userId)) {
        groupRecord.repeatCount++;
        groupRecord.repeatUsers.push(userId);
      }
      
      // 达到阈值时触发复读
      if (groupRecord.repeatCount >= this.config.settings.threshold) {
        // 发送复读消息
        await e.reply(groupRecord.lastMessage);
        
        // 重置计数器
        groupRecord.repeatCount = 0;
        groupRecord.repeatUsers = [];
        
        console.log(`群 ${groupId} 触发复读，机器人已响应`);
      }
    } else {
      // 新消息，重置计数器
      groupRecord.lastMessage = msg;
      groupRecord.repeatCount = 1;
      groupRecord.repeatUsers = [userId];
    }
    
    // 保存更新后的记录
    this.config.records[groupId] = groupRecord;
    this.saveConfig();
    
    return true;
  }
}
