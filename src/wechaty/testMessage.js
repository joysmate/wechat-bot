import { getGptReply } from '../openai/index.js'
import { getKimiReply } from '../kimi/index.js'
import dotenv from 'dotenv'
import inquirer from 'inquirer'
const env = dotenv.config().parsed // 环境参数

// 控制启动
async function handleRequest(type) {
  console.log('type: ', type)
  switch (type) {
    case 'ChatGPT':
      if (env.OPENAI_API_KEY) {
        const message = await getGptReply("hello")
        console.log('🌸🌸🌸 / reply: ', message)
        return
      }
      console.log('❌ 请先配置.env文件中的 OPENAI_API_KEY')
      break
    case 'Kimi':
      if (env.KIMI_API_KEY) {
        const message = await getKimiReply("大乘和小乘的区别")
        console.log('🌸🌸🌸 / reply: ', message)
        return
      }
      console.log('❌ 请先配置.env文件中的 KIMI_API_KEY')
      break
    default:
      console.log('🚀服务类型错误')
  }
}

const serveList = [
  { name: 'ChatGPT', value: 'ChatGPT' },
  { name: 'Kimi', value: 'Kimi' },
  // ... 欢迎大家接入更多的服务
]
const questions = [
  {
    type: 'list',
    name: 'serviceType', //存储当前问题回答的变量key，
    message: '请先选择服务类型',
    choices: serveList,
  },
]
function init() {
  inquirer
    .prompt(questions)
    .then((res) => {
      handleRequest(res.serviceType)
    })
    .catch((error) => {
      console.log('🚀error:', error)
    })
}
init()