import '@logseq/libs'
import ICAL from 'ical'  

const icalAddress = 'https://calendar.google.com/calendar/ical/aryan.21.mann%40gmail.com/private-42211fff1d4a11a423266ed752ce747e/basic.ics';
const iCalReader = new RegExp("([^:]+):([^\n]+)", "gm");

async function getCalendar(url: string): Promise<Array<ICAL.CalendarComponent>> {
  const rawCal = await (await fetch(icalAddress, { method: 'GET' })).text();
  const uidToCal = await ICAL.parseICS(rawCal);
  const cal = Object.values(uidToCal).sort((a,b) => {
    if (a.start && b.start) {
      return a.start - b.start;
    }
    if (a.end && b.end) {
      return a.end - b.end;
    }
    if (a.dtstamp && b.dtstamp) {
      return a.dtstamp - b.dtstamp;
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
    }
    
    
    // Parse
    // let events = []
    // for (let v of rawCal.split('BEGIN:VEVENT')) {
    //   v = v.trim()
    //   if (!(v.endsWith("END:VEVENT") || v.endsWith("END:VCALENDAR"))) {
    //     continue
    //   }

    //   v = v.split("END:VEVENT")[0].trim();
    //   function processValue(key: string, value: string): [string, any] {
    //     key = key.replace(/[\s+]\b/, '').replace(/\b[\s+]/, '')
    //     value = value.replace(/[\s+]\b/, '').replace(/\b[\s+]/, '')
        
        

    //     return [key, value]
    //   }

    //   const event: { [key: string]: any } = Object.fromEntries([...v.matchAll(iCalReader)].map(x => processValue(x[1], x[2])));
    //   /*
    //     DTSTART:20240529T060000Z
    //     DTEND:20240529T061500Z
    //     DTSTAMP:20240504T172239Z
    //     UID:e9im6r31d5miqobjedkn6t1dcdnmspj2elj3kthh79gn4ub1don34c9edlgmsri0ctmm2qb
    //     c5phmur9qcgo6echmd9mj6drie1nm8s3370p30rre6hi6gqbce9fj4c1i6go3achpago3ac1g60
    //     o5k@google.com
    //     CLASS:PUBLIC
    //     CREATED:20240429T094802Z
    //     DESCRIPTION:<i>This event was created by <a href="https://app.reclaim.ai/landing/about?name=Aryan+Mann&utm_source=calendar&utm_campaign=calendar-referral&utm_medium=buffer-event&utm_term=8ZRob">Reclaim</a>.</i><p>Aryan needs a break to decompress. Please ping them before scheduling a meeting over this event.</p>
    //     LAST-MODIFIED:20240429T094803Z
    //     SEQUENCE:0
    //     STATUS:CONFIRMED
    //     SUMMARY:😎 Decompress
    //     TRANSP:OPAQUE
    //   */
    //   event["DTSTART"] = new Date(event["DTSTART"]);
    //   event["DTEND"] = new Date(event["DTEND"]);

    //   events.push(event);
    // }

    // console.log(events)
    // events.sort((a, b) => a["DTSTART"] - b["DTSTART"])
    // console.log(events)

    // for (let i = 0; i < 3; i++) {
    //   logseq.Editor.insertAtEditingCursor(JSON.stringify(events[i], null, 4) + '\n')
    // }
  })
}

logseq.ready(setupPlugin)
  .catch(console.error)