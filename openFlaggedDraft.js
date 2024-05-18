// open flagged draft 1.0
// created by @FlohGro@social.lol

let flaggedDrafts = Draft.query("", "flagged", [], [], "accessed", true, false);

let draftToOpen = undefined;

switch (flaggedDrafts.length) {
    case 0: app.displayInfoMessage("no flagged drafts found"); break;
    case 1: draftToOpen = flaggedDrafts[0]; break;
    default: draftToOpen = selectDraftToOpen(flaggedDrafts)
}

if (draftToOpen != undefined) {
    editor.load(draftToOpen)
}

function selectDraftToOpen(drafts) {
    let p = new Prompt()
    p.title = "select draft"
    for (let d of drafts) {
        p.addButton(d.displayTitle, d)
    }
    if (p.show()) {
        return p.buttonPressed
    } else {
        return undefined
    }
}