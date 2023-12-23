// LYT Actions by @FlohGro
// https://flohgro.com
// Mastodon: @flohgro@social.lol
// version 0.1
// this is a collection of functions that are useful to create LYT (linking your thinking) actions within drafts
// just build actions from the functions

const backlinkSectionTitle = "backlinks"


// ready to use functions

function linkDraftFromSelectionAtCurrentCursorPosition() {
    let d = getDraftFromSelection()
    if (!d) {
        // no draft was selected → terminate
        app.displayInfoMessage("no draft selected")
        return 0
    }

    if(d = draft){
        app.displayInfoMessage("selected current opened draft - won't link")
        return 0
    }
    // a draft was selected
    insertLinkToDraft(d)
    insertLinkBacklinkToDestinationDraftFromSourceDraft(draft, d)
}


/**
 * opens a selected forward link in wiki-style-format in the given draft (if existing)
 * @param {Draft} d the Draft in which you want to find wiki-style-links
 */
function openForwardLinkFromDraft(d) {
    
    const matches = getOutgoingLinksInDraft(draft);

    if (matches.length > 0) {
        // present prompt to let the user select a draft to open
        let p = new Prompt();
        p.title = "select Draft to open"
        matches.forEach((match) => {
            p.addButton(match)
        })
        if (p.show()) {
            let selechtedTitle = p.buttonPressed
            let foundDrafts = Draft.queryByTitle(selechtedTitle)
            if (foundDrafts.length == 1) {
                editor.load(foundDrafts[0])
            } else if (foundDrafts.length > 1) {
                let p2 = new Prompt()
                p2.title = "found " + foundDrafts.length + " drafts"
                p2.message = "select draft you want to open"
                foundDrafts.forEach((curDraft) => {
                    p2.addButton(curDraft.displayTitle, curDraft)
                })
                if (p2.show()) {
                    editor.load(p2.buttonPressed);
                }
            } else {
                app.displayWarningMessage("no draft found with title \"" + selechtedTitle + "\"")
            }
        }
    }else {
        app.displayWarningMessage("no forward links found in draft")
    }
}

/**
 * searches for Drafts linking to the given Draft d with wiki-style links. Depending on the amount of found drafts a Prompt will display drafts you can open
 * @param {Draft} d the Draft you want to find links to 
 */
function findLinksToDraft(d) {
    let linkText = `[[${d.displayTitle}]]`
    let foundDrafts = Draft.query(linkText, "all", [], [], "accessed", true, true)
    if (foundDrafts.length == 0) {
        app.displayInfoMessage("no links to Draft found")
    } else if (foundDrafts.length == 1) {
        // found just one draft
        let p = new Prompt()
        p.title = "found 1 draft"
        p.message = "One Draft found with title \"" + foundDrafts[0].displayTitle + "\""
        p.addButton("open")
        if (p.show()) {
            editor.load(foundDrafts[0])
        }
    } else {
        // several drafts found
        let p = new Prompt()
        p.title = "found " + foundDrafts.length + " drafts"
        p.message = "select draft you want to open"
        foundDrafts.forEach((curDraft) => {
            p.addButton(curDraft.displayTitle, curDraft)
        })
        if (p.show()) {
            editor.load(p.buttonPressed);
        }
    }

}

/**
 * add backlinks to all drafts linked as wiki-style-links in the given draft
 * @param {Draft} d the draft you want to search the outgoing links from
 */
function addBacklinksToForwardLinkedDraftsInGivenDraft(d){
    const matches = getOutgoingLinksInDraft(d)
    let drafts = getDraftsFromTitles(matches)
    drafts.forEach((curDraft) => {
        insertBacklinkToDestinationDraftFromSourceDraft(d,curDraft)
    })
}


/**
 * add backlinks to selected drafts linked as wiki-style-links in the given draft
 * @param {Draft} d the draft you want to search the outgoing links from
 */
function addBacklinksToSelectedForwardLinkedDraftsInGivenDraft(d){
    const matches = getOutgoingLinksInDraft(d)
    let drafts = getDraftsFromTitles(matches)
    // create map for titles and drafts to be used in prompt
    const titleToDraftMap = new Map();
    drafts.forEach((curDraft) => {  
        titleToDraftMap.set(curDraft.displayTitle,curDraft)
        
    })
    // create prompt to let user decide which drafts should be linked
    let p = new Prompt()
    p.title = "select drafts"
    p.message = "select the drafts where backlinks should be added"
    p.addSelect("draftsToLink","",Array.from(titleToDraftMap.keys()),[],true);
    p.addButton("add links to drafts")
    if(p.show()){
        let selectedDrafts = p.fieldValues["draftsToLink"]
        selectedDrafts.forEach((dTitle) => {
            insertBacklinkToDestinationDraftFromSourceDraft(d,titleToDraftMap.get(dTitle))
        })
    }
}





// helper functions 

/**
 * let the user select a Draft with Drafts select interface
 * @returns Draft
 */
function getDraftFromSelection() {
    return app.selectDraft();
}

/**
 * insert a link to the given Draft at the current cursor position
 * @param {Draft} destinationDraft the Draft you want to link to
 */
function insertLinkToDraft(destinationDraft) {
    editor.setSelectedText(`[[${destinationDraft.displayTitle}]]`);
}

/**
 * insert a backlink to the sourceDraft at the linkedDraftsSection in the destinationDraft
 * @param {Draft} sourceDraft the Draft you want to link from
 * @param {Draft} destinationDraft the Draft where you want to insert the link to the sourceDraft
 */
function insertBacklinkToDestinationDraftFromSourceDraft(sourceDraft, destinationDraft) {
    // don't allow linking to the same draft
    if (sourceDraft == destinationDraft) {
        return 0
    }
    let linkText = `[[${sourceDraft.displayTitle}]]`
    const backlinkSectionStartingText = `---\n\n## `+ backlinkSectionTitle + `\n\n`
    //check if text is already in given draft d
    if (destinationDraft.content.includes(backlinkSectionStartingText)) {
        // already present, only add link
        // check if link is already exisitng
        let backLinksSectionText = destinationDraft.content.split(backlinkSectionStartingText)[1]
        if (!backLinksSectionText.includes(linkText)) {
            destinationDraft.content = destinationDraft.content.trim() + "\n- " + linkText
        }
    } else {
        // its the first backlink - add section marker and link
        destinationDraft.content = destinationDraft.content.trim() + "\n\n" + backlinkSectionStartingText + "- " + linkText
    }
    destinationDraft.update()
}

/**
 * finds all wiki-style-links in the given draft and returns them
 * @param {Draft} d the Draft where you want to search the outgoing links in
 * @returns array of titles in outgoing links
 */
function getOutgoingLinksInDraft(d){
    let content = d.content
    const regex = /\[\[([^\]]+)\]\]/g;
    const matches = [];

    let match;
    while ((match = regex.exec(content)) !== null) {
        const linkText = match[1];
        if(!matches.includes(linkText) && linkText != draft.displayTitle){
            matches.push(linkText);
        }
    }
    return matches
}

/**
 * finds drafts for each given title
 * @param {String[]} titles array of titles that you want to search drafts for
 * @returns array of Drafts[] (only unique titles are retuned)
 */
function getDraftsFromTitles(titles){
    let drafts = []
    titles.forEach((title) => {
        let foundDrafts = Draft.queryByTitle(title)
        if(foundDrafts.length == 1){
            drafts.push(foundDrafts[0])    
        }
    })
    return drafts
}