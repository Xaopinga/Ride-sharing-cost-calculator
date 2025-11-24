export async function onRequest(context) {
  const { request, env } = context;
  // 原来的 fetch 逻辑，但用 env 替代
  const url = new URL(request.url);

  // CORS 预检
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(),
    });
  }

  // 直接是 POST /ocr，不需要再判断 pathname
  try {
    const formData = await request.formData();
    const file = formData.get('image');
    if (!file) {
      return json({ error: 'no file' }, 400);
    }

    const arrayBuffer = await file.arrayBuffer();
    const base64 = arrayBufferToBase64(arrayBuffer);
    const accessToken = await getBaiduAccessToken(env);

    const ocrUrl =
      'https://aip.baidubce.com/rest/2.0/ocr/v1/general_basic?access_token=' +
      encodeURIComponent(accessToken);

    const body =
      'image=' +
      encodeURIComponent(base64) +
      '&language_type=CHN_ENG';

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
    const words = (ocrJson.words_result || []).map((w) => w.words);
    const text = words.join('\n');

    return json({ text });
  } catch (e) {
    console.error('OCR worker error:', e);
    return json({ error: 'internal_error' }, 500);
  }
}



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