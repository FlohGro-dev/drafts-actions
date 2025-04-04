// import latest readwise highlights
// created by @FlohGro

let tagsToAdd = getTagsFromTemplateTag()

let credential = Credential.create("Readwise", "insert your Readwise API token to allow Drafts to get data from Readwise.\nYou can retrieve the token by opening readwise.io/access_token and copy it from there");

credential.addPasswordField("authtoken", "authentication token");

credential.authorize();

const booksEndpointWithHighlights = "https://readwise.io/api/v2/books/?num_highlights__gt=0"
const bookHighlightsEndpoint = "https://readwise.io/api/v2/highlights/?book_id="



function run() {
   
    let http = HTTP.create(); // create HTTP object
    let draftsToCreate = []
   let responseData = performPaginatedRequestToGivenReadwiseApiEndpoint(booksEndpointWithHighlights)

    if (responseData) {
        let books = responseData //.results
        let continueImport = true
        let curBookIndex = 0


        while (continueImport) {
            let success = true
            let latestBook = books[curBookIndex]

            if (isBookAlreadyImported(`> [Readwise Book Highlights](${latestBook.highlights_url})`)) {
                continueImport = false;
            } else {
            
                let response = http.request({
                    "url": bookHighlightsEndpoint + latestBook.id,
                    "method": "GET",
                    "headers": {
                        "Authorization": "Token " + credential.getValue("authtoken"),
                    }
                });
                responseData = undefined;
                if (response.success) {
                    responseData = response.responseData;
                } else {
                    console.log(response.statusCode);
                    console.log(response.error);
                    app.displayInfoMessage("wait for " + response.headers["retry-after"] + "s due to rate limits...")
                    let timeToWait = parseInt(response.headers["retry-after"]) * 1000
                    sleep(timeToWait); // wait for 5 seconds          
                    app.displayInfoMessage("continuing import")

                    success = false

                }
                if (responseData && success) {
                    let highlights = responseData.results
                    let highlightsTexts = [];
                    for (let highlight of highlights) {
                        let tags = highlight.tags

                        const excludedTags = ["h1", "h2", "h3"];

                        tags = tags.filter(tag => !excludedTags.includes(tag.name))
                                   .map((tag) => {
                            return "*#" + tag.name + "*"
                        })


                        const emojiRegex = /[\uD800-\uDBFF][\uDC00-\uDFFF]/;
                        let foundEmojis = ""
                        for (tag of tags) {
                            let match = tag.match(emojiRegex);

                            if (match) {
                                foundEmojis = foundEmojis + match[0] + " "
                            }
                        }

                        let text = highlight.text
                        let highlightNote = highlight.note != "" ? " (" + highlight.note + ")" : ""

                        if(highlightNote.includes(".h1")){
                            if(highlightNote === " (.h1)"){
                                highlightsTexts.push("")
                                highlightsTexts.push("### " + foundEmojis + text + " " + tags.join(", "))
                                highlightsTexts.push("")
                            } else {
                                highlightsTexts.push("")
                                highlightsTexts.push("### " + foundEmojis + text + " " + tags.join(", ") + highlightNote.replace(".h1", ""))
                                highlightsTexts.push("")
                            }
                        } else if(highlightNote.includes(".h2")){
                            if(highlightNote === " (.h2)"){
                                highlightsTexts.push("")
                                highlightsTexts.push("#### " + foundEmojis + text + " " + tags.join(", "))
                                highlightsTexts.push("")
                            } else {
                                highlightsTexts.push("")
                                highlightsTexts.push("#### " + foundEmojis + text + " " + tags.join(", ") + highlightNote.replace(".h2", ""))
                                highlightsTexts.push("")
                            }
                        } else if (highlightNote.includes(".h3")){
                            if(highlightNote === " (.h1)"){
                                highlightsTexts.push("")
                                highlightsTexts.push("##### " + foundEmojis + text + " " + tags.join(", "))
                                highlightsTexts.push("")
                            } else {
                                highlightsTexts.push("")
                                highlightsTexts.push("##### " + foundEmojis + text + " " + tags.join(", ") + highlightNote.replace(".h3", ""))
                                highlightsTexts.push("")
                            }
                        } else {
                            highlightsTexts.push("- " + foundEmojis + text + " " + tags.join(", ") + highlightNote)
                        }
                    }
                    highlightsTexts = highlightsTexts.reverse()

                    let sourceText = latestBook.source_url ? "\n- source: [" + latestBook.title + "](" + latestBook.source_url + ")" : ""
                    let documentNoteText = latestBook.document_note ? "\n\n## Note\n\n" + latestBook.document_note : ""
                    // create the text

                    if (latestBook.highlights_url) {



                        let content = `# ${latestBook.title}

![](${latestBook.cover_image_url})

- author: [[${latestBook.author}]]${sourceText}

## Highlights (${highlights.length})

${highlightsTexts.join("\n")}

---

> [Readwise Book Highlights](${latestBook.highlights_url})
	`
                        let d = new Draft()
                        d.content = content
                        for(let tag of tagsToAdd){
                            d.addTag(tag)
                        }
                        // also add the document tags from readwise
                        for (tag of latestBook.tags) {
                            d.addTag(tag.name)
                        }
                        draftsToCreate.push(d)
                    }
                }
            }

            if (success) {
                curBookIndex = curBookIndex + 1
                if (curBookIndex >= books.length) {
                    continueImport = false
                }
            }
        }
    }
    draftsToCreate = draftsToCreate.reverse()
    let lastDraft
    for (d of draftsToCreate) {
        d.update()
        lastDraft = d
    }
    editor.load(lastDraft)

    if (draftsToCreate.length == 0) {
        app.displayInfoMessage("no new highlights in readwise")
    } else {
        app.displaySuccessMessage("imported " + draftsToCreate.length + " new highlighted documents")
    }


}

