require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
app.use(bodyParser.json());

const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const ADMIN_PHONE_NUMBER = process.env.ADMIN_PHONE_NUMBER;

app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('✅ Webhook verificado');
    res.status(200).send(challenge);
  } else {
    console.log('❌ Error en la verificación del webhook');
    res.sendStatus(403);
  }
});

app.post('/webhook', async (req, res) => {
  try {
    const entry = req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    if (entry) {
      const from = entry.from;
      const msg = entry.text?.body;

      if (msg) {
        console.log(`Mensaje recibido de ${from}: ${msg}`);

        // Lógica de menú
        let respuesta = '';
        let notificarAdmin = '';

        if (msg.toLowerCase() === 'hola') {
          respuesta =
            '¡Hola! ¿Qué deseas hacer hoy?\n\n1. Consultar productos\n2. Hablar con un asesor\n3. Ver promociones';
        } else if (['1', '2', '3'].includes(msg)) {
          const opciones = {
            1: 'Consultar productos',
            2: 'Hablar con un asesor',
            3: 'Ver promociones',
          };
          respuesta = `Gracias. Elegiste: *${opciones[msg]}*. Un asesor te contactará.`;
          notificarAdmin = `Usuario ${from} eligió: ${opciones[msg]}`;
        } else {
          respuesta = 'No entendí eso. Por favor escribe *hola* para comenzar.';
        }

        // Responder al usuario
        await axios.post(
          `https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages`,
          {
            messaging_product: 'whatsapp',
            to: from,
            text: { body: respuesta },
          },
          {
            headers: {
              Authorization: `Bearer ${WHATSAPP_TOKEN}`,
              'Content-Type': 'application/json',
            },
          }
        );

        // Notificar al admin si corresponde
        if (notificarAdmin) {
          await axios.post(
            `https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages`,
            {
              messaging_product: 'whatsapp',
              to: ADMIN_PHONE_NUMBER,
              text: { body: notificarAdmin },
            },
            {
              headers: {
                Authorization: `Bearer ${WHATSAPP_TOKEN}`,
                'Content-Type': 'application/json',
              },
            }
          );
        }
      }
    }
    res.sendStatus(200);
  } catch (error) {
    console.error('Error procesando el mensaje:', error.message);
    res.sendStatus(500);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});
