import { getSettings, updateSettings, setResultMessage, getUserComposedMessage, cohereChat, setSelectOptions } from '../utils.js'

//// SETUP ////
// Get reference to HTML elements
const userText = document.getElementById("userMessage");
const resultDiv = document.getElementById("result");
const rewriteButton = document.getElementById("rewriteButton");
const promptSelect = document.getElementById("prompt-type");

// Check valid API key
const { cohereApiKey, prompts } = await getSettings();
if (cohereApiKey === undefined) {
    setResultMessage({ div: resultDiv, message: "Your API Key is empty. Add in the main settings panel." })
    rewriteButton.setAttribute('disabled', 'true')
    throw new Error('Empty API Key.');
}

setSelectOptions({ 
    div: promptSelect,
    options: prompts.map(p => ({ name: p.name, value: p.name }))
})

const { text, html } = await getUserComposedMessage();
userText.value = text;

rewriteButton.addEventListener("click", async function() {
    const { text, html, context, sender, receipient } = await getUserComposedMessage();

    const promptType = promptSelect.value;
    const filteredPrompts = prompts.filter((p) => p.name === promptType)
    if (filteredPrompts.length === 0) {
        setResultMessage({ div: resultDiv, message: `Error: Type '${promptType}' not found.`})
        return;
    }
    const selectedPrompt = filteredPrompts[0];

    try {
        setResultMessage({ div: resultDiv, message: "Rewriting..", addLoading: true })

        const response = await cohereChat({
            apiKey: cohereApiKey,
            preamble: `
You are an AI that assists employees write professional emails. You will be given some (0) message context, (1) an email context and (2) an email draft that may be in HTML form. 

## TASK
${selectedPrompt.task}

Only respond with the corrected version and nothing else. If the email contains HTML, be sure to respond while keeping the same (or similar) HTML structure.

## (0) MESSAGE CONTEXT
Sender: ${sender}
Receipient: ${receipient}

## (1) EMAIL CONTEXT
${context}

The ## (2) EMAIL DRAFT will now be provided by the user. Respond in HTML.
            `.trim(),
            message: `## (2) EMAIL DRAFT\n${userText.value}`.trim()
        })

        if ('message' in response) {
            setResultMessage({
                div: resultDiv, message: `<p>An error occurred: <b>${response['message']}</b></p>`, asHtml: true
            })
        } else {
            setResultMessage({ 
                div: resultDiv, message: response['text'], asHtml: true, addCopy: true
            })
        }
    } catch (e) {
        setResultMessage({
            div: resultDiv, message: `An error occurred: ${e}`,
            timeout: 5000
        })
    }
})