/// <reference path="./../drafts.d.ts" />
/**
 * Forever Drafts Group Functions
 * @author FlohGro
 * @copyright 2024, FlohGro
 * @licensing MIT free to use - but donate coffees to support development http://www.flohgro.com/donate
 * @version 0.1
 */

const TemplateTags = {
  HOME_DRAFT_TITLE: "HomeNoteTitle",
  HUB_PREFIX_EMOJI: "HubPrefixEmoji",
  PROJECT_PREFIX_EMOJI: "ProjectPrefixEmoji",
  PROJECT_OMIT_TAGS: "ProjectOmitTags",
  PROJECT_PREPEND_LINE_OFFSET: "ProjectPrependLineOffset",
  WRITING_PREFIX_EMOJI: "WritingPrefixEmoji"
}

const SettingsActionName = "Forever Drafts Settings"

// settings

function getForeverDraftsSettingsConfiguration(defString) {
  let action = Action.find(SettingsActionName)
  if (!action) {
    context.fail("No getForeverDraftsSettingsConfigurations Action with name " + SettingsActionName + " found")
    return undefined
  }
  let val = action.configuredValues[defString]
  if (val == "") {
    context.fail("No value configured for " + defString)
    return undefined
  }
  return val
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

function linkToProjectDraft() {
  const projectsPrefixEmoji = getProjectPrefixEmoji()
  if (projectsPrefixEmoji) {
    // search for project drafts (starting with the emoji AND not containing the omit tag)
    let omitTags = draft.processTemplate("[[omit_tags]]").split(",").map((val) => val.trim())
    //let projectDrafts = Draft.query(projectsPrefixEmoji, "all", [], omitTags, "modified", true, true).filter((d) => { return d.displayTitle.includes(projectsPrefixEmoji) }).sort((a, b) => a.displayTitle.localeCompare(b.displayTitle))

    let projectDrafts = queryByTitleOmitTags(projectsPrefixEmoji, omitTags)
    //let projectDrafts = Draft.queryByTitle(projectsPrefixEmoji).sort((a, b) => a.displayTitle.localeCompare(b.displayTitle))

    if (projectDrafts.length == 0) {
      app.displayErrorMessage("no project draft with defined emoji \"" + projectsPrefixEmoji + "\" exists")
      return undefined
    }

    // select project draft from prompt
    let p = new Prompt()
    p.title = "select project draft"
    projectDrafts.forEach((d) => {
      p.addButton(d.displayTitle, d)
    })
    if (p.show()) {
      let selectedDraft = p.buttonPressed
      // link to the project draft
      let currentSelectedRange = editor.getSelectedRange();
      let textToAdd = getWikiLinkToDraft(selectedDraft)
      editor.setSelectedText(textToAdd)
      editor.setSelectedRange(currentSelectedRange[0] + textToAdd.length, 0)
      editor.activate()
      // add backlink to the project draft
      insertLinkToSourceDraftIntoDestinationDraft(draft, selectedDraft)
    }
  } else {
    app.displayErrorMessage("no project prefix emoji defined")
  }
}

function openHomeDraft() {
  const homeDraft = getHomeDraft()
  if (homeDraft) {
    editor.load(homeDraft)
    if (device.model = "iPhone") {
      app.hideActionList()
      app.hideDraftList()
    }
  } else {
    app.displayErrorMessage("no home draft exists")
  }
}

function openProjectDraft() {
  let selectedDraft = selectFromProjectDrafts()
  if (selectedDraft) {
    editor.load(selectedDraft)
  }
}

function openWritingDraft() {
  let selectedDraft = selectFromWritingDrafts()
  if (selectedDraft) {
    editor.load(selectedDraft)
  }
}

function prependToProjectDraft() {
  let lineOffset = parseInt(draft.processTemplate("[[" + TemplateTags.PROJECT_PREPEND_LINE_OFFSET + "]]"))
  if (isNaN(lineOffset)) {
    lineOffset = 1
  }

  let selectedDraft = selectFromProjectDrafts()
  if (selectedDraft) {
    selectedDraft.insert("\n" + draft.content, lineOffset)
    selectedDraft.update()
    app.displaySuccessMessage("prepended draft")
    openHomeDraft()

  }
}

function appendToProjectDraft() {
  let selectedDraft = selectFromProjectDrafts()
  if (selectedDraft) {
    selectedDraft.append("\n\n" + draft.content, lineOffset)
    selectedDraft.update()
    app.displaySuccessMessage("appended draft")
    openHomeDraft()
  }
}

function appendToWritingDraft() {
  let selectedDraft = selectFromWritingDrafts()
  if (selectedDraft) {
    selectedDraft.append("\n\n" + draft.content)
    selectedDraft.update()
    app.displaySuccessMessage("appended draft")
    openHomeDraft()
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

function getProjectDrafts() {
  let projectDraftsTitle = getForeverDraftsSettingsConfiguration(TemplateTags.PROJECT_PREFIX_EMOJI)

  if (!projectDraftsTitle) {
    return []
  }

  let foundDrafts = Draft.queryByTitle(projectDraftsTitle)
  if (foundDrafts.length == 0) {
    // no project draft exists
    app.displayErrorMessage("no project draft that contains \"" + projectDraftsTitle + "\" in title exists")
    return undefined
  } else if (foundDrafts.length >= 1) {
    return foundDrafts
  }
}

function selectFromProjectDrafts() {
  const projectDrafts = getProjectDrafts()
  if (projectDrafts && projectDrafts.length > 0) {
    let p = new Prompt()
    p.title = "select project draft"
    projectDrafts.map(d => p.addButton(d.displayTitle, d))
    if (p.show()) {
      return p.buttonPressed
    } else {
      app.displayInfoMessage("opening cancelled")
      return undefined
    }
  } else {
    return undefined
  }

}

function getWritingDrafts() {
  let writingDraftsTitle = getForeverDraftsSettingsConfiguration(TemplateTags.WRITING_PREFIX_EMOJI)
  if (!writingDraftsTitle) {
    return []
  }
  //  const writingDraftsTitle = draft.processTemplate("[[" + TemplateTags.ARTICLE_PREFIX_EMOJI + "]]").trim().trim()
  let foundDrafts = Draft.queryByTitle(writingDraftsTitle)
  if (foundDrafts.length == 0) {
    // no project draft exists
    app.displayErrorMessage("no writing draft that contains \"" + writingDraftsTitle + "\" in title exists")
    return undefined
  } else if (foundDrafts.length >= 1) {
    return foundDrafts
  }
}

function selectFromWritingDrafts() {
  const writingDrafts = getWritingDrafts()
  if (writingDrafts && writingDrafts.length > 0) {
    let p = new Prompt()
    p.title = "select writing draft"
    writingDrafts.map(d => p.addButton(d.displayTitle, d))
    if (p.show()) {
      return p.buttonPressed
    } else {
      app.displayInfoMessage("opening cancelled")
      return undefined
    }
  } else {
    return undefined
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

function insertLinkToSourceDraftIntoCurrentDraftAtCursor(sourceDraft) {
  let selectedRange = editor.getSelectedRange()
  if (selectedRange[1] == 0) {
    // no text selected - just insert the link
    editor.setSelectedText(`[[${sourceDraft.displayTitle}]]`)
  } else {
    // text selected - should be added after the text
    editor.setSelectedRange(selectedRange[0] + selectedRange[1], 0)
    editor.setSelectedText(`[[${sourceDraft.displayTitle}]]`)
  }
}

function queryByTitleOmitTags(title, omitTags) {
  return Draft.query(title, "all", [], omitTags, "modified", true, true).filter((d) => { return d.displayTitle.includes(title) }).sort((a, b) => a.displayTitle.localeCompare(b.displayTitle))
}

function getWikiLinkToDraft(theDraft) {
  return `[[${theDraft.displayTitle}]]`
}

function getHubPrefixEmoji() {
  return getForeverDraftsSettingsConfiguration(TemplateTags.HUB_PREFIX_EMOJI)
}

function getProjectPrefixEmoji() {
  return getForeverDraftsSettingsConfiguration(TemplateTags.PROJECT_PREFIX_EMOJI)
}

function getWritingPrefixEmoji() {
  return getForeverDraftsSettingsConfiguration(TemplateTags.WRITING_PREFIX_EMOJI)
}
function insertEmoji() {
  let p = new Prompt()
  p.title = "select emoji"
  const hubEmoji = getHubPrefixEmoji()
  const projectEmoji = getProjectPrefixEmoji()
  const writingEmoji = getWritingPrefixEmoji()
  p.addButton("Hub (" + hubEmoji + ")", hubEmoji)
  p.addButton("Project (" + projectEmoji + ")", projectEmoji)
  p.addButton("Writing (" + writingEmoji + ")", writingEmoji)
  if (p.show()) {
    let selectedRange = editor.getSelectedRange()
    editor.setSelectedRange(selectedRange[0] + selectedRange[1], 0)
    editor.setSelectedText(p.buttonPressed)
  }
}

// general linking helpers

function findDraftsWithUnlinkedMentionsToDraft(currentDraft = draft) {
  // the found drafts contain all drafts that mention the currentDraft with a wiki link
  foundDrafts = Draft.query(getWikiLinkToDraft(currentDraft), "all", [], [], "modified", true, true)
  // no filter out the ones that are already linked to in currentDraft
  foundDrafts = foundDrafts.filter((d) => {
    return !currentDraft.content.includes(getWikiLinkToDraft(d))
  })


  if (foundDrafts.length > 0) {
    return foundDrafts
  } else {
    return undefined
  }
}

function linkSelectedUnlinkedMentionsToCurrentDraft() {
  let foundDrafts = findDraftsWithUnlinkedMentionsToDraft()
  if (foundDrafts) {
    let p = new Prompt()
    p.title = "select draft you want to link"
    foundDrafts.forEach((curDraft) => {
      p.addButton(curDraft.displayTitle, curDraft)
    })
    if (p.show()) {
      insertLinkToSourceDraftIntoCurrentDraftAtCursor(p.buttonPressed)
    }
  } else {
    app.displayInfoMessage("no unlinked mentions found")
  }
}
