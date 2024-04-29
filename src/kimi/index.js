import axios from 'axios'
import dotenv from 'dotenv'
import fs from 'fs'
import { insertData, queryRecentTexts} from '../wechaty/database.js';

const file_content = await fs.promises.readFile('/root/wechat-bot/pdfs/qa1a.txt', 'utf8');
console.log('File content:', file_content.length);

const env = dotenv.config().parsed // 环境参数

const domain = 'https://api.moonshot.cn'
const server = {
  chat: `${domain}/v1/chat/completions`,
  models: `${domain}/v1/models`,
  files: `${domain}/v1/files`,
  token: `${domain}/v1/tokenizers/estimate-token-count`,
  // 这块还可以实现上传文件让 kimi 读取并交互等操作
  // 具体参考文档： https://platform.moonshot.cn/docs/api-reference#api-%E8%AF%B4%E6%98%8E
  // 由于我近期非常忙碌，这块欢迎感兴趣的同学提 PR ，我会很快合并
}

const configuration = {
  // 参数详情请参考 https://platform.moonshot.cn/docs/api-reference#%E5%AD%97%E6%AE%B5%E8%AF%B4%E6%98%8E
  /* 
    Model ID, 可以通过 List Models 获取
    目前可选 moonshot-v1-8k | moonshot-v1-32k | moonshot-v1-128k
  */
  model: "moonshot-v1-8k",
  /* 
    使用什么采样温度，介于 0 和 1 之间。较高的值（如 0.7）将使输出更加随机，而较低的值（如 0.2）将使其更加集中和确定性。
    如果设置，值域须为 [0, 1] 我们推荐 0.3，以达到较合适的效果。
  */
  temperature: 0.3,
  /* 
    聊天完成时生成的最大 token 数。如果到生成了最大 token 数个结果仍然没有结束，finish reason 会是 "length", 否则会是 "stop"
    这个值建议按需给个合理的值，如果不给的话，我们会给一个不错的整数比如 1024。特别要注意的是，这个 max_tokens 是指您期待我们返回的 token 长度，而不是输入 + 输出的总长度。
    比如对一个 moonshot-v1-8k 模型，它的最大输入 + 输出总长度是 8192，当输入 messages 总长度为 4096 的时候，您最多只能设置为 4096，
    否则我们服务会返回不合法的输入参数（ invalid_request_error ），并拒绝回答。如果您希望获得“输入的精确 token 数”，可以使用下面的“计算 Token” API 使用我们的计算器获得计数。
  */
  max_tokens: 1000,
  /* 
    是否流式返回, 默认 false, 可选 true
  */
  stream: false,
}

export async function getKimiReply(prompt, userId) {
  // let t1 = new Date();
  // let history = await queryRecentTexts(userId, t1);
  // console.log(JSON.stringify(history));

  // await insertData(t1.toISOString(), userId, prompt, 'user');

  // let t2 = new Date();
  // await insertData(t2.toISOString(), userId, choices[0].message.content, 'assistant');
  let history = "";
  let reply = await getKimiInitReply(history, prompt);
  let judge = await getKimiJudgeReply(history, prompt, reply);
  const keyword = "改进意见：";
  const index = judge.indexOf(keyword);
  let reply1 = "不变";
  if (index !== -1) {
    judge = judge.slice(index + keyword.length);
    reply1 = await getKimiUpdateReply(history, prompt, reply, judge);
  }
  return reply + "（修改后：" + reply1 + "）";
}

