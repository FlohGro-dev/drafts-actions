// format markdown table v1.0 created by @FlohGro

function isTableLine(line) {
	return /\|.*\|/.test(line);
}

function isSeparatorLine(line) {
	// workaround proper regex could also be used but we just wrap the whole line between two words to ensure only whole lines are matched
	let testLine = "start" + line + "end"
	return /start\s*\|\s*[\-:\—|\s]+\s*\|\s*end/.test(testLine)
}

// save the version of the draft
draft.saveVersion()

let content = editor.getText();
let selectedRange = editor.getSelectedLineRange()
// move cursorPos to the middle of the selection / selected line
let cursorPos = selectedRange[0] + Math.round(selectedRange[1] / 2);

const selectedLineRange = editor.getLineRange(cursorPos, 1)
const curLine = editor.getTextInRange(selectedLineRange[0], selectedLineRange[1]).trim()

if (!isTableLine(curLine)) {
	// current line is not a table line → abort
	console.log("no line in a table selected (selected line is not a table line)")
	app.displayWarningMessage("no line in a table selected")
	context.cancel("no line in a table selected (selected line is not a table line)")
} else {
	// current line is a table line, proceed

	let lines = content.split('\n');
	// determine the current line number from the cursor position
	// we need to be careful, if the same line exists twice in the draft -> we can't use lines.indexOf(curLine)!
	let curLineIdx = 0
	let curPosIdx = 0
	let prevPosIdx = 0
	for (let line of lines) {
		prevPosIdx = curPosIdx
		curPosIdx += line.length + 1 // +1 for newline
		if (curPosIdx >= cursorPos && cursorPos >= prevPosIdx) {
			// we found the correct line -> exit
			break;
		}
		curLineIdx += 1
	}

	// find the start and end lines of the table
	let startLineIdx = curLineIdx
	let endLineIdx = curLineIdx

	// scan upwards to find the start of the table
	while (startLineIdx > 0 && isTableLine(lines[startLineIdx - 1])) {
		startLineIdx--;
	}

	// scan downwards to find the end of the table
	while (endLineIdx < lines.length && isTableLine(lines[endLineIdx])) {
		endLineIdx++;
	}

	if (startLineIdx == endLineIdx) {
		console.log("no valid table found (startLineIdx == endLineIdx)")
		app.displayWarningMessage("no valid table found")
		context.cancel("no valid table found (startLineIdx == endLineIdx)")
	} else if (endLineIdx - startLineIdx < 3) {
		console.log("no valid table found (sendLineIdx - startLineIdx < 3)")
		app.displayWarningMessage("no valid table found")
		context.cancel("no valid table found (endLineIdx - startLineIdx < 3)")
	} else {
		// extract the table lines
		let tableLines = lines.slice(startLineIdx, endLineIdx);
		tableLines = tableLines.map(line => line.replace(/—/g, `-`))

		let separatorLine = tableLines[1]
		if (!isSeparatorLine(separatorLine)) {
			// no valid separator line
			console.log("no valid separator line found (separator line:\"" + separatorLine + "\")")
			app.displayWarningMessage("no valid separator line found")
			context.cancel("no valid separator line found (separator line:\"" + separatorLine + "\")")
		} else {
			// check set alignments for cells
			let cellAlignments = [];
			separatorLine.split("|").map(cell => {
				cell = cell.trim()
				let alignment = ""
				if (cell.length == 0) {
					alignment = "x"
				} else if (/:[\-|\—]+:/.test(cell)) {
					alignment = "c"
				} else if (/:[\-|\—]+/.test(cell)) {
					alignment = "l"
				} else if (/[\-|\—]+:/.test(cell)) {
					alignment = "r"
				} else {
					// default to left align
					alignment = "l"
				}
				cellAlignments.push(alignment)
			})

			// remove separator row (it should not influcence the table widths)
			tableLines.splice(1, 1)

			// parse the table into cells and calculate max widths
			let cellWidths = [];
			let tableCells = tableLines.map(line => {
				// split the line into cells, trim whitespace, and remove leading/trailing pipes
				let cells = line.split('|').map(cell => cell.trim());
				cells.forEach((cell, i) => {
					cellWidths[i] = Math.max(cellWidths[i] || 0, cell.length);
				});
				return cells;
			});

			// create new separator row (cells) with correct alignments
			let separatorCells = []

			for (let i in cellWidths) {
				switch (cellAlignments[i]) {
					case "l": separatorCells.push(":" + '-'.repeat(cellWidths[i] - 1)); break;
					case "r": separatorCells.push('-'.repeat(cellWidths[i] - 1) + ":"); break;
					case "c": separatorCells.push(":" + '-'.repeat(cellWidths[i] - 2) + ":"); break;
					default: separatorCells.push(""); break;
				}
			}

			// insert newly created separator cells into table again
			tableCells.splice(1, 0, separatorCells);

			// reconstruct the table with proper formatting
			let formattedTable = tableCells.map((row, rowIndex) => {
				return row.map((cell, i) => {
					return cell.padEnd(cellWidths[i], ' ');
				}).join(' | ').trim();
			}).join('\n');

			// Replace the table in the original content
			lines.splice(startLineIdx, endLineIdx - startLineIdx, formattedTable);
			editor.setText(lines.join('\n'));

			// Set the cursor back to the original position
			let finalLines = editor.getText().split("\n")
			let destPosIdx = 0
			let destLineIdx = 0
			for (let line of finalLines) {
				destPosIdx += line.length + 1 //+1 for newline
				destLineIdx += 1
				if (destLineIdx > curLineIdx) {
					break;
				}
			}
			destPosIdx -= 1
			editor.setSelectedRange(destPosIdx, 0)
			editor.activate()
		}
	}
}