import style from './style.css?inline'
import '@logseq/libs'
// import { CohereClient } from 'cohere-ai'
import { TodoistApi, Task } from "@doist/todoist-api-typescript"
import { IHookEvent, UISlotIdentity } from '@logseq/libs/dist/LSPlugin'
import { CohereClient } from 'cohere-ai'
import { createRoot, hydrateRoot } from 'react-dom/client'
import Test from './test'
import React from 'react';

type PluginSettings = {
  cohere_api_key?: string;
  todoist_api_key?: string;
}

let settings: PluginSettings = {};
let todoist: TodoistApi | undefined = undefined;
let co: CohereClient | undefined = undefined;

function refreshSettings() {
  const rawSettings = logseq.settings;
  settings.cohere_api_key = (rawSettings?.['cohere_api_key'] || settings.cohere_api_key || '').toString();
  co = settings.cohere_api_key ? new CohereClient({ token: settings.cohere_api_key }) : undefined;

  settings.todoist_api_key = (rawSettings?.['todoist_api_key'] || settings.todoist_api_key || '').toString();
  todoist = settings.todoist_api_key ? new TodoistApi(settings.todoist_api_key) : undefined;
}

async function renderTodoistList(slot: string, opts: {
  title?: string;
  filter?: string;
}) {
  const { title, filter } = opts;
  const uiKey = `am-todoist-${slot}`;

  logseq.provideUI({
    key: uiKey,
    slot: slot,
    reset: true,
    template: `<div id="${slot}"></div>`
  })

  const pp = document.getElementById('app');
  console.log(pp);
  console.log(slot);
  const root = createRoot(pp!);
  root.render(<Test />)

  return;
  if (`${settings.todoist_api_key}`.trim().length === 0 || todoist === undefined) {
    logseq.provideUI({
      key: uiKey,
      slot: slot,
      reset: true,
      template: `<span class="am-todoist-error">No Todoist API Key provided. Add it in the settings!</span>`
    })
    return;
  }

  let tasks: Array<Task> = []
  try {
    let args: { [key: string]: string } = {}
    if (filter) {
      args['filter'] = filter;
    }

    tasks = await todoist.getTasks(args);
    tasks.sort((t1, t2) => (t1.due?.date || '') > (t2.due?.date || '') ? 1 : 0)
  }
  catch (e) {
    console.error(e);
    logseq.provideUI({
      key: uiKey,
      slot: slot,
      reset: true,
      template: `<span class="am-todoist-error">Error loading tasks: ${e}</span>`
    })
    return;
  }

  const today = new Date();
  const dateOptions: Intl.DateTimeFormatOptions = { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' };

  logseq.provideModel({
    refreshTasks() {
      
    }
  })

  let content = `
<div data-testid='am-todoist'>
  <h2>${title}</h2>
  <div class='am-under-title'>
    <span>Last updated: ${today.toLocaleDateString('en-US', dateOptions)}</span>
    <button data-on-click="refreshTasks">Refresh</button>
  </div>
`.trim()

  if (tasks.length === 0) {
    content += `<span>No tasks found!</span>`.trim()
  }
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
    }
  })

  logseq.provideUI({
    key: uiKey,
    slot: slot,
    reset: true,
    template: `<div id="am-todoist-container-${slot}">${content}</div>`
  })
}

type MacroArgs = IHookEvent & UISlotIdentity & {
  payload: {
    [key: string]: any;
    arguments: string[];
    uuid: string;
  };
}
async function handleGeneralTodoistMacro(args: MacroArgs) {
  const { slot, payload } = args;
  const filter = payload.arguments?.[1] || undefined;
  const title = payload.arguments?.[2] || 'Todoist';

  await renderTodoistList(slot, {
    title: title,
    filter: filter
  })
}

async function handleJournalTodoistMacro({ slot, payload }: MacroArgs) {
  function render(content: string) {
    logseq.provideUI({
      key: 'am-todoist-journal',
      slot: slot,
      template: content
    })
  }

  const currentBlock = await logseq.Editor.getCurrentBlock();
  if (currentBlock === null) {
    render(`<span>Unable to get information on the current block.</span>`)
    return;
  }
  const currentPage = await logseq.Editor.getPage(currentBlock!.page.id);
  if (currentPage === null) {
    render(`<span>Unable to get information on the current page.</span>`)
    return;
  }

  if (currentPage['journal?'] === false) {
    render(`<span>You can only use this macro in a Journal page.</span>`)
    return;
  }

  const journalDay = `${currentPage.journalDay}`
  const year = journalDay.substring(0, 4);
  const month = journalDay.substring(4, 6);
  const day = journalDay.substring(6);
  // Filter -> due: 2025-01-24
  render(`<span>Year (${year}/${month}/${day}) - ${JSON.stringify(currentPage, null, 4)}</span>`)

  const journalDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));

  await renderTodoistList(slot, {
    title: `Tasks for ${journalDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: '2-digit',
      weekday: 'long'
    })}`,
    filter: `due: ${year}-${month}-${day}`
  })
}

function setupPlugin() {
  // Load settings
  refreshSettings();
  logseq.useSettingsSchema([
    {
      title: "API Keys",
      key: "api_key_heading",
      default: "",
      description: "",
      type: "heading"
    },
    {
      title: "Cohere API Key",
      description: "API Token from [Cohere](https://dashboard.cohere.com/api-keys)",
      default: "",
      key: "cohere_api_key",
      type: "string"
    },
    {
      title: "Todoist API Key",
      description: "API Token from [Todoist](https://app.todoist.com/app/settings/integrations/developer)",
      default: "",
      key: "todoist_api_key",
      type: "string",
    },
  ])
  logseq.onSettingsChanged(refreshSettings);

  // Style
  logseq.provideStyle(style);

  // Renderer Macros
  logseq.App.onMacroRendererSlotted(async (args) => {
    refreshSettings();
    console.log(args);

    const macroName = args.payload.arguments[0].toLocaleLowerCase();
    console.log(`loading macro: ${macroName}`)
    if (macroName === "todoist") {
      await handleGeneralTodoistMacro(args);
    } else if (macroName === "todoist-journal") {
      await handleJournalTodoistMacro(args);
    }
  })
}

logseq.ready(setupPlugin)
  .catch(console.error)