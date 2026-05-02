import crypto from "node:crypto";

const CHANNEL_ACCESS_TOKEN = (process.env.LINE_CHANNEL_ACCESS_TOKEN ?? "").replace(/\s/g, "");
const CHANNEL_SECRET = (process.env.LINE_CHANNEL_SECRET ?? "").replace(/\s/g, "");

// ── カード定義 ──────────────────────────────────────────────
const CARDS = {
  nl: {
    name: "三井住友カード（NL）",
    desc: "コンビニ・マックで最大7%還元。1枚目はこれで間違いなし。",
    url: "https://www.mon-map.com/cards/smbc-nl.html",
  },
  jcb: {
    name: "JCB CARD W",
    desc: "Amazon・スタバ最大3%還元。39歳以下限定の高還元カード。",
    url: "https://www.mon-map.com/cards/jcb-card-w.html",
  },
  epos: {
    name: "エポスカード",
    desc: "全国10,000店舗の優待割引＋マルイ年4回セール。外出・旅行好きに。",
    url: "https://www.mon-map.com/cards/epos-card.html",
  },
  dcard: {
    name: "dカード GOLD U",
    desc: "ドコモ料金が毎月10%還元。29歳以下はゴールドが年会費無料。",
    url: "https://www.mon-map.com/cards/dcard-gold-u.html",
  },
  sezon: {
    name: "三井ショッピングカードセゾン",
    desc: "三井アウトレット・ショッピングパークで最大10%還元。永久不滅ポイント。",
    url: "https://www.mon-map.com/cards/mitsui-sezon.html",
  },
};

// ── 質問フロー ───────────────────────────────────────────────
const FLOW = {
  q1: {
    text: "クレジットカードを持っていますか？",
    choices: [
      { label: "持っていない", data: "q2a|no" },
      { label: "持っている", data: "q2b|has" },
    ],
  },
  "q2a|no": {
    text: "普段よく使うのはどちらですか？",
    choices: [
      { label: "コンビニ・マック", result: "nl" },
      { label: "Amazon・ネット通販", result: "jcb" },
    ],
  },
  "q2b|has": {
    text: "現在の状況を教えてください。",
    choices: [
      { label: "学生", data: "q3s|has|student" },
      { label: "社会人", data: "q3w|has|worker" },
    ],
  },
  "q3s|has|student": {
    text: "ドコモ（ahamo含む）を使っていますか？",
    choices: [
      { label: "はい（ドコモ）", result: "dcard" },
      { label: "いいえ", data: "q4s|has|student|nodocomo" },
    ],
  },
  "q4s|has|student|nodocomo": {
    text: "ショッピングや外食・映画・レジャーでお得な優待割引を使いたいですか？",
    choices: [
      { label: "はい、外出が多い", result: "epos" },
      { label: "どちらかというとネット派", data: "q5s|has|student|nodocomo|noout" },
    ],
  },
  "q5s|has|student|nodocomo|noout": {
    text: "普段の支払いで一番多いのはどれですか？",
    choices: [
      { label: "コンビニ・マック", result: "nl" },
      { label: "Amazon・ネット通販", result: "jcb" },
    ],
  },
  "q3w|has|worker": {
    text: "週末の外出や旅行は多いですか？",
    choices: [
      { label: "はい、よく出かける", data: "q4wo|has|worker|out" },
      { label: "どちらかというとインドア", data: "q4wi|has|worker|in" },
    ],
  },
  "q4wo|has|worker|out": {
    text: "マルイや全国の飲食店・映画・レジャー施設での優待割引に興味がありますか？",
    choices: [
      { label: "はい、使いたい", result: "epos" },
      { label: "ポイント還元の方が大事", data: "q5wo|has|worker|out|noout" },
    ],
  },
  "q5wo|has|worker|out|noout": {
    text: "一番よく使うショッピング先はどこですか？",
    choices: [
      { label: "コンビニ・マック", result: "nl" },
      { label: "Amazon・ネット通販", result: "jcb" },
      { label: "ららぽーと・三井アウトレット", result: "sezon" },
    ],
  },
  "q4wi|has|worker|in": {
    text: "ドコモ（ahamo含む）を使っていますか？",
    choices: [
      { label: "はい（ドコモ）", result: "dcard" },
      { label: "いいえ", data: "q5wi|has|worker|in|nodocomo" },
    ],
  },
  "q5wi|has|worker|in|nodocomo": {
    text: "一番よく使うショッピング先はどこですか？",
    choices: [
      { label: "コンビニ・マック", result: "nl" },
      { label: "Amazon・ネット通販", result: "jcb" },
      { label: "ららぽーと・三井アウトレット", result: "sezon" },
    ],
  },
};

