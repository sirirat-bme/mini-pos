// Route Handler ฝั่ง Server — token ไม่ถูกส่งไปกับ bundle ฝั่ง browser
export async function POST(request) {
  const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

  // ยังไม่ตั้ง env ก็ตอบ 200 กลับไป ไม่ให้ฝั่งหน้าเว็บพัง
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    return Response.json(
      { ok: false, error: 'ยังไม่ได้ตั้งค่า TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID' },
      { status: 200 }
    );
  }

  try {
    const body = await request.json();
    const messages = Array.isArray(body.messages) ? body.messages : [];

    for (const messageText of messages) {
      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: messageText,
          parse_mode: 'HTML',
        }),
      });
    }

    return Response.json({ ok: true, sent: messages.length });
  } catch (error) {
    return Response.json({ ok: false, error: error.message }, { status: 200 });
  }
}
