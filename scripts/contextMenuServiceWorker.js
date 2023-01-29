// Function to get + decode API key
const getKey = () => {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(["openai-key"], (result) => {
      if (result["openai-key"]) {
        const decodedKey = atob(result["openai-key"]);
        resolve(decodedKey);
      }
    });
  });
};

const sendMessage = (content) => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    console.log(tabs);
    const activeTab = tabs[0].id;

    chrome.tabs.sendMessage(
      activeTab,
      { message: "inject", content },
      (response) => {
        console.log(response);
        if (response.status === "failed") {
          console.log("injection failed.");
        }
      }
    );
  });
};

const generate = async (prompt) => {
  // Get your API key from storage
  const key = await getKey();
  const url = "https://api.openai.com/v1/completions";

  // Call completions endpoint
  const completionResponse = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: "text-davinci-003",
      prompt: prompt,
      max_tokens: 1250,
      temperature: 0.7,
    }),
  });

  // Select the top choice and send back
  const completion = await completionResponse.json();
  return completion.choices.pop();
};

const generateCompletionAction = async (info) => {
  try {
    const { selectionText } = info;
    const basePromptPrefix = `
      Escribe una tabla de contenidos para un artículo basado en el texto de a continuación.

      Titles:
      `;

    // Add this to call GPT-3
    const baseCompletion = await generate(
      `${basePromptPrefix}${selectionText}`
    );

    // Let's see what we get!
    console.log(baseCompletion.text);
    // Add your second prompt here
    const secondPrompt = `
    Tome la tabla de contenido y el título del artículo de a continuación y genera una publicación de blog escrita como si fuera Paul Graham. Haz que se sienta como una historia. No te limites a enumerar los puntos. Profundiza en cada uno. Explicar por qué.
     
     Title: ${selectionText}
     
     Table of Contents: ${baseCompletion.text}
     
     Blog Post:
     `;

    // Call your second prompt
    const secondPromptCompletion = await generate(secondPrompt);
    console.log(secondPromptCompletion.text);
    // Send the output when we're all done
    sendMessage(secondPromptCompletion.text);
  } catch (error) {
    console.log(error);

    // Add this here as well to see if we run into any errors!
    sendMessage(error.toString());
  }
};

// Add this in scripts/contextMenuServiceWorker.js
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "context-run",
    title: "Generar blog post",
    contexts: ["selection"],
  });
});

// Add listener
chrome.contextMenus.onClicked.addListener(generateCompletionAction);
