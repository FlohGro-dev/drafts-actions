// scoped tag overview

const scopedTag = "project::"

const ignoredTags = ["project::cancelled", "project::done"]



const scopedTags = Tag.query(scopedTag).sort()

const isoDateString = new Date().toISOString().split('T')[0];
let content = ["# " + scopedTag + " Tag Overview " + isoDateString, ""]

scopedTags.forEach((curTag) => {
    if(ignoredTags.includes(curTag)) {
        return
    }
    let curTagDrafts = Draft.query("", "all", [curTag], [], "modified", true, true)
    
    content.push("## " + curTag + " (" + curTagDrafts.length + ")")
    content.push("")
    curTagDrafts.map((d) => {
        content.push("- [[d:" + d.displayTitle + "]]")
    })
    content.push("")
})


let d = new Draft()
d.content = content.join("\n")
d.update()
editor.load(d)