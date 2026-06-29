export async function sendTelegramMessage(text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token) throw new Error("Missing TELEGRAM_BOT_TOKEN");
  if (!chatId) throw new Error("Missing TELEGRAM_CHAT_ID");

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    }),
  });

  const data = await res.json();

  if (!res.ok || !data.ok) {
    throw new Error(`Telegram error: ${JSON.stringify(data)}`);
  }

  return data;
}
