// create draft from selected event with event details meeting

// Find all calendars
let calendars = Calendar.getAllCalendars();

const calendarsToExclude = draft.processTemplate("[[calendars_to_exclude]]").split("\n").map((val) => val.trim())

const tagsToAdd = draft.processTemplate("[[tags_to_add]]").split("\n").map((val) => val.trim())

// Check if there is a calendar event that is about to start, is currently running or just ended
let events = [];
calendars.forEach(function (calendar) {
    if (calendarsToExclude.includes(calendar.title)) {
        return
    }
    let calendarEvents = calendar.events(Date.today(), Date.today().addDays(1));
    calendarEvents.filter(function (event) {
        return eventIsWithinTimeLimits(event)
    }).forEach(function (event) {
        events.push(event);
    });
});

if (events.length === 0) {
    // If there are no events found, display a message and stop the script
    alert("No events found.");
} else if (events.length === 1) {
    // If there is only one event, create a new draft with its information
    createDraftFromEvent(events[0]);
} else {
    // sort events by start time
    events.sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
    // If there are multiple events, prompt the user to select one
    let p = Prompt.create();
    p.title = "Select an event";
    events.forEach(function (event) {
        p.addButton(event.title, event);
    });
    if (p.show()) {
        let selectedEvent = p.buttonPressed;
        createDraftFromEvent(selectedEvent);
    } else {
        app.displayInfoMessage("aborted by user")
        context.cancel("aborted by user")
    }
}

function createDraftFromEvent(event) {
    // Create a new draft with the event information
    let newDraft = Draft.create();
    // iso date & event title
    newDraft.content = `# ${event.startDate.toISOString().substring(0, 10)} ${event.title}\n\n`;
    // metadata
    newDraft.content += `| info | details     |\n|:-----|:------------|\n`
    // Calendar
    //newDraft.content += `**Calendar:** ${event.calendar.title}\n\n`;
    if (event.isAllDay) {
        newDraft.content += `| when | all day    |\n`;
    }
    else {
        newDraft.content += `| when | ${event.startDate.toLocaleTimeString('en-US', { hour12: false }).substring(0, 5)}-${event.endDate.toLocaleTimeString('en-US', { hour12: false }).substring(0, 5)} |\n`;
    }
    if (event.location) {
        newDraft.content += `| where | ${event.location} |\n`;
    }
    if (event.attendees.length > 0) {
        newDraft.content += `| who  | ${event.attendees.map(attendee => attendee.name).join(', ')} |\n`;
    }

    newDraft.content += `\n## Notes\n\n`
    tagsToAdd.map((tag) => newDraft.addTag(tag));
    newDraft.update();

    // Load the newly created draft
    editor.load(newDraft);
}

function formatDuration(startDate, endDate) {
    let duration = Math.abs(endDate.getTime() - startDate.getTime()) / 1000;
    let hours = Math.floor(duration / 3600);
    let minutes = Math.floor((duration % 3600) / 60);
    let seconds = duration % 60;
    if (hours > 0) {
        return `${hours} hours ${minutes} minutes`;
    } else if (minutes > 0) {
        return `${minutes} minutes ${seconds} seconds`;
    } else {
        return `${seconds} seconds`;
    }
}

function eventIsWithinTimeLimits(event) {
    // 15 minutes (after an event finished, present it anyways)
    const gracePeriod = 15 * 60 * 1000
    const startTime = event.startDate.getTime();
    const endTime = event.endDate.getTime();
    const now = new Date().getTime();
    return (startTime - now) <= 60 * 60 * 1000 && now <= (endTime + gracePeriod);
}
