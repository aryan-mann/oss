import { getSettings, updateSettings, setResultMessage, getFocusedMessage, cohereChat } from '../utils.js'

//// SETUP ////
// Get reference to HTML elements
const resultDiv = document.getElementById("result");

// Check valid API key
const { cohereApiKey } = await getSettings();
if (cohereApiKey === undefined) {
    setResultMessage({ div: resultDiv, message: "Your API Key is empty. Add in the main settings panel." })
    rewriteButton.setAttribute('disabled', 'true')
    throw new Error('Empty API Key.');
}

const { body, attachments, sender, ccd } = await getFocusedMessage();

try {
    setResultMessage({ div: resultDiv, message: "Summarizing..", addLoading: true })
    let ccdString = ccd.length === 0 ? 'None': ccd.join(', ');
    let attachmentString = attachments.length === 0 ? 'None': attachments.join(', ');

    const response = await cohereChat({
        apiKey: cohereApiKey,
        preamble: `
You are an AI that assists employees with their emails. You will be given an email (or multiple emails chained together). The emails may be in HTML form etc.

## TASK
Your task is to concisely summarize the contents of the email and suggest next steps for the email reader (if any).

Only respond with the corrected version and nothing else. If the email contains HTML, be sure to respond while keeping the same (or similar) HTML structure.

## MESSAGE CONTEXT
Sender: ${sender}
CC: ${ccdString}
Attachments: ${attachmentString}

You will now be provided the body of the message. Respond only in HTML in the following format:
<div>
    <h3>Summary</h3>
    <div><!-- Your summary as HTML --></div>
    <h3>Next Steps</h3>
    <div><!-- Synthesized next steps (if any) --></div>
</div>
        `.trim(),
        message: body.trim()
    })

    if ('message' in response) {
        setResultMessage({
            div: resultDiv, message: `<p>An error occurred: <b>${response['message']}</b></p>`, asHtml: true
        })
    } else {
        setResultMessage({ 
            div: resultDiv, message: response['text'], asHtml: true, addCopy: false
        })
    }
} catch (e) {
    setResultMessage({
        div: resultDiv, message: `An error occurred: ${e}`,
        timeout: 5000
    })
}