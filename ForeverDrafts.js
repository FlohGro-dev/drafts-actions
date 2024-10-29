/**
 * Forever Drafts Group Functions
 * @author FlohGro
 * @copyright 2024, FlohGro
 * @licensing MIT free to use - but donate coffees to support development http://www.flohgro.com/donate
 * @version 0.1
 */

const TemplateTags = {
  HOME_DRAFT_TITLE: "HomeNoteTitle",
  HUB_PREFIX_EMOJI: "HubsPrefixEmoji"
}

// actions

function linkToHomeDraft() {
  const homeDraft = getHomeDraft()
  if (homeDraft) {
    // link to the home draft
    let currentSelectedRange = editor.getSelectedRange();
    let textToAdd = getWikiLinkToDraft(homeDraft)
    editor.setSelectedText(textToAdd)
    editor.setSelectedRange(currentSelectedRange[0] + textToAdd.length, 0)
    // add backlink to the home draft
    insertLinkToDraftIntoHomeDraft(draft, homeDraft)

    editor.activate()
  } else {
    // no home draft exists
    return undefined
  }
}

function linkToHubDraft() {
  const hubsPrefixEmoji = getHubPrefixEmoji()
  if (hubsPrefixEmoji) {
    // search for hub drafts (starting with the emoji)
    let hubDrafts = Draft.queryByTitle(hubsPrefixEmoji).sort((a, b) => a.displayTitle.localeCompare(b.displayTitle))

    if (hubDrafts.length == 0) {
      app.displayErrorMessage("no hub draft with defined emoji \"" + hubsPrefixEmoji + "\" exists")
      return undefined
    }

    // select hub draft from prompt
    let p = new Prompt()
    p.title = "select hub draft"
    hubDrafts.forEach((d) => {
      p.addButton(d.displayTitle, d)
    })
    if (p.show()) {
      let selectedDraft = p.buttonPressed
      // link to the hub draft
      let currentSelectedRange = editor.getSelectedRange();
      let textToAdd = getWikiLinkToDraft(selectedDraft)
      editor.setSelectedText(textToAdd)
      editor.setSelectedRange(currentSelectedRange[0] + textToAdd.length, 0)
      editor.activate()
      // add backlink to the hub draft
      insertLinkToSourceDraftIntoDestinationDraft(draft, selectedDraft)
    }
  } else {
    app.displayErrorMessage("no hub prefix emoji defined")
  }
}

// helper functions

function getHomeDraft() {
  const homeDraftTitle = draft.processTemplate("[[" + TemplateTags.HOME_DRAFT_TITLE + "]]").trim()


  let foundDrafts = Draft.queryByTitle(homeDraftTitle)
  if (foundDrafts.length == 0) {
    // no home draft exists
    app.displayErrorMessage("no home draft with title \"" + homeDraftTitle + "\" exists")
    return undefined
  } else if (foundDrafts.length > 1) {
    // more than one home draft exists
    app.displayErrorMessage("more than one home draft with title \"" + homeDraftTitle + "\" exists")
    return undefined
  } else {
    return foundDrafts[0]
  }
}

function insertLinkToDraftIntoHomeDraft(draft, homeDraft = getHomeDraft()) {
  if (homeDraft) {
    insertLinkToSourceDraftIntoDestinationDraft(draft, homeDraft)
  }
}

function insertLinkToSourceDraftIntoDestinationDraft(sourceDraft, destinationDraft) {
  destinationDraft.insert(`\n[[${sourceDraft.displayTitle}]]`, 1)
  destinationDraft.update()
}

function getWikiLinkToDraft(theDraft) {
  return `[[${theDraft.displayTitle}]]`
}

function getHubPrefixEmoji() {
  return draft.processTemplate("[[" + TemplateTags.HUB_PREFIX_EMOJI + "]]").trim()
}
