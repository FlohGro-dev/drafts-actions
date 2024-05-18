// add/goto pin
// created by @FlohGro@social.lol

const pinEmoji = "📍"

let text = editor.getText()
const currentPosition = editor.getSelectedRange()
// -> move to end of selection if more charactesrs are selected
let positionToUse = currentPosition[0] + currentPosition[1]

if (text.includes(pinEmoji)) {
    // pin emoji is included check amount of pin emojies
    const firstIndex = text.indexOf(pinEmoji);
    const lastIndex = text.lastIndexOf(pinEmoji);
    if (firstIndex !== -1 && firstIndex === lastIndex) {
        // There's only one occurrence of the pin emoji
        if (positionToUse == firstIndex + pinEmoji.length) {
            // we already are at the pin -> remove the pin
            editor.setTextInRange(positionToUse - pinEmoji.length, pinEmoji.length, "")
            editor.setSelectedRange(positionToUse - pinEmoji.length, 0)
            app.displayInfoMessage("pin removed")
        } else {
            positionToUse = firstIndex + pinEmoji.length;
            editor.setSelectedRange(positionToUse, 0);
            app.displayInfoMessage("jumped to pin")
        }
    } else if (firstIndex !== -1 && firstIndex !== lastIndex) {
        // There are multiple occurrences of the pin emoji
        const nextIndex = text.indexOf(pinEmoji, positionToUse + pinEmoji.length);
        if (nextIndex !== -1) {
            positionToUse = nextIndex + pinEmoji.length;
        } else {
            positionToUse = firstIndex + pinEmoji.length;
        }
        app.displayInfoMessage("found several pins, jumped to next occurence")
        editor.setSelectedRange(positionToUse, 0);
    }

} else {
    // pin emoji is not included, add it to current position of the cursor
    editor.setTextInRange(positionToUse, 0, pinEmoji)
    editor.setSelectedRange(positionToUse + pinEmoji.length, 0)
    app.displaySuccessMessage("pin added")
}

editor.activate()