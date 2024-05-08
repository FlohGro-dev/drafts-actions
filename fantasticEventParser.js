// fantastic event parser v1.3 created by @FlohGro, adapted from "Fantastically Good Event Parser" by @pdavisonreiber

// changelog v1.3
// - allow specification of a default calendar (in the Drafts action)

// changelog v1.2
// - more robust calendar lookup
// - alerts for event are now displayed in confirm event prompt
// - calendars are now sorted in the confirm event prompt

const locale = language;

const locationRegex = /(?: at | in )(.+)/;
const calendarRegex = createCalendarRegex()
const alertRegex = /alert (\d+)(?: *)(minutes|minute|mins|min|m|hours|hour|hrs|hr|h)/;
const durationRegex = /(\d+)(?: *)(minutes|minute|mins|min|m|hours|hour|hrs|hr|h)/;

let createdEvents = 0

const allCalendars = Calendar.getAllCalendars();
const calendarsInaccessible = allCalendars == undefined ? true : false


function makeEvent(inputString) {

	var workingString = inputString;
	console.log("event string input: \"" + inputString + "\"")

	// if (chrono.en.parse(inputString).length == 0) {
	// 	workingString = workingString + " today";
	// }

	switch (locale) {
		case "US":
			var result = chrono.en.parse(workingString, new Date, { forwardDate: true })[0];
			break;
		case "GB":
			var result = chrono.en_GB.parse(workingString, new Date, { forwardDate: true })[0];
			break;
		case "DE":
			var result = chrono.de.parse(workingString, new Date, { forwardDate: true })[0];
			break;
		case "FR":
			var result = chrono.fr.parse(workingString, new Date, { forwardDate: true })[0];
			break;
	}
	console.log("parsing result for locale: \"" + locale + "\":\n" + JSON.stringify(result));

	if (result) {
		workingString = workingString.replace(result.text, "");
	}

	const calendarStringExists = calendarRegex.test(workingString);
	const calendarString = calendarStringExists ? calendarRegex.exec(workingString)[1].trim() : "";
	var matchingCalendars = [];

	for (let someCalendar of allCalendars) {
		let findCal = new RegExp("^" + calendarString, "i");
		if (findCal.test(someCalendar.title)) {
			matchingCalendars.push(someCalendar)
		}
	}

	workingString = workingString.replace("/" + calendarString, "");

	const alertStringExists = alertRegex.test(workingString);
	const alertStrings = alertStringExists ? alertRegex.exec(workingString) : "";
	const alertQuantity = alertStringExists ? alertStrings[1] : null;
	const alertUnits = alertStringExists ? alertStrings[2] : null;
	switch (alertUnits) {
		case "m":
		case "min":
		case "mins":
		case "minute":
		case "minutes":
			var alertMultiplier = 1;
			break;
		case "h":
		case "hr":
		case "hrs":
		case "hour":
		case "hours":
			var alertMultiplier = 60;
			break;
		default:
			var alertMultiplier = 1;
			break;
	}

	if (alertStringExists) {
		var alert = alertQuantity * alertMultiplier;
		workingString = workingString.replace(alertStrings[0], "");
	}

	const durationStringExists = durationRegex.test(workingString);
	const durationStrings = durationStringExists ? durationRegex.exec(workingString) : "";

	const durationQuantity = durationStringExists ? durationStrings[1] : null;
	const durationUnits = durationStringExists ? durationStrings[2] : null;
	switch (durationUnits) {
		case "m":
		case "min":
		case "mins":
		case "minute":
		case "minutes":
			var durationMultiplier = 1;
			break;
		case "h":
		case "hr":
		case "hrs":
		case "hour":
		case "hours":
			var durationMultiplier = 60;
			break;
		default:
			var durationMultiplier = 1;
			break;
	}

	if (durationStringExists) {
		var duration = durationQuantity * durationMultiplier;
		workingString = workingString.replace(durationStrings[0], "")
	}

	const locationStringExists = locationRegex.test(workingString);
	const locationStrings = locationStringExists ? locationRegex.exec(workingString) : "";

	console.log("locationStrings: " + locationStrings)

	workingString = workingString.replace(locationStrings[0], "");

	const titleString = workingString.trim();

	console.log("title string: " + titleString)

	if (!titleString) { return }

	let useFallbackCalendar = false;
	if (calendarStringExists) {
		if (Calendar.find(calendarString)) {
			var calendar = Calendar.find(calendarString)
		} else if (matchingCalendars.length > 0) {
			var calendar = matchingCalendars[0]
		} else {
			useFallbackCalendar = true;
		}
	} else {
		useFallbackCalendar = true;
	}

	if (useFallbackCalendar) {
		var calendar = Calendar.find(defaultCalendar)
		if (!calendar) {
			var calendar = Calendar.default()
		}
	}

	let notificationString = undefined
	var event = calendar.createEvent();
	// remove all alarms at the beginning to prevent a default system alert.
	event.removeAlarms()
	event.title = titleString;
	if (result) {
		// start date can only be added if the parser returned something
		event.startDate = result.start.date();

		if (durationStringExists) {
			event.endDate = new Date(event.startDate.getTime() + duration * 60 * 1000)
		}
		else if (result.hasOwnProperty("end")) {
			event.endDate = result.end.date()
		} else {
			event.endDate = new Date(event.startDate.getTime() + 60 * 60 * 1000)
		}

		if (!result.start.knownValues.hasOwnProperty("hour")) {
			event.isAllDay = true
		}
	} else {
		console.log("setting default start and end date for the event since parser didn't recognize anything")
		notificationString = "⚠️ no date was recognized in the input string"
		let startDate = new Date();
		startDate.setHours(startDate.getHours() + 1, 0, 0, 0)
		let endDate = new Date();
		endDate.setHours(endDate.getHours() + 2, 0, 0, 0)
		event.startDate = startDate
		event.endDate = endDate
	}

	if (alertStringExists) {
		let alarm = Alarm.alarmWithOffset(-60 * alert);
		event.addAlarm(alarm)
	}

	if (defaultAlarmOffset >= 0) {
		let alarm = Alarm.alarmWithOffset(-60 * defaultAlarmOffset);
		event.addAlarm(alarm)
	}

	if (locationStringExists) {
		event.location = locationStrings[1]
	}

	let confirmResult = confirmEvent(event, inputString, notificationString, allCalendars)
	let confirmed = confirmResult[0]
	event = confirmResult[1]
	if (confirmed) {
		if (!event.update()) {
			console.log("Error: " + event.lastError);
			return false
		} else {
			createdEvents = createdEvents + 1
			return true
		}
	}

}

function getSelectionOrDraft() {

	var selection = editor.getSelectedText()

	if (!selection || selection.length == 0) {
		return draft.content
	} else {
		return selection
	}

}

function confirmEvent(event, inputString, notificationString, allCalendars) {
	let p = new Prompt()
	p.title = "confirm event"

	let alarmStrs = []
	for (let alarm of event.alarms) {
		alarmStrs.push("- " + prettyPrintSecondsDuration(alarm.relativeOffset) + " before")
		if (alarm.absoluteDate) {
			let date = new Date(alarm.absoluteDate)
			alarmStrs.push("- at " + date.toISOString().split("T")[0] + " " + date.toISOString().split("T")[1].split(".")[0])
		}
	}

	let alarmMessage = ""
	if (alarmStrs.length > 0) {
		alarmMessage = "\n\nAlerts:\n" + alarmStrs.join("\n")
	}

	p.message = "\"" + inputString + "\"" + (notificationString ? "\n\n" + notificationString : "") + alarmMessage



	p.addTextField("title", "title", event.title, {})
	p.addTextField("location", "location", event.location, {})
	p.addDatePicker("startDate", "start date", event.startDate, { "mode": "dateAndTime" })
	p.addDatePicker("endDate", "end date", event.endDate, { "mode": "dateAndTime" })
	p.addSwitch("isAllDay", "all day", event.isAllDay)
	let colValues = allCalendars.map(cal => cal.title)
	colValues.sort()
	let colValue = colValues.indexOf(event.calendar.title)
	p.addPicker("calendarIndex", "calendar", [colValues], [colValue])



	p.addButton("create event")
	if (p.show()) {
		// read out fieldValues
		event.title = p.fieldValues["title"]
		event.location = p.fieldValues["location"]
		event.startDate = p.fieldValues["startDate"]
		event.endDate = p.fieldValues["endDate"]
		event.isAllDay = p.fieldValues["isAllDay"]
		event.calendar = Calendar.find(colValues[p.fieldValues["calendarIndex"]])
		return [true, event]

	} else {
		return [false, undefined]
	}
}

function prettyPrintEvent(event) {
	const year = event.startDate.getFullYear();
	const month = String(event.startDate.getMonth() + 1).padStart(2, '0'); // Months are zero-based
	const day = String(event.startDate.getDate()).padStart(2, '0');
	const hours = String(event.startDate.getHours()).padStart(2, '0');
	const minutes = String(event.startDate.getMinutes()).padStart(2, '0');

	// Construct the desired format
	const customFormat = `${year}-${month}-${day} ${hours}:${minutes}`;

	return event.title + " (" + customFormat + ")" + event.location + "\n" + event.calendar.title
}

function prettyPrintSecondsDuration(seconds) {
	if (seconds < 0) {
		seconds = seconds * (-1)
	}
	// Calculate hours, minutes, and remaining seconds
	let hours = Math.floor(seconds / 3600);
	let minutes = Math.floor((seconds % 3600) / 60);
	let remainingSeconds = seconds % 60;

	// Format the result
	let formattedTime = "";
	if (hours > 0) {
		formattedTime += hours + "h ";
	}
	if (minutes > 0) {
		formattedTime += minutes + "min ";
	}
	if (remainingSeconds > 0) {
		formattedTime += remainingSeconds + "s";
	}

	return formattedTime;
}

function createCalendarRegex() {
	const allCalendars = Calendar.getAllCalendars();
	const regex = /[\^$.*+?()[\]{}|\\]/g;

	let regexTest = ""
	for (let cal of allCalendars) {
		let title = cal.title
		while (title.length > 1) {
			regexTest = regexTest + (regexTest.length == 0 ? "" : "|") + title.replace(regex, "\\$&")
			title = title.slice(0, -1)
		}



		//regexTest = regexTest + (regexTest.length == 0 ? "" : "|") + title.replace(regex, "\\$&")
	}

	regexTest = "\/(" + regexTest + ")"
	let myRegex = new RegExp(regexTest)

	return myRegex
}


function run() {
	if (calendarsInaccessible) {
		let message = "ERROR:\n\nSeems like Drafts can't access your Calendars. Make sure that you allow \"Full Access\" in the settings.\n\n"
		if (device.model == "Mac") {
			message = message + "Open the System Settings App and navigate into \"Privacy & Security > Calendars\". Ensure that Drafts is enabled and \"Full Access\" is enabled in the options."
		} else {
			message = message + "Open the Settings App and and navigate into \"Privacy & Security > Calendars\". Ensure that Drafts is enabled and \"Full Access\" is enabled."
		}
		message = message + "If \"Full Access\" is already enabled please (1) disable the access, (2) quit Drafts, (3) enable the access again, (4) try running the Action again.\n If this doesn't help try rebooting your device. If it's still not working please reach out to @FlohGro in the Drafts Forum."
		alert(message)
		app.displayErrorMessage("calendars inaccessible")
		context.fail("calendars inaccessible")
		return
	}
	const lines = getSelectionOrDraft().split("\n");
	let allSucceeded = true
	for (let line of lines) {
		if (!makeEvent(line)) {
			allSucceeded = false
		}
	}
	if (allSucceeded) {
		app.displaySuccessMessage("created " + createdEvents + " events")
	} else {
		let msg = "created " + createdEvents + "/" + lines.length + " events"
		app.displayWarningMessage(msg)
		context.cancel(msg)
	}
}

run()