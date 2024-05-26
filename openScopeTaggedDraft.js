// open scope tagged draft 1.0
// created by @FlohGro@social.lol

let tags = Tag.query("")

const scopeIdentifier = "::"
const nestedIdentifier = "/"

let scopedTags = tags.filter(t => { return t.includes(scopeIdentifier) });
let nestedTags = tags.filter(t => { return t.includes(nestedIdentifier) });

let uniqueScopedTags = [];
let uniqueNestedTags = [];

scopedTags.map(t => {
    let scope = t.split(scopeIdentifier)[0];

    // add it to uniqueScopedTags if its not contained there yet
    if (!uniqueScopedTags.includes(scope)) {
        uniqueScopedTags.push(scope)
    }
})


nestedTags.map(t => {
    let nest = t.split(nestedIdentifier)[0];

    // add it to uniqueScopedTags if its not contained there yet
    if (!uniqueNestedTags.includes(nest)) {
        uniqueNestedTags.push(nest)
    }
})

let flaggedDrafts = Draft.query("", "flagged", [], [], "accessed", true, false);

// prompt to select tag scope / nest

let p = new Prompt();
p.title = "select tag scope";

uniqueScopedTags.map(t => { p.addButton(t + scopeIdentifier) });
uniqueNestedTags.map(t => { p.addButton(t + nestedIdentifier) });

if (p.show()) {
    let selectedTagScope = p.buttonPressed;
    let possibleTags = tags.filter(t => { return t.startsWith(selectedTagScope) })
    let selectedTag = selectTag(possibleTags)
    if (selectedTag) {
        let foundDrafts = Draft.query("", "all", [selectedTag], [], "modified", true, true);
        let selectedDraft = selectDraft(foundDrafts)
        if (selectedDraft) {
            editor.load(selectedDraft)
        } else {
            app.displayInfoMessage("no draft selected")
        }
    } else {
        app.displayInfoMessage("no tag selected")
    }
} else {
    app.displayInfoMessage("no scope selected")
}

function selectTag(tagsList) {
    if (tagsList.length == 1) {
        return tagsList[0]
    }
    let p = new Prompt()
    p.title = "select tag"
    tagsList.map(t => { p.addButton(t) })
    if (p.show()) {
        return p.buttonPressed
    } else {
        return undefined
    }
}

function selectDraft(draftsList) {
    if (draftsList.length == 1) {
        return draftsList[0]
    }

    let p = new Prompt()
    p.title = "select draft"
    draftsList.map(d => { p.addButton((d.isFlagged ? "🚩 " : "") + d.displayTitle, d) })
    if (p.show()) {
        return p.buttonPressed
    } else {
        return undefined
    }
}
