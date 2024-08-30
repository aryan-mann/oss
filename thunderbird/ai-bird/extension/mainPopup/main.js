import { getSettings, updateSettings, setResultMessage } from '../utils.js'

const apiKeyInput = document.getElementById("api-key");
const saveButton = document.getElementById("save-changes");
const resultDiv = document.getElementById("result");

/**
 * @typedef {object} Settings
 * @property {string|undefined} cohereApiKey
 */

// Runtime
const { cohereApiKey } = await getSettings();
if (cohereApiKey) {
    apiKeyInput.value = cohereApiKey;
}

saveButton.addEventListener("click", async () => {
    try {
        const apiKey = apiKeyInput.value;
        await updateSettings({ cohereApiKey: apiKey });
        setResultMessage({ 
            div: resultDiv, message: 'Settings saved!', timeout: 2000 
        })
    } catch (e) {
        setResultMessage({ 
            div: resultDiv, message: `Unable to save settings: ${e}` 
        })
    }
})