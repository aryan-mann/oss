/**
 * @typedef {Object} Settings
 * @property {string|undefined} cohereApiKey
 * @property {string|undefined} promptRepository
 * @property {Array<{name: string, task: string }>} prompts
 */

/** @type {Settings} */
const defaultSettings = {
    cohereApiKey: undefined,
    promptRepository: undefined,
    prompts: [
        {
            name: "Minimal",
            task: "Your task is to correct spelling, grammatical, etc. mistakes and increase the quality of prose in (2) the email draft - without changing the semantic meaning."
        },
        {
            name: "Elaborate",
            task: "Your task is to correct grammatical mistakes and heavily improve the quality of prose in (2) the email draft. Do not change the semantic meaning. Additionally, rewrite the message slightly to ensure it feels professionally templated."
        },
        {
            name: "Professional",
            task: "Your task is to rewrite the entire email draft without changing the semantic meaning. While rewriting make it sound more professional and polite."
        },
    ]
}

/**
 * Fetches the settings from the local storage.
 *
 * @returns {Promise<Settings>} The settings.
 */
export async function getSettings() {
    const localStorage = await messenger.storage.local.get()
    if (localStorage.AIBirdSettings === undefined || localStorage.AIBirdSettings == {}) {
        return {
            ...defaultSettings
        }
    } else {
        return {
            ...defaultSettings,
            ...localStorage.AIBirdSettings
        };
    }
}

/**
 * Fetches the Cohere API key from the local storage.
 *
 * @returns {Promise<string>} The Cohere API key.
 */
export async function getCohereApiKey() {
    const { cohereApiKey } = await getSettings();
    if (cohereApiKey === undefined)
        throw new Error("API Key is empty.")
    return cohereApiKey;
}

/**
 * Updates the settings in the local storage.
 *
 * @param {Partial<Settings>} update - The update to apply to the settings.
 */
export async function updateSettings(update) {
    const current = await messenger.storage.local.get('AIBirdSettings');

    if ('promptRepository' in update && update.promptRepository) {
        const resp = await fetch(update.promptRepository, { method: 'GET' });
        const prompts = await resp.json();
        update.prompts = prompts;
    }

    await messenger.storage.local.set({ 'AIBirdSettings': { ...current, ...update } })
}

/**
 * @typedef {Object} ResultRenderOptions
 * @property {HTMLElement} div - The HTMLElement to render content in.
 * @property {string} message - The message to set.
 * @property {number|undefined} timeout - The number in milliseconds to clear the result after.
 * @property {boolean|undefined} asHtml - Whether to render as text or HTML.
 * @property {boolean|undefined} addCopy - Add the ability to copy the HTML content
 * @property {boolean|undefined} addLoading - Add a loading symbol
 */

/**
 * Sets the message parameter to a string in the JSDoc comments.
 * @param {ResultRenderOptions} args - The arguments to this function
 */
export function setResultMessage(args) {
    const { div, message, timeout, asHtml } = args;

    if (args.addLoading === true) {
        div.classList.add('loading');
    } else {
        if (div.classList.contains('loading')) {
            div.classList.remove('loading');
        }
    }

    if (asHtml === true) {
        div.replaceChildren([]);

        if (args.addCopy === true) {
            const copyWrapper = document.createElement('div');
            copyWrapper.classList.add('copyable');

            copyWrapper.addEventListener("click", () => {
                const copyText = copyWrapper.innerText;
                navigator.clipboard.writeText(copyText);
            })

            copyWrapper.innerHTML = `<div class="llm">${message}</div>`;
            div.replaceChildren(copyWrapper)
        } else {
            div.innerHTML = `<div class="llm">${message}</div>`;
        }
    } else {
        const resultPre = document.createElement('pre');
        resultPre.textContent = message;
        div.replaceChildren(resultPre)
    }

    if (timeout !== undefined) {
        setTimeout(() => {
            div.replaceChildren()
        }, timeout)
    }
}

/**
 * @returns {string}
 */
function extractBody(parts) {
    let body = '';

    for (let part of parts) {
        if (part.parts) {
            // Recursively extract if the part contains nested parts
            body += extractBody(part.parts);
        } else if (part.body) {
            // Add the part body to the result
            body += part.body;
        }
    }

    return body;
}

