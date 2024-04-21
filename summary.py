import os
import time
from openai import OpenAI

from dotenv import load_dotenv
load_dotenv()
 
client = OpenAI(
    api_key=os.getenv("KIMI_API_KEY"),
    base_url="https://api.moonshot.cn/v1",
)

def run(q, a):
    response = client.chat.completions.create(
        model="moonshot-v1-8k",
        messages=[
            {
                "role": "system",
                "content": "你是 Kimi，由 Moonshot AI 提供的人工智能助手，你更擅长中文和英文的对话。你会为用户提供安全，有帮助，准确的回答。同时，你会拒绝一切涉及恐怖主义，种族歧视，黄色暴力等问题的回答。Moonshot AI 为专有名词，不可翻译成其他语言。",
            },
            {"role": "user", "content": f"问题：{q}\n答案：{a}\n\n以上是一个问题和它的答案，请依据问题，对答案进行精简，但是要注意保留答案中的关键细节，不能损失太多信息。你只需要回复精简的答案即可，不需要添加其他任何的修饰语句。"},
        ],
        temperature=0.3,
        stream=True,
    )
    
    collected_messages = []
    for idx, chunk in enumerate(response):
        # print("Chunk received, value: ", chunk)
        chunk_message = chunk.choices[0].delta
        if not chunk_message.content:
            continue
        collected_messages.append(chunk_message)  # save the message
        #print(f"#{idx}: {''.join([m.content for m in collected_messages])}")
    #print(f"Full conversation received: {''.join([m.content for m in collected_messages])}")
    return ''.join([m.content for m in collected_messages])

def scan(fn):
    results = []
    with open(f'pdfs/{fn}.txt') as f:
        lines = f.readlines()
        cur = 1
        x = ""
        q = ""
        a = ""
        for line in lines:
            if line.strip() == "":
                if x == "":
                    continue
                #print('debug:', x[1:x.find('：')], q, a)
                assert int(x[1:x.find('：')]) == cur, f'cur: {cur}, x: {x}, q: {q}, a: {a}'
                if x[0] == 'Q':
                    q = x[x.find('：')+1:]
                else:
                    a = x[x.find('：')+1:]
                    if cur > 46:
                        try:
                            res = run(q, a)
                        except:
                            continue
                        results.append(f'问：{q}')
                        results.append(f'答：{res}\n\n\n')
                        with open('pdfs/qa1s.txt', 'a') as g:
                            g.write('\n'.join(results[-2:]))
                        print('processed:', cur)
                        time.sleep(20)
                    cur += 1
                x = ""
            else:
                x += line

if __name__ == '__main__':
    scan('qa1o')