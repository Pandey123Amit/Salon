require('dotenv').config();

const GRAPH_API = 'https://graph.facebook.com/v21.0';

(async () => {
  const response = await fetch(`${GRAPH_API}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: '918986605695',
      type: 'template',
      template: { name: 'hello_world', language: { code: 'en_US' } },
    }),
  });
  const data = await response.json();
  if (!response.ok) {
    console.error('Error:', data.error?.message);
  } else {
    console.log('Sent! WAMID:', data.messages?.[0]?.id);
  }
})();