run()


function isBookAlreadyImported(searchText) {
    let foundDrafts = getDraftsContainsGivenText(searchText)
    if (foundDrafts.length > 0) {
        // highlights already imported
        // length should be 1, we can just open the draft now and display an alert
        editor.load(foundDrafts[0])
        return true
    } else {
        return false;
    }
}

function getDraftsContainsGivenText(searchText) {
    let foundDrafts = Draft.query(searchText, "all", [], [], "modified", false, false)
    return foundDrafts
}

function sleep(milliseconds) {
    const date = Date.now();
    let currentDate = null;
    let notificationFactor = 1
    do {
        currentDate = Date.now();
        if (currentDate - date > (15000 * notificationFactor)) {
            const remainingSeconds = Math.round((milliseconds - (currentDate - date)) / 1000)
            app.displayInfoMessage(remainingSeconds + "s remaining")
            notificationFactor = notificationFactor + 1
        }
    } while (currentDate - date < milliseconds);
}


function performPaginatedRequestToGivenReadwiseApiEndpoint(firstEndpoint) {
    let http = HTTP.create(); // create HTTP object
    let continueRequest = true
    let responseData = [];
    let currentPageRequest = firstEndpoint
    while (continueRequest) {
        let response = http.request({
            "url": currentPageRequest,
            "method": "GET",
            "headers": {
                "Authorization": "Token " + credential.getValue("authtoken"),
            }
        });
        if (response.success) {
            let data = response.responseData
            responseData = responseData.concat(data.results);
            let nextPage = data.next
            if (nextPage) {
                currentPageRequest = nextPage
            } else {
                continueRequest = false
            }
            //            alert(nextPage + "\n" + data.count + "\n" + responseData.length)
        } else {
            alert("error:\n" + response.statusCode + "\n" + response.error)
        }

    }
    return responseData
}

function getTagsFromTemplateTag(){
   let tagsStr = draft.processTemplate("[[tags_to_add]]")
   let tags = tagsStr.split(",")
   tags = tags.map((tag) => {return tag.trim()})
   return tags
}