// Route Handler ฝั่ง Server: อ่าน token จาก env ที่ไม่ใช่ NEXT_PUBLIC_
// จึงไม่ถูกส่งไปกับ bundle ฝั่ง browser
export async function POST(request) {
  const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

  // ถ้ายังไม่ตั้งค่า env ให้ตอบกลับแบบไม่ error รุนแรง เพื่อไม่ให้กระทบระบบขาย
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    return Response.json(
      { ok: false, error: 'ยังไม่ได้ตั้งค่า TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID' },
      { status: 200 }
    );
  }

  try {
    const body = await request.json();
    const messages = Array.isArray(body.messages) ? body.messages : [];

    // ยิงทีละข้อความเข้า Telegram
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
    // ไม่ throw ออกไป เพื่อไม่ให้ฝั่งหน้าเว็บพัง
    return Response.json({ ok: false, error: error.message }, { status: 200 });
  }
}