// ── LINE API ─────────────────────────────────────────────────
async function replyMessage(replyToken, messages) {
  await fetch("https://api.line.me/v2/bot/message/reply", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${CHANNEL_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({ replyToken, messages }),
  });
}

function makeButtonMessage(text, choices) {
  if (choices.length <= 4) {
    return {
      type: "template",
      altText: text,
      template: {
        type: "buttons",
        text: text.length > 160 ? text.slice(0, 157) + "…" : text,
        actions: choices.map((c) => ({
          type: "postback",
          label: c.label,
          data: c.result ? `result|${c.result}` : c.data,
          displayText: c.label,
        })),
      },
    };
  }
  return {
    type: "text",
    text,
    quickReply: {
      items: choices.map((c) => ({
        type: "action",
        action: {
          type: "postback",
          label: c.label,
          data: c.result ? `result|${c.result}` : c.data,
          displayText: c.label,
        },
      })),
    },
  };
}

function makeResultMessage(cardKey) {
  const card = CARDS[cardKey];
  return {
    type: "flex",
    altText: `診断結果：${card.name}`,
    contents: {
      type: "bubble",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#0B1D4D",
        contents: [
          {
            type: "text",
            text: "✦ 診断結果",
            color: "#FFFFFF",
            size: "sm",
            weight: "bold",
          },
        ],
      },
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        contents: [
          {
            type: "text",
            text: card.name,
            size: "xl",
            weight: "bold",
            color: "#0B1D4D",
            wrap: true,
          },
          {
            type: "text",
            text: card.desc,
            size: "sm",
            color: "#6B778C",
            wrap: true,
          },
        ],
      },
      footer: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "button",
            style: "primary",
            color: "#0AC07A",
            action: {
              type: "uri",
              label: "詳しく見る →",
              uri: card.url,
            },
          },
          {
            type: "button",
            style: "secondary",
            margin: "sm",
            action: {
              type: "postback",
              label: "もう一度診断する",
              data: "q1",
              displayText: "もう一度診断する",
            },
          },
        ],
      },
    },
  };
}

// ── 署名検証 ─────────────────────────────────────────────────
function verifySignature(rawBody, signature) {
  const hash = crypto
    .createHmac("SHA256", CHANNEL_SECRET)
    .update(rawBody)
    .digest("base64");
  return hash === signature;
}

// ── イベントハンドラ ──────────────────────────────────────────
async function handleEvent(event) {
  if (event.type === "follow" || event.type === "join") {
    await replyMessage(event.replyToken, [
      makeButtonMessage(FLOW.q1.text, FLOW.q1.choices),
    ]);
    return;
  }

  if (event.type === "message" && event.message.type === "text") {
    const text = event.message.text.trim();
    if (["診断", "スタート", "start", "START"].includes(text)) {
      await replyMessage(event.replyToken, [
        makeButtonMessage(FLOW.q1.text, FLOW.q1.choices),
      ]);
      return;
    }
    await replyMessage(event.replyToken, [
      {
        type: "text",
        text: "「診断」と送信するか、下のボタンから診断をスタートしてください。",
        quickReply: {
          items: [
            {
              type: "action",
              action: {
                type: "postback",
                label: "診断スタート",
                data: "q1",
                displayText: "診断スタート",
              },
            },
          ],
        },
      },
    ]);
    return;
  }

  if (event.type === "postback") {
    const data = event.postback.data;

    if (data.startsWith("result|")) {
      const cardKey = data.split("|")[1];
      await replyMessage(event.replyToken, [makeResultMessage(cardKey)]);
      return;
    }

    const step = FLOW[data];
    if (step) {
      await replyMessage(event.replyToken, [
        makeButtonMessage(step.text, step.choices),
      ]);
      return;
    }

    await replyMessage(event.replyToken, [
      makeButtonMessage(FLOW.q1.text, FLOW.q1.choices),
    ]);
  }
}

// ── 生のリクエストボディを取得 ────────────────────────────────
function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

// ── Vercel Node.js Function ───────────────────────────────────
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).send("Method Not Allowed");
    return;
  }

  const rawBody = await getRawBody(req);
  const signature = req.headers["x-line-signature"] ?? "";

  if (!verifySignature(rawBody, signature)) {
    res.status(401).send("Unauthorized");
    return;
  }

  const body = JSON.parse(rawBody);
  await Promise.all((body.events ?? []).map(handleEvent));

  res.status(200).send("OK");
}
