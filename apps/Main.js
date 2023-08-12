import plugin from '../../../lib/plugins/plugin.js'
import WebSocket from '../components/WebSocket.js'
import RconConnect from '../components/Rcon.js'
import Config from '../components/Config.js'


export class Main extends plugin {
  constructor() {
    super({
      name: 'QQ_MC',
      dsc: 'QQ群与Minecraft服务器的消息互通',
      event: 'message',
      priority: 5000,
      rule: [{
        reg: '',
        fnc: 'main',
        log: false
      }]
    })

  }

  async main(e) {
    if (e.raw_message.startsWith('/')) {
      let shell = e.raw_message.replace(/^\//, '')
      RconConnect.sendCommand(e, shell)
    } else {
      const config = await Config.getConfig()
      if (config.group_list.includes(e.group_id)) {
        let shell = ''
        if (config.mc_qq_send_group_name) {
          shell = `say [${e.group_name}](${e.sender.nickname}) ${e.raw_message}`
        } else {
          shell = `say (${e.sender.nickname}) ${e.raw_message}`
        }
        RconConnect.sendCommand(e, shell)
      }
    }
    return false
  }
}