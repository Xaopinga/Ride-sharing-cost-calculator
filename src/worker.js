export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // CORS 预检
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(),
      });
    }

    if (url.pathname === '/ocr' && request.method === 'POST') {
      try {
        const formData = await request.formData();
        const file = formData.get('image');

        if (!file) {
          return json({ error: 'no file' }, 400);
        }

        // File -> ArrayBuffer -> base64
        const arrayBuffer = await file.arrayBuffer();
        const base64 = arrayBufferToBase64(arrayBuffer);

        // 1. 获取 / 刷新 百度 access_token
        const accessToken = await getBaiduAccessToken(env);

        // 2. 调用百度通用文字识别
        const ocrUrl =
          'https://aip.baidubce.com/rest/2.0/ocr/v1/general_basic?access_token=' +
          encodeURIComponent(accessToken);

        const body =
          'image=' +
          encodeURIComponent(base64) +
          '&language_type=CHN_ENG'; // 中英混合

        const ocrRes = await fetch(ocrUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body,
        });

        if (!ocrRes.ok) {
          const text = await ocrRes.text();
          console.error('Baidu OCR error:', ocrRes.status, text);
          return json({ error: 'baidu_ocr_error', detail: text }, 502);
        }

        const ocrJson = await ocrRes.json();

        // words_result 是一个数组，每个元素有 words 字段
        const words = (ocrJson.words_result || []).map((w) => w.words);
        const text = words.join('\n');

        return json({ text });
      } catch (e) {
        console.error('OCR worker error:', e);
        return json({ error: 'internal_error' }, 500);
      }
    }

    // 其他路径按需处理或返回 404
    return new Response('Not Found', { status: 404 });
  },
};

// 工具函数

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...corsHeaders(),
    },
  });
}

function arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  // btoa 处理的是 ASCII 字符串，我们先转成字符串再编码
  return btoa(binary);
}

async function getBaiduAccessToken(env) {
  const ak = env.BAIDU_OCR_AK;
  const sk = env.BAIDU_OCR_SK;

  const url =
    'https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=' +
    encodeURIComponent(ak) +
    '&client_secret=' +
    encodeURIComponent(sk);

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });

  if (!res.ok) {
    const text = await res.text();
    console.error('Get token error:', res.status, text);
    throw new Error('failed_to_get_token');
  }

  const json = await res.json();
  // json.access_token 有效期通常为 30 天
  return json.access_token;
}