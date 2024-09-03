import { getSettings, updateSettings, setResultMessage } from '../utils.js'

const apiKeyInput = document.getElementById("api-key");
const saveButton = document.getElementById("save-changes");
const resultDiv = document.getElementById("result");
const promptRepo = document.getElementById("prompts");

// Runtime
const { cohereApiKey, promptRepository } = await getSettings();
apiKeyInput.value = cohereApiKey || '';
promptRepo.value = promptRepository || '';

saveButton.addEventListener("click", async () => {
    try {
        const apiKey = apiKeyInput.value;
        if (`${apiKey}`.trim().length <= 2) {
            throw Error("Invalid API Key")
        }

        const promptRepoUrl = promptRepo.value || undefined;
        await updateSettings({ cohereApiKey: apiKey, promptRepository: promptRepoUrl });
        
        const { prompts } = await getSettings();
        
        let msg = 'Settings saved!'
        if (promptRepoUrl) {
            msg += ` ${prompts.length} prompts loaded.`
        }

        setResultMessage({ 
            div: resultDiv, message: msg, timeout: 5000 
        })
    } catch (e) {
        setResultMessage({ 
            div: resultDiv, message: `Unable to save settings: ${e.message || e}` 
        })
    }
})