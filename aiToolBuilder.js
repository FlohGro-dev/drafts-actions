// AI Tool Builder v1.0 created by @FlohGro

const openAIModel = "gpt-3.5-turbo"
const inputMode = draft.processTemplate("[[input_mode]]").trim()
/* valid values:
current selection
draft content
last response (default to selection)
last response (default to draft content)
*/
const validInputModes = ["current selection", "draft content", "last response (default to selection)", "last response (default to draft content)", "none"]

const outputMode = draft.processTemplate("[[output_mode]]").trim()
/* valid values:
replace content
append to content
prepend to content
replace selection
insert after selection
create new draft
*/
const validOutputModes = ["replace content", "prepend to content", "append to content", "replace selection", "insert after selection", "create new draft"]

const questionMode = draft.processTemplate("[[question_mode]]").trim()
/* valid values:
    prompt for question
    use input
    [insert your question here] =>	any non-empty string
*/

const configuredSystemMessage = draft.processTemplate("[[system_message]]").trim()
const defaultSystemMessage = "replace this content with your own if you want to add a system message."
const systemMessage = configuredSystemMessage.replace(defaultSystemMessage, "")

const configuredResponseSeparator = draft.processTemplate("[[response_separator]]").trim()

const responseSeparator = configuredResponseSeparator.length > 0 ? "\n\n" + configuredResponseSeparator + "\n\n" : "\n\n"

function run() {
    if (!validateConfig()) {
        // something is wrong and already logged; terminate
        return false
    }

    let input = getInput().trim()
    if (input == "" && inputMode != "none") {
        // input is empty 
        alertError("configured input \"" + inputMode + "\" is empty")
        return false
    }
    // input seems to be fine, continue by getting the question
    let question = getQuestion(input).trim()
    if (question == "") {
        // input is empty 
        alertError("configured question \"" + questionMode + "\" was empty")
        return false
    }
    // question seems to be fine, now ask the AI
    let response = askOpenAi(question, input)
    if (!response) {
        // something is wrong and already logged; terminate
        return false
    }

    setOutput(response)
}

run()



function validateConfig() {
    let errorStrs = []
    if (!validInputModes.includes(inputMode)) {
        errorStrs.push("configured input mode \"" + inputMode + "\" is not valid!\nuse valid values:\n" + validInputModes.map(item => `- "${item}"`).join("\n"))
    }
    if (!validOutputModes.includes(outputMode)) {
        errorStrs.push("configured output mode \"" + outputMode + "\" is not valid\nuse valid values:\n" + validOutputModes.map(item => `- "${item}"`).join("\n"))
    }
    const defaultQuestionMode = `prompt for question\nuse input\n[insert your question here]`

    if (questionMode == "") {
        errorStrs.push("question_mode must not be empty")
    } else if (questionMode == defaultQuestionMode) {
        errorStrs.push("you did not make any changes to the question_mode. please change them for your usecase.")
    }
    if (errorStrs.length > 0) {
        // errors are present
        let errorStr = errorStrs.join("\n\n")
        alertError(errorStr)
        app.displayErrorMessage("configuration is invalid")
        return false
    }
    return true
}

function getInput() {
    switch (inputMode) {
        case "current selection":
            return editor.getSelectedText();
        case "draft content":
            return editor.getText();
        case "last response (default to selection)":
            return getLastResponse(true)
        case "last response (default to draft content)":
            return getLastResponse(false)
        default: return ""
    }
}

function alertError(errorStr) {
    alert(errorStr)
    console.log(errorStr)
    context.fail(errorStr)
}

function getLastResponse(defaultToSelection) {
    let text = editor.getText()
    let splits = text.split(responseSeparator)
    if (splits > 1) {
        return splits[splits.length - 1]
    } else {
        if (defaultToSelection) {
            return editor.getSelectedText()
        } else {
            return editor.getText()
        }
    }
}

function getQuestion(input) {
    /*
        prompt for question
        use input
        [insert your question here] =>	any non-empty string
    */
    switch (questionMode) {
        case "prompt for question": return promptForAIQuestion(input);
        case "use input": return getInput().trim();
        default: return questionMode;
    }
}

function promptForAIQuestion(input) {
    let p = new Prompt()
    p.title = "What do you want to ask the AI?"
    if (input.trim().length > 0) {
        let msg = "input text: \""
        if (input.length > 99) {
            msg = msg + input.substring(0, 99) + "[...]" + "\""
        } else {
            msg = msg + input + "\""
        }
        p.message = msg
    }

    p.addTextView("question", "", "", { wantsFocus: true })
    p.addButton("ask AI")
    if (p.show()) {
        return p.fieldValues["question"]
    } else {
        return ""
    }

}

function askOpenAi(question, input) {
    // now create the prompt for the AI - question and input might be the same depending on the config, so check that first
    let prompt = ""
    if (questionMode == "use input") {
        prompt = question
    } else {
        prompt = question + "\n" + input
    }
    let ai = new OpenAI()
    let settings = {}

    if (systemMessage != "") {
        settings = {
            "path": "/chat/completions",
            "method": "POST",
            "data": {
                "model": openAIModel,
                "messages": [{
                    "role": "system",
                    "content": systemMessage
                },
                {
                    "role": "user",
                    "content": prompt
                }
                ]
            }
        }
    } else {
        settings = {
            "path": "/chat/completions",
            "method": "POST",
            "data": {
                "model": openAIModel,
                "messages": [
                    {
                        "role": "user",
                        "content": prompt
                    }
                ]
            }
        }

    }

    let response = ai.request(settings)

    if (response.success) {
        let data = response.responseData
        let aiText = data.choices[0].message.content
        return aiText
    } else {
        let error = "request to openAI failed: status code = " + response.statusCode + " error = \"" + response.error + "\""
        alertError(error)
        return undefined
    }
}

function setOutput(output) {
    // save version of the draft before changing
    draft.saveVersion()
    switch (outputMode) {
        case "replace content": editor.setText(output); break;
        case "append to content": editor.setText(editor.getText() + responseSeparator + output); break;
        case "prepend to content": editor.setText(output + responseSeparator + editor.getText()); break;
        case "replace selection": editor.setSelectedText(output); break;
        case "insert after selection": editor.setSelectedText(editor.getSelectedText() + " " + output); break;
        case "create new draft":
            if (editor.getText().trim().length == 0) {
                editor.setText(output)
            } else {
                let d = new Draft()
                d.content = output
                d.update()
                editor.load(d)
            }
    }
}