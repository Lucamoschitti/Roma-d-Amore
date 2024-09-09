const express = require('express');
const OpenAI = require('openai');
const dotenv = require('dotenv');
const cors = require('cors'); // Importa CORS

// Carica le variabili d'ambiente
dotenv.config();

const app = express();

// Abilita CORS per permettere le richieste cross-origin
app.use(cors());

// Middleware per leggere il body delle richieste POST
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Usa la chiave API dal file .env
});

// Funzione per creare un thread e avviare una run
const createThreadAndRun = async (message) => {
  try {
    // Crea il thread con un messaggio iniziale
    const thread = await openai.beta.threads.create({
      messages: [
        {
          role: "user", // Il ruolo deve essere 'user'
          content: message // Il contenuto è una stringa diretta
        },
      ],
    });

    console.log('Thread creato con ID:', thread.id);

    // Avvia la run nel thread creato
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: 'asst_gW07pafBTwhLf8C0cnJfjNwD',
    });

    console.log('Run avviata con ID:', run.id);

    // Loop per controllare lo stato della run e ottenere la risposta
    let status = run.status;
    let runResult = null;

    while (status !== 'completed' && status !== 'failed') {
      // Attendi 10 secondi prima di controllare lo stato
      await new Promise((resolve) => setTimeout(resolve, 10000));

      // Ottieni lo stato attuale della run
      const updatedRun = await openai.beta.threads.runs.retrieve(thread.id, run.id);
      status = updatedRun.status;

      console.log(`Stato attuale della run: ${status}`);

      if (status === 'completed') {
        runResult = updatedRun;
        console.log('Risultato della run:', runResult);
      } else if (status === 'failed') {
        throw new Error('La run è fallita.');
      }
    }

    if (runResult) {
      // Elenca tutti i messaggi nel thread per ottenere la risposta dell'assistente
      const messages = await openai.beta.threads.messages.list(thread.id);

      console.log('Tutti i messaggi nel thread:', JSON.stringify(messages.data, null, 2));

      // Controlla se ci sono messaggi nel thread
      if (!messages || !messages.data || messages.data.length === 0) {
        throw new Error('Nessun messaggio trovato nel thread.');
      }

      // Trova il messaggio dell'assistente
      const assistantMessage = messages.data.find((msg) => msg.role === 'assistant');
      if (!assistantMessage) {
        throw new Error('Nessun messaggio dell\'assistente trovato.');
      }

      // Ritorna il contenuto del messaggio dell'assistente
      return assistantMessage.content;
    } else {
      throw new Error('La run non ha prodotto una risposta valida.');
    }

  } catch (error) {
    console.error('Errore durante la creazione del thread e della run:', error.message);
    throw error;
  }
};

// Endpoint per gestire la richiesta del cliente
app.post('/ask-ai', async (req, res) => {
  const userMessage = req.body.message; // Ottiene il messaggio dal widget (frontend)

  try {
    // Invia la richiesta al modello tramite la funzione
    const response = await createThreadAndRun(userMessage);
    res.json({ response });
  } catch (error) {
    console.error('Errore durante la gestione della richiesta /ask-ai:', error.message);
    res.status(500).json({ error: 'Errore durante la chiamata all\'API di OpenAI' });
  }
});

// Imposta il server sulla porta 3000
app.listen(3000, () => {
  console.log('Server in ascolto sulla porta 3000');
});
