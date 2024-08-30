import '@logseq/libs'
import ICAL from 'ical'  

const icalAddress = 'https://calendar.google.com/calendar/ical/aryan.21.mann%40gmail.com/private-42211fff1d4a11a423266ed752ce747e/basic.ics';

async function getCalendar(url: string): Promise<Array<ICAL.CalendarComponent>> {
  const rawCal = await (await fetch(url, { method: 'GET' })).text();
  const uidToCal = await ICAL.parseICS(rawCal);
  const cal = Object.values(uidToCal).sort((a,b) => {
    if (a.start && b.start) {
      return Number(a.start) - Number(b.start);
    }
    if (a.end && b.end) {
      return Number(a.end) - Number(b.end);
    }
    if (a.dtstamp && b.dtstamp) {
      return Number(a.dtstamp) - Number(b.dtstamp);
    }

    return 0;
  })

  return cal;
}

function setupPlugin() {
  logseq.Editor.registerSlashCommand("Reload Calendar", async ({ uuid }) => {
    logseq.UI.showMsg('Refreshing calendar, might take a few seconds..')
    const calendar = await getCalendar(icalAddress);
    for (let i=0; i < 5; i++) {
      logseq.Editor.insertAtEditingCursor(`\`\`\`\n${JSON.stringify(calendar[i], null, 4)}\n\`\`\`\n\n`)
    },
  })
}

logseq.ready(setupPlugin)
  .catch(console.error)