async function getKimiInitReply(history, prompt) {
  try {
    let sys = [
      // {
      //   role: "system",
      //   content: file_content,
      // },
      {
        role: "system",
        // 刚刚上传的qa1s.txt，是圣严法师的佛学著作，包含他对佛学的主要观点。
        content: `你是圣严法师机器人，你需要扮演圣严法师和用户聊天，以通过你的图灵测试。
圣严法师和用户聊天时，往往会结合自己的佛学观点，来安抚用户的情绪，开导用户，为用户答疑解惑。
圣严法师说话言简意赅，往往采用口语化的表达，绝不会使用书面格式。
这意味着，你的回复必须让用户无法分辨你是圣严法师还是机器人。`
      }
    ]

    let msgs = sys; //.concat(history);
    msgs.push({role: "user", content: prompt});
    console.log(msgs)

    const res = await axios.post(server.chat, Object.assign(configuration, {
      /* 
        包含迄今为止对话的消息列表。
        要保持对话的上下文，需要将之前的对话历史并入到该数组
        这是一个结构体的列表，每个元素类似如下：{"role": "user", "content": "你好"} role 只支持 system,user,assistant 其一，content 不得为空
      */
      messages: msgs,
    }), {
      timeout: 60000,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.KIMI_API_KEY}`
      },
      // pass a http proxy agent
      // proxy: {
      //   host: 'localhost',
      //   port: 7890,
      // }
    })

    const { choices } = res.data;
    return choices[0].message.content;
  } catch (error) {
    console.log("Kimi 错误对应详情可参考官网： https://platform.moonshot.cn/docs/api-reference#%E9%94%99%E8%AF%AF%E8%AF%B4%E6%98%8E");
    console.log("常见的 401 一般意味着你鉴权失败, 请检查你的 API_KEY 是否正确。");
    console.log("常见的 429 一般意味着你被限制了请求频次，请求频率过高，或 kimi 服务器过载，可以适当调整请求频率，或者等待一段时间再试。");
    console.error(error.code);
    console.error(error.message);
  }
}


async function getKimiJudgeReply(history, prompt, reply) {
  try {
    let sys = [
      // {
      //   role: "system",
      //   content: file_content,
      // },
      {
        role: "system",
        content: `你是一个智能助理，你需要帮助用户判断，和他聊天的圣严法师，是圣严法师本人还是机器人。`
      }
    ]

    let flatten_history = "（\n我：" + prompt + "\n圣严法师：" + reply + '\n）\n';

    let xprompt = flatten_history + `以上括号里是我和圣严法师的对话记录。
圣严法师和用户聊天时，往往会结合自己的佛学观点，来安抚用户的情绪，开导用户，为用户答疑解惑。
圣严法师说话言简意赅，往往采用口语化的表达，绝不会使用书面格式。
请帮我判断圣严法师的最后一条回复是他本人所写，还是机器人编写的？
如果你判断是圣严法师本人所写，请直接返回“是本人”三个字，且不要包含其他任何内容。
如果你判断是机器人编写的，请返回“是机器人编写的”，并返回一条你认为最重要的改进意见。`

    let msgs = sys;
    msgs.push({role: "user", content: xprompt});

    console.log(msgs)


    const res = await axios.post(server.chat, Object.assign(configuration, {
      /* 
        包含迄今为止对话的消息列表。
        要保持对话的上下文，需要将之前的对话历史并入到该数组
        这是一个结构体的列表，每个元素类似如下：{"role": "user", "content": "你好"} role 只支持 system,user,assistant 其一，content 不得为空
      */
      messages: msgs,
    }), {
      timeout: 60000,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.KIMI_API_KEY}`
      },
      // pass a http proxy agent
      // proxy: {
      //   host: 'localhost',
      //   port: 7890,
      // }
    })

    const { choices } = res.data;
    return choices[0].message.content;
  } catch (error) {
    console.log("Kimi 错误对应详情可参考官网： https://platform.moonshot.cn/docs/api-reference#%E9%94%99%E8%AF%AF%E8%AF%B4%E6%98%8E");
    console.log("常见的 401 一般意味着你鉴权失败, 请检查你的 API_KEY 是否正确。");
    console.log("常见的 429 一般意味着你被限制了请求频次，请求频率过高，或 kimi 服务器过载，可以适当调整请求频率，或者等待一段时间再试。");
    console.error(error.code);
    console.error(error.message);
  }
}

async function getKimiUpdateReply(history, prompt, reply, judge) {
  try {
    let sys = [
      // {
      //   role: "system",
      //   content: file_content,
      // },
      {
        role: "system",
        content: `你是一个智能助理。`
      }
    ]

    let flatten_history = "（\n用户：" + prompt + "\n圣严法师：" + reply + '\n）\n';

    let xprompt = flatten_history + `以上括号里是用户和圣严法师的对话记录。
请按照以下中括号内的改进意见，修改圣严法师的最后一条回复，并直接返回修改过的回复。
改进意见是：【` + judge + '】'

    let msgs = sys;
    msgs.push({role: "user", content: xprompt});

    console.log(msgs)


    const res = await axios.post(server.chat, Object.assign(configuration, {
      /* 
        包含迄今为止对话的消息列表。
        要保持对话的上下文，需要将之前的对话历史并入到该数组
        这是一个结构体的列表，每个元素类似如下：{"role": "user", "content": "你好"} role 只支持 system,user,assistant 其一，content 不得为空
      */
      messages: msgs,
    }), {
      timeout: 60000,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.KIMI_API_KEY}`
      },
      // pass a http proxy agent
      // proxy: {
      //   host: 'localhost',
      //   port: 7890,
      // }
    })

    const { choices } = res.data;
    return choices[0].message.content;
  } catch (error) {
    console.log("Kimi 错误对应详情可参考官网： https://platform.moonshot.cn/docs/api-reference#%E9%94%99%E8%AF%AF%E8%AF%B4%E6%98%8E");
    console.log("常见的 401 一般意味着你鉴权失败, 请检查你的 API_KEY 是否正确。");
    console.log("常见的 429 一般意味着你被限制了请求频次，请求频率过高，或 kimi 服务器过载，可以适当调整请求频率，或者等待一段时间再试。");
    console.error(error.code);
    console.error(error.message);
  }
}