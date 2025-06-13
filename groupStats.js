import plugin from '../../lib/plugins/plugin.js'
import fs from 'fs'
import path from 'node:path'

const DATA_DIR  = path.resolve(process.cwd(), 'data/chat-stats')
const DATA_FILE = path.resolve(DATA_DIR, 'stats.json')

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  }
}

function loadStats() {
  ensureDataDir()
  if (!fs.existsSync(DATA_FILE)) return {}
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8')) }
  catch { return {} }
}

function saveStats(data) {
  ensureDataDir()
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8')
}

export class chatStat extends plugin {
  constructor() {
    super({
      name: '群聊统计',
      dsc: '统计群聊活跃度和用户发言情况',
      // 这里只保留命令规则
      event: 'message.group',
      priority: 4000,
      rule: [
        { reg: '^#?(群)?统计$', fnc: 'showOverallStats' },
        { reg: '^#?(用户)?排行$', fnc: 'showUserRanking' }
      ]
    })
  }

  /** 插件创建时自动订阅群消息事件 */
  async create() {
    // 在 bot 上注册一个 group 消息监听器
    this.bot.on('message.group', this.recordMessage.bind(this))
  }

  /** 只负责记录，不拦截消息 */
  async recordMessage(e) {
    const gid = String(e.group_id)
    const uid = String(e.user_id)
    const now = Date.now()
    const data = loadStats()

    if (!data[gid]) {
      data[gid] = {
        totalMessages:  0,
        userCounts:     {},
        firstTimestamp: now,
        lastTimestamp:  now
      }
    }
    const grp = data[gid]
    grp.totalMessages++  
    grp.lastTimestamp = now
    grp.userCounts[uid] = (grp.userCounts[uid] || 0) + 1
    if (now < grp.firstTimestamp) grp.firstTimestamp = now

    saveStats(data)
    // 返回不拦截
    return false
  }

  async showOverallStats(e) {
    const data = loadStats()
    const grp  = data[String(e.group_id)]
    if (!grp) return false

    const hours = Math.floor((grp.lastTimestamp - grp.firstTimestamp) / 3600000)
    await e.reply([
      '📊 群聊总体统计',
      `• 发言总数：${grp.totalMessages} 条`,
      `• 活跃时长：${hours} 小时`
    ].join('\n'))
    return true
  }

  async showUserRanking(e) {
    const data = loadStats()
    const grp  = data[String(e.group_id)]
    if (!grp) return false

    const top10 = Object.entries(grp.userCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)

    const lines = ['🏆 群成员发言排行 Top10']
    for (let i = 0; i < top10.length; i++) {
      const [uid, cnt] = top10[i]
      const member = await Bot.pickMember(e.group_id, Number(uid))
      const name = member?.card || member?.nickname || uid
      lines.push(`${i + 1}. ${name}：${cnt} 条`)
    }

    await e.reply(lines.join('\n'))
    return true
  }
}
