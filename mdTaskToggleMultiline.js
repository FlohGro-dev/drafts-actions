// toggle or add checklist in selected lines
// created by FlohGro

const off = "[ ]";
const on = "[x]";

// grab state
let [lnStart, lnLen] = editor.getSelectedLineRange();
let lnText = editor.getTextInRange(lnStart, lnLen - 1);
let [selStart, selLen] = editor.getSelectedRange();

function checkBoxWithState(destState) {
    if (destState) {
        return '- ' + on + ' '
    } else {
        return '- ' + off + ' '
    }
}

function getLenDiff(orgT, newT) {
    return newT.length - orgT.length
}

const lines = lnText.split('\n');

const multipleLinesUsed = lines.length == 1 ? false : true
const newLineAtTheEnd = editor.getTextInRange(lnStart, lnLen).endsWith("\n")
const reg = /^(\s*[*-]?\s*)\[([xX ])?\]\s?(.*)/;
let destState = false;

if (lnText.includes(off)) {
    destState = true
}

let outLines = []
let insertedCharacters = 0

let orgT = "";
let newT = ""

for (let line of lines) {
    let orgT = line
    if (line.trim() == "") {
        // empty line
        newT = checkBoxWithState(destState)
        outLines.push(checkBoxWithState(destState))
        insertedCharacters += getLenDiff(orgT, newT)
    } else if (/^(\s*)(\w)/.test(line)) {
        // line with text
        newT = line.replace(/^(\s*)(\w)/, '$1' + checkBoxWithState(destState) + '$2')
        outLines.push(newT)
        insertedCharacters += getLenDiff(orgT, newT)
    } else if (/^(\s*)[*-] ([^\[])/.test(line)) {
        // a bullet point
        newT = line.replace(/^(\s*)[*-] ([^\[])/, '$1' + checkBoxWithState(destState) + '$2')
        outLines.push(newT)
        insertedCharacters += getLenDiff(orgT, newT)
    } else if (/^(\s*)([*-] \[[ xX]\] )/.test(line)) {
        // md checkbox with whitespace at the end
        newT = line.replace(/^(\s*)([*-] \[[ xX]\] )/, '$1' + checkBoxWithState(destState))
        outLines.push(newT)
        insertedCharacters += getLenDiff(orgT, newT)
    } else if (/^(\s*)([*-] \[[ xX]\])/.test(line)) {
        // md checkbox without whitespace at the end
        newT = line.replace(/^(\s*)([*-] \[[ xX]\])/, '$1' + checkBoxWithState(destState))
        outLines.push(newT)
        insertedCharacters += getLenDiff(orgT, newT)
    }
}

lnText = outLines.join('\n')
lnText += newLineAtTheEnd ? "\n" : "";

editor.setTextInRange(lnStart, lnLen, lnText);

if (multipleLinesUsed) {
    editor.setSelectedRange(lnStart, lnLen + insertedCharacters - 1)
} else {
    if (selLen == 0) {
        editor.setSelectedRange(selStart + insertedCharacters, selLen)
    } else {
        editor.setSelectedRange(selStart, selLen + insertedCharacters)
    }
}