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

// Mappa per associare ogni struttura al suo assistente OpenAI
const assistantMap = {
  'structure_1': 'asst_gW07pafBTwhLf8C0cnJfjNwD',
  'structure_2': 'asst_KyZD9NioqISV3uu2LWxbGCfh', // Sostituisci con i tuoi assistenti
  'structure_3': 'asst_qY5zR4V391aHvWCeX7wE9jVq',
  'structure_4': 'asst_yissNr1R9WbazLt9QXGeZcHS',
  'structure_5': 'asst_Bd7SNb5RZLIwYOPYgadAtX8q',
  'structure_6': 'asst_ziF6ffQc30wsxZ3N5wJkdqjw',
  'structure_7': 'asst_W7YxmcY8Si60D5vNKwEerMra',
  'structure_8': 'asst_oejogrlvFSVcsW0LVl6n5oEX',
  'structure_9': 'asst_pDLYF7f6JuYnDLkwgGbBXWAC',
  'structure_10': 'asst_anotherAssistantID',
  'structure_11': 'asst_anotherAssistantID',
  'structure_12': 'asst_anotherAssistantID',
  'structure_13': 'asst_anotherAssistantID',
  // Aggiungi altre strutture qui
};

// Funzione per creare un thread e avviare una run
const createThreadAndRun = async (message, structure_id) => {
  try {
    // Verifica se la struttura esiste nella mappa
    if (!assistantMap[structure_id]) {
      throw new Error('Struttura non valida.');
    }

    const assistantId = assistantMap[structure_id];

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

    // Avvia la run nel thread creato con l'assistente corretto
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: assistantId,
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
  const { message, structure_id } = req.body; // Ottiene il messaggio e l'ID della struttura dal widget

  try {
    // Invia la richiesta al modello tramite la funzione
    const response = await createThreadAndRun(message, structure_id);
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