function extractAttachmentNames(parts) {
    let attachmentNames = [];

    for (let part of parts) {
        if (part.parts) {
            // Recursively extract if the part contains nested parts
            attachmentNames = attachmentNames.concat(extractAttachmentNames(part.parts));
        } else if (part.filename) {
            // If the part has a filename, it's an attachment
            attachmentNames.push(part.filename);
        }
    }

    return attachmentNames;
}

/**
 * @typedef {Object} Message
 * @property {string} body - The body of the message.
 * @property {string[]} attachments - The attachments of the message.
 * @property {string} sender - The sender of the message.
 * @property {string[]} ccd - The CC'd recipients of the message.
 */

/**
 * Gets the focused message from the active tab.
 *
 * @returns {Promise<Message>} An object containing the focused message.
 */
export async function getFocusedMessage() {
    let tabs = await messenger.tabs.query({ active: true, currentWindow: true });
    let message = await messenger.messageDisplay.getDisplayedMessage(tabs[0].id);
    let fullMessage = await messenger.messages.getFull(message.id);

    let body = extractBody(fullMessage.parts);
    let attachments = extractAttachmentNames(fullMessage.parts);
    let sender = fullMessage.headers.from[0]; // 'from' is an array, usually with one entry
    let ccd = fullMessage.headers.cc || []; // 'cc' might be undefined if there's no CC

    return {
        body: body,
        attachments: attachments,
        sender: sender,
        ccd: ccd
    };
}

/**
 * Gets the user's message from the active tab.
 *
 * @returns {Promise<{text: string, html: string, context: string, sender: string, receipient: string``}>} An object containing the user's message.
 */
export async function getUserComposedMessage() {
    let tabs = await messenger.tabs.query({ active: true, currentWindow: true });
    let message = await messenger.compose.getComposeDetails(tabs[0].id);

    // from the string message which contains html content, parse it as html
    const parser = new DOMParser();
    const msgDoc = parser.parseFromString(message.body, 'text/html');
    const body = msgDoc.getElementsByTagName("body")[0];
    const fullBodyString = body.textContent;

    // remove reply citations
    try {
        const citedMessages = body.querySelectorAll("blockquote[type='cite']")
        for (const citedMessage of citedMessages) {
            body.removeChild(citedMessage);
        }
        // remove prefix before citations
        const citedPrefixes = body.querySelectorAll("div.moz-cite-prefix");
        for (const citedPrefix of citedPrefixes) {
            body.removeChild(citedPrefix);
        }
    } catch {}

    return {
        html: body.innerHTML,
        text: body.innerText,
        context: fullBodyString.replace(/\n{2,}/g, '\n'),
        sender: message.from,
        receipient: (message.to.constructor === Array) ? message.to.join(', ') : message.to
    }
}


/**
 * @typedef {Object} CohereChatParams
 * @property {string} apiKey - An API Key from Cohere
 * @property {string} message - The user message
 * @property {string|undefined} preamble - The preamble
 * @property {string|undefined} model - The model to use for generation
 */

/**
 * Sends a request to the Cohere API to correct the user's email draft.
 *
 * @param {CohereChatParams} params - The parameters for the request.
 * @returns {Promise<Object>} The response from the Cohere API.
 */
export async function cohereChat(params) {
    const args = {
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${params.apiKey}`
        },
        method: 'POST',
        body: JSON.stringify({
            preamble: params.preamble,
            message: params.message,
            model: params.model || 'command-r-plus-08-2024',
            stream: false
        })
    }

    const responseStream = await fetch(`https://api.cohere.com/v1/chat`, args);
    return await responseStream.json();
}

/**
 * @param {Object} args
 * @param {HTMLSelectElement} args.div
 * @param {Array<{ name: string | undefined, value: string }>} args.options
 */
export function setSelectOptions(args) {
    const { div, options } = args;
    div.replaceChildren();

    options.forEach((o, i) => {
        div.add(new Option(o.name || o.value, o.value, i === 0))
    })
}