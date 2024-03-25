// quick link opener v1.0
// created by FlohGro

const defaultConfigurationDraftTitle = "QuickLink Opener Configuration Draft"
const userConfiguredDraftTitle = draft.processTemplate("[[configuration_draft_title]]")

const configurationDraftTitle = (userConfiguredDraftTitle != "" && userConfiguredDraftTitle != "[[configuration_draft_title]]") ? userConfiguredDraftTitle : defaultConfigurationDraftTitle

let foundDraft = Draft.queryByTitle(configurationDraftTitle)

if (foundDraft.length == 0) {
    // the configuration draft is currently not existing, we need to create it for the user so that he/she can configure it later
    createDraftAndCancel()
} else if (foundDraft.length > 1) {
    // there are several drafts with the specified title. The user needs to cleanup the mess to run this again.
    console.log("more than one configuration drafts with title: " + configurationDraftTitle + " exist")
    alert("more than one configuration drafts with title: " + configurationDraftTitle + " exist\n\nplease clean up the mess (merge these two Drafts and run the action again")
    context.cancel()
} else {
    // the configuration draft draft exists, which is great. We can work with that

    let sectionToUse = findSectionToUse(foundDraft[0]);

    if (sectionToUse) {
        if (sectionToUse == "open configuration draft") {
            editor.load(foundDraft[0])
        } else {
            let urlToOpen = getLinkToOpen(sectionToUse)
            if (urlToOpen) {
                app.openURL(urlToOpen, true)
            }
        }
    }
}

function createDraftAndCancel() {
    let newDraft = new Draft()
    newDraft.content = `# ${configurationDraftTitle}

## Example Link Category 1

- [Drafts](https://getdrafts.com)

## Example Link Category 2

- [FlohGro's Blog](https://flohgro.com)

`
    newDraft.update()

    console.log("created configuration draft with title: " + configurationDraftTitle + " since it was not existing")

    alert("created configuration draft with title: " + configurationDraftTitle + " since it was not existing\n\nplease configure it according to the actiondescription and run the action again")
    editor.load(newDraft)
    context.cancel()
}


function splitMarkdownSections(text) {
    const sections = new Map()
    const splits = text.split('##');
    let currentSection = '';
    splits.shift()

    for (let split of splits) {
        let lines = split.split("\n")
        let firstLine = lines.shift()
        sections.set(firstLine, lines.join("\n"))
    }
    return sections;
}

function findSectionToUse(theDraft) {

    let map = splitMarkdownSections(theDraft.content)

    if (map.size == 0) {
        return theDraft.content
    } else if (map.size == 1) {
        return map.get(map.keys()[0])
    } else {
        let p = new Prompt()
        p.title = "select category"

        p.addButton("open configuration draft")
        Array.from(map.keys()).forEach((key) => {
            p.addButton(key, map.get(key))
        })

        if (p.show()) {
            return p.buttonPressed
        } else {
            showCancelledMessage()
            return undefined
        }
    }

}

function getLinkToOpen(text) {

    let p = new Prompt()

    p.title = "open which link?"

    //const regex = /\[(.+)\]\(craftdocs:\/\/open\?blockId=([^&]+)\&spaceId=([^\)]+)\)/
    const regex = /\[([^\[]+)\]\(([^\[^\n]+)\)/g
    let foundUrlCounter = 0;

    var matches = [...text.matchAll(regex)]
    if (matches) {
        for (match of matches) {
            foundUrlCounter++;
            let description = match[1];
            let url = match[2];
            // add "https://" if the url is no callback url and just witten as domain.
            if (!url.match(/:\/\//)) {
                url = 'https://' + url;
            }
            // add the found url to the prompt
            p.addButton(description, url);
            if (foundUrlCounter == 1) {
                firstURL = url;
            }
        }
    }

    if (foundUrlCounter == 0) {
        app.displayWarningMessage("no urls found")
        return undefined;
    } else if (p.show()) {
        return p.buttonPressed
    } else {
        showCancelledMessage()
        return undefined;
    }

}

function showCancelledMessage() {
    app.displayInfoMessage("cancelled")
}
