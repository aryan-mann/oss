import style from './style.css?inline'
import '@logseq/libs'
import { CohereClient } from 'cohere-ai'
import { TodoistApi, Task } from "@doist/todoist-api-typescript"
import { IHookEvent, UISlotIdentity } from '@logseq/libs/dist/LSPlugin'

type PluginSettings = {
  api_key?: string;
}

let settings: PluginSettings = {};
let todoist: TodoistApi | undefined = undefined;
let co: CohereClient = new CohereClient({ token: '0dMSPtpsYwnFtZ02Biz6ZycX4FdCdH5ta57OdlyV' })

function refreshSettings() {
  const rawSettings = logseq.settings;
  settings.api_key = (rawSettings?.['api_key'] || settings.api_key || '').toString();
  todoist = new TodoistApi(settings.api_key)
}

type MacroArgs = IHookEvent & UISlotIdentity & {
  payload: {
      [key: string]: any;
      arguments: string[];
      uuid: string;
  };
}
async function handleTodoistMacro(args: MacroArgs) {
  const { slot, payload } = args;
  const uiKey = `am-todoist-${slot}`;
  const filter = payload.arguments?.[1] || '';
  const title = payload.arguments?.[2] || 'Todoist';

  let tasks: Array<Task> = []
  try {
    let args: { [key: string]: string } = {}
    if (filter !== '') {
      args['filter'] = filter;
    }

    tasks = await todoist!.getTasks(args);
    tasks.sort((t1, t2) => (t1.due?.date || '') > (t2.due?.date || '') ? 1 : 0)
  }
  catch (e) {
    console.error(e);
    logseq.provideUI({
      key: uiKey,
      slot: slot,
      reset: true,
      template: `<span>Error loading tasks - ${e}</span>`
    })
    return;
  }

  const today = new Date();
  const dateOptions: Intl.DateTimeFormatOptions = { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' };

  let content = `
<div data-testid='am-todoist'>
  <h2>${title}</h2>
  <div class='am-under-title'>
    <span>Last updated: ${today.toLocaleDateString('en-US', dateOptions)}</span>
    <button data-on-click="refreshTasks">Refresh</button>
  </div>
`.trim()

  for (const task of tasks) {
    let dueLine = task.due?.date ? `<div class='am-extras-due'>${new Date(task.due?.date).toLocaleDateString('en-US', dateOptions)}</div>` : '';
    content += `
<div class='am-todoist-item' data-priority='${task.priority}'>
<div class='am-task-content'>${task.content}</div>
<div class='am-task-description'>${task.description || ''}</div>
<div class='am-task-extras'>
  ${dueLine}
  <div class='am-extras-label'>
    ${task.labels.map((v) => `<span>${v}</span>`)}
  </div>
</div>
</div>
`.trim()
  }
  content += '</div>'

  logseq.provideModel({
    openUrl(url: string) {
      window.open(url, '_blank')
    },
    refreshTasks(r, e) {
      console.log('clicked it!!')
      console.log(r);
      console.log(e)
    }
  })

  logseq.provideUI({
    key: uiKey,
    slot: slot,
    reset: true,
    template: `<div id="am-todoist-container-${slot}">${content}</div>`
  })
}

function setupPlugin() {
  // Load settings
  refreshSettings();
  logseq.useSettingsSchema([
    {
      title: "Todoist API Key",
      description: "API Token from [Todoist](https://app.todoist.com/app/settings/integrations/developer)",
      default: "",
      key: "api_key",
      type: "string",
    }
  ])
  logseq.onSettingsChanged(refreshSettings);

  // Style
  logseq.provideStyle(style);

  // Renderer
  logseq.App.onMacroRendererSlotted(async (args) => {
    const { slot, payload } = args;
    const macroName = payload.arguments[0].toLocaleLowerCase();
    console.log(`loading macro: ${macroName}`)
    if (macroName === "todoist") { 
      await handleTodoistMacro(args);
    }
  })
}

logseq.ready(setupPlugin)
  .catch(console.error)