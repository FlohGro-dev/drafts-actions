// Draftotion created by FlohGro
// - https://social.lol@flohgro
// - https://flohgro.com
//
// feedback and requests welcome ✌️
//
// 🚀 consider supporting my work: 
// - https://flohgro.com/donate/


// notion endpoints
const searchEndpoint = "https://api.notion.com/v1/search"
const appendBlockEndpoint = "https://api.notion.com/v1/blocks/{block_id}/children" // PATCH request, replace {block_id} with correct id
const createPageEndpoint = "https://api.notion.com/v1/pages" // POST request
const databaseEndpoint = "https://api.notion.com/v1/databases/" // GET request to receive database, add database id to the end

// class definitions

/**
 * class to store a Notion Item (e.g. database, page)
 */
class NotionItem {
    constructor(type, title, id, url, properties) {
        this.type = type
        this.title = title
        this.id = id
        this.url = url
        this.properties = properties
    }

    getType() {
        return this.type
    }

    getTitle() {
        return this.title
    }

    getId() {
        return this.id
    }

    getUrl() {
        return this.url
    }

    getProperties() {
        return this.properties
    }
}


function copyNotionItemIdFromSelection(typeFilter = "") {

    const itemId = getNotionItemIdFromSelectedTitle(typeFilter, "select Notion item to copy id")
    if (itemId) {
        // user selected an item
        // copy id of selected item to the clipboard
        app.setClipboard(itemId)
        // display success message
        app.displaySuccessMessage("copied id of selected item to the clipboard");
    } else {
        // user did not select an item
        app.displayInfoMessage("no item was selected")
    }
}


/**
 * getNotionItemIdFromSelectedTitle - presents a prompt with titles of all accessible notion items (pages, databases) and returns the id for the selected one
 * @param {String} typeFilter as string (valid: "page", "database", "")
 * @param {String} promptTitle title of the displayed prompt, if something else than "select item" shall be displayed
 * @returns {undefined | String} undefined if the user didn't select an item, the id of the selected NotionItem
 */
function getNotionItemIdFromSelectedTitle(typeFilter = "", promptTitle = "") {
    const selectedItem = getNotionItemFromSelectedTitle(typeFilter, promptTitle)
    if (selectedItem) {
        // user selected an item
        return selectedItem.getId()
    } else {
        // user did not select an item
        return undefined
    }
}

/**
 * openNotionItemFromSelectedTitle - presents a prompt with titles of all accessible notion items (pages, databases) and opens the url of the selected item
 * @param {String} typeFilter as string (valid: "page", "database", "")
 * @returns {Boolean} false if the user didn't select an item, true if the user selected an item which is opened
 */
function openNotionItemFromSelectedTitle(typeFilter = "") {
    const selectedItem = getNotionItemFromSelectedTitle(typeFilter, "select Notion item to open")
    if (selectedItem) {
        // user selected an item
        if (selectedItem.getUrl() && selectedItem.getUrl() != "") {
            app.openURL(selectedItem.getUrl())
            return true
        } else {
            return false
        }
    } else {
        // user did not select an item
        return false
    }
}


/**
 * getNotionItemFromSelectedTitle - presents a prompt with all accessible notion items (pages, databases) and returns the NotionItem for the selected one
 * @param {String} typeFilter as string (valid: "page", "database", "")
 * @param {String} promptTitle title of the displayed prompt, if something else than "select item" shall be displayed
 * @returns {undefined | NotionItem} undefined if the user didn't select an item, the selected Notion item
 */
function getNotionItemFromSelectedTitle(typeFilter = "", promptTitle = "") {
    //validate typeFilter
    if (typeFilter != "page" && typeFilter != "database" && typeFilter != "") {
        //error
        alert("unsupported type filter: " + typeFilter);
        return undefined
    }


    const objects = getAllPagesAndDatabaseObjects()
    let notionItems = parseDatabaseAndPageObjectsIntoNotionItems(objects)

    if (typeFilter != "") {
        notionItems = notionItems.filter(item => item.getType() === typeFilter)
    }


    // create prompt
    let p = new Prompt()
    p.title = promptTitle == "" ? "select item" : promptTitle
    
    for (let notionItem of notionItems) {
        const title = notionItem.getTitle()
        // button shall display the title, but notionItem will be stored when a button is pressed
        p.addButton(title, notionItem)
    }
    if (p.show()) {
        // user selected an item - type gets not interpreted correctly so just create a new item to further access the data
        let selectedItem = new NotionItem(p.buttonPressed.type, p.buttonPressed.title, p.buttonPressed.id, p.buttonPressed.url, p.buttonPressed.properties)

        return selectedItem;
    } else {
        // user did not select an item, return undefined
        return undefined
    }


}


// helper functions


/**
 * parseDatabaseAndPageObjectsIntoNotionItems - parses objects returned form the notion search API into an array of NotionItem
 * @param {object} objects json Objects returned from the notion API that should be parsed
 * @returns {NotionItem[]} array of notion Items
 */
function parseDatabaseAndPageObjectsIntoNotionItems(objects) {
    let notionItems = []
    for (obj of objects) {
        const notionItem = new NotionItem(
            getTypeOfNotionObject(obj),
            getTitleOfNotionObject(obj),
            getIdOfNotionObject(obj),
            getUrlOfNotionObject(obj),
            getPropertiesOfNotionObject(obj)
        )
        // TODO: error handling?
        notionItems.push(notionItem)
    }
    return notionItems
}

/**
 * getAllPagesAndDatabaseObjects - uses the Notion Search API to retrieve all accessible pages, databases,... for Drafts
 * @returns {undefined | object[]} undefined if request failed or no data was returned, array of json object containing all retrieved pages 
 */
function getAllPagesAndDatabaseObjects() {
    // use search endpoint with empty data object to request all accessible pages, dbs,..
    let data = notionRequest(searchEndpoint, "POST", {})
    if (!data) {
        // data is undefined, nothing was returned, fail the action
        return undefined
    } else {
        return data.results
    }
}

/**
 * notionRequest - performs a request to the notion api against the given endpoint with the provided data
 * @param {String} endpoint endpoint of the notion api as string
 * @param {String} method POST | PATCH | GET
 * @param {object} data data object containing the request parameters
 * @returns {undefined | object} undefined if request failed or no data was returned, json object if request was successfull
 */
function notionRequest(endpoint, method, data) {
    let notion = Notion.create();

    let requestResult

    if(data == {}){
        requestResult = notion.request({
            "url": endpoint,
            "method": method
        });
    } else {
        requestResult = notion.request({
            "url": endpoint,
            "method": method,
            "data": data
        });
    }

    // result has JSON payload
    // with page properties
    if (requestResult.statusCode == 200) {
        return requestResult.responseData
    } else {
        alert(`Notion Error:\n ${requestResult.statusCode} ${notion.lastError}`);
        return undefined
    }
}

/**
 * getTypeOfNotionObject - retrieve type of given notion object
 * @param {object} obj 
 * @returns {undefined | String} undefined if object parameter is not present in given object; type of object as string (page, database)
 */
function getTypeOfNotionObject(obj) {
    if (obj["object"]) {
        return obj["object"]
    } else {
        return undefined
    }
}

/**
 * getTitleOfNotionObject - retrieve title of given notion object
 * @param {object} obj 
 * @returns {undefined | String} undefined if title could not be retrieved; title of object as string
 */
function getTitleOfNotionObject(obj) {
    // depending on the type the title is hidden "somewhere" in the object
    // the key we're looking for is "plain_text"
    // find that path, then read the value for that path
    let keyPathParts = findKeyPath(obj, 'plain_text')

    if (keyPathParts == null) {
        // early return, path was not found
        return "undefined"
    }

    for (let part of keyPathParts) {
        if (Object.prototype.hasOwnProperty.call(obj, part)) {
            obj = obj[part];
        } else {
            obj = undefined;
            break;
        }
    }
    return obj;
}

/**
 * getUrlOfNotionObject - retrieve title of given notion object
 * @param {object} obj 
 * @returns {String} url of object as string
 */
function getUrlOfNotionObject(obj) {
    // url is a top level property so just return it without checking the type of object
    return obj.url
}

/**
 * getIdOfNotionObject - retrieve id of given notion object
 * @param {object} obj 
 * @returns {String} id of object as string
 */
function getIdOfNotionObject(obj) {
    // id is a top level property so just return it without checking the type of object
    return obj.id
}


/**
 * getPropertiesOfNotionObject - retrieve properties object of given notion object
 * @param {object} obj 
 * @returns {object} properties object of given object
 */
function getPropertiesOfNotionObject(obj) {
    // properties is a top level param so just return it without checking the type of object
    return obj.properties
}

// find path to key in object
function findKeyPath(obj, key) {
    for (let k in obj) {
        if (k === key) {
            return [key];
        }
        if (typeof obj[k] === 'object') {
            let path = findKeyPath(obj[k], key);
            if (path !== null) {
                return [k].concat(path);
            }
        }
    }
    return null;
}

// testing part - nothing "production ready" below
// ----------------------------------------------

const divider = "-----------------------"




function parseResult(data) {
    //alert(resultText[0])
    let resultItems = data.results
    let keys = getAllKeys(resultItems, " ")
    //    alert(keys.join("\n"))
    let dbgStr = []
    // iterate through all items
    let dbMap = new Map()
    let pgMap = new Map()
    for (item of resultItems) {
        let itemType = item["object"]
        if (itemType == "database") {
            //            dbgStr.push(parseDatabaseObject(item))
            dbMap.set(getObjectTitle(item), getObjectId(item))
            dbMap.set(getObjectTitle(item), getObjectUrl(item))


            //storeIdsAndTitlesOfDatabaseInMap(dbMap, item)
        } else if (itemType == "page") {
            //            dbgStr.push(parsePageObject(item))
            pgMap.set(getObjectTitle(item), getObjectId(item))
            pgMap.set(getObjectTitle(item), getObjectUrl(item))
            //				storeIdsAndTitlesOfPageInMap(pgMap, item)
        } else {
            //            dbgStr.push("unknown object")
        }
        //        let itemId = item.id
        //        let itemTitle = "undefined"
        //         if (item.properties.title) {
        //             itemTitle = item.properties.title.title[0].plain_text
        //         } else if (item.properties.Name) {
        //             if (item.properties.Name.title[0]) {
        //                 itemTitle = item.properties.Name.title[0].plain_text
        //             } else {
        //                 itemTitle = item.properties.Name.title.plain_text
        //             }

        //        }
        //        dbgStr.push("type: " + itemType)
        //        dbgStr.push("id: " + itemId)
        //        dbgStr.push("title..: " + itemTitle)
        //        dbgStr.push("---")

    }

    //iterate through databases map
    let p = new Prompt()

    p.title = "select db or page"

    for (const [key, val] of dbMap) {
        p.addButton("DB: " + key, val)
    }

    for (const [key, val] of pgMap) {
        p.addButton("PAGE: " + key, val)
    }

    p.show()
    //    alert(p.buttonPressed + "\n\n\n" + dbgStr.join("\n"))
    app.openURL(p.buttonPressed)

}



function getAllKeys(obj, indentStr) {
    let list = []; // Create a list to hold all keys

    // Loop through the object
    for (let key in obj) {
        // Push the key to the list
        list.push(indentStr + key);

        // If the object has a nested object, recursively call the function
        if (typeof obj[key] === 'object') {
            list = list.concat(getAllKeys(obj[key], indentStr + "  "));
        }
    }

    return list;
}

function parseDatabaseObject(dbObj) {
    /*
    relevant properties:
    id: string
    title: array of rich text objects
    description: array of rich text objects
    ?properties: object - key:value property object
    parent: object (Parent Object)
    url: string
    archived: boolean
    */
    let result = []
    result.push("<database object>")
    let id = dbObj.id
    let title = parseRichTextObject(dbObj.title)
    let description = parseRichTextObject(dbObj.description)
    //let properties = parseProperties(dbObj.properties)
    let parent = parseParent(dbObj.parent)
    let url = dbObj.url
    let isArchived = dbObj.archived

    title ? result.push(title) : nop()
    description ? result.push(description) : nop()
    parent ? result.push(parent) : nop()
    url ? result.push(url) : nop()
    result.push(divider)
    return result.join("\n")
}

function parsePageObject(pObj) {
    /* 
    relevant parameters
    id: string
    archived: boolean
    ?properties: object - key:value property object
    parent: parent object
    */
    let result = []
    result.push("<page object>")
    let id = pObj.id
    let properties = parseProperties(pObj.properties)
    let parent = parseParent(pObj.parent)
    let url = pObj.url
    let isArchived = pObj.archived
    id ? result.push(id) : nop()
    properties ? result.push(properties) : nop()
    parent ? result.push(parent) : nop()
    url ? result.push(url) : nop()
    result.push(divider)
    return result.join("\n")
}

function parseRichTextObject(rtObj) {
    /*
    relevant properties:
    type: string (text, mention or equation)
    text|mention|equation: object (detailled type object parsing needed)
    ?annotations: object (annotation object)
    plain_text: string
    */
    let result = []
    let type = rtObj.type
    let plainText = rtObj.plain_text
    // todo type object parsing

    if (rtObj.text) {
        result.push(parseRtTextObject(rtObj.text))
    }

    type ? result.push(type) : nop()
    plainText ? result.push(plainText) : nop()
    return result.join("\n")
}

function parseParent(pObj) {
    /*
    relevant properties:
    type: string
    database_id|page_id|workspace|block_id
    */
    let result = []
    let type = pObj.type
    result.push(type)
    switch (type) {
        case "database_id":
            result.push(pObj.database_id);
            break;
        case "page_id":
            result.push(pObj.page_id);
            break;
        case "workspace":
            result.push(pObj.workspace + "(top level)");
            break;
        case "block_id":
            result.push(pObj.block_id);
            break;
    }

    return result.join("\n")
}

function parseRtTextObject(tObj) {
    /*
    relevant parameters
    content: string
    ?link: object
    */
    let result = []
    let content = tObj.content
    result.push(content)
    return result.join("\n")
}

function parseProperties(properties) {
    /*
    relevant parameters
    title?
    */
    let result = [];
    result.push("properties:")
    //properties.title? result.push(properties.title) : nop()
    let keys = Object.keys(properties)
    //result.push(keys.join(", "))
    for (key of keys) {
        result.push(key + ":" + properties[key])
        result.push(parsePropertyValue(properties[key]))
    }
    return result.join("\n")

}

function parsePropertyValue(valueObj) {
    /*
    relevant parameters
    ?id: string
    type: string (enum)
    */
    let result = []

    let keys = Object.keys(valueObj)
    //result.push(keys.join(", "))
    result.push("values:")
    for (key of keys) {
        result.push("  " + key + ":" + valueObj[key])
        if (key == "title") {
            //      for(item of valueObj[key]){
            //	      result.push(valueObj[key])
            //      }
        }
        //		result.push(parsePropertyValue(properties[key]))
    }

    //result.push(valueObj.id)
    //if(valueObj.type){
    //let type = valueObj.type
    //result.push(type)
    //}
    //result.push(valueObj)

    return result.join("\n")
}

function nop() {
    // no operation
}

function storeIdsAndTitlesOfDatabaseInMap(map, obj) {
    /*
        relevant properties:
        id: string
        title: array of rich text objects
    	 url:string
        */
    let title = "(Untitled)"
    for (item of obj.title) {
        title = item.plain_text
    }


    //    map.set(obj.id, obj.url)
    map.set(title, obj.id)
    map.set(title, obj.url)
}



function storeIdsAndTitlesOfPageInMap(map, obj) {
    /*
        relevant properties:
        id: string
        title: array of rich text objects
    	 url:string
        */
    let title = "(Untitled)"

    if (obj.properties.title) {
        title = obj.properties.title.plain_text
    }


    //    map.set(obj.id, obj.url)
    map.set(title, obj.id)
    map.set(title, obj.url)
}

function getObjectUrl(obj) {
    // url is a top level property so just return it without checking the type of object
    return obj.url
}

function getObjectId(obj) {
    // id is a top level property so just return it without checking the type of object
    return obj.id
}

function getObjectTitle(obj) {
    // depending on the type the title is hidden "somewhere" in the object
    // the key we're looking for is "plain_text" (I think)
    // so lets find that path:
    let keyPathParts = findKeyPath(obj, 'plain_text')

    if (keyPathParts == null) {
        // early return, path was not found
        return "undefined"
    }

    for (let part of keyPathParts) {
        if (Object.prototype.hasOwnProperty.call(obj, part)) {
            obj = obj[part];
        } else {
            obj = undefined;
            break;
        }
    }
    return obj;

}

// testing 2023-01-30
class NotionTodoBlock {
    constructor(content, checked) {
        this.type = "todo"
        this.content = content
        this.checked = checked
        this.color = "default"
    }

    getContent() {
        return this.content
    }

    getChecked() {
        return this.checked
    }
}

function createNotionTodoBlock(content, checkedState) {
    let obj = {
        "type": "to_do",
        "to_do": {
            "rich_text": [{
                "type": "text",
                "text": {
                    "content": content,
                    "link": null
                }
            }],
            "checked": checkedState,
            "color": "default",
            //            "children": [{}]
        }
    }
    return obj;
}

//function appendTodoToGivenPage(blockId,todoContent,todoState){
function appendTodoToGivenPage() {
    let pageIdToAppendTo = getNotionItemFromSelectedTitle()
    let endpoint = appendBlockEndpoint.replace("{block_id}", pageIdToAppendTo.getId())    
    let todoObj = createNotionTodoBlock("TEST TASK CREATED BY DRAFTS", false)
    let data = {
        "children": [todoObj]
    }
    alert(notionRequest(endpoint, "PATCH", data))
}


//function createTaskItemAsPageInDatabase(header,content,dueDate){
function createTaskItemAsPageInDatabase() {
    let tasks = getLinesOfDraft()
    const databaseToAppendTo = getNotionItemFromSelectedTitle("database")
    const databaseId = databaseToAppendTo.getId()
    const databaseProperties = databaseToAppendTo.getProperties()
    const propKeys = Object.keys(databaseProperties)

    for (task of tasks) {
        let dueDate = new Date()
        // we need to define all the properties for that db into a data object
        let pageProperties = {}
        for (let key of propKeys) {
            // what type of property is it?
            switch (databaseProperties[key].type) {
                case "date":
                    pageProperties[key] = {
                        "date": {
                            "start": dueDate.toISOString()
                        }
                    };
                    break;
                case "checkbox":
                    pageProperties[key] = {
                        "checkbox": false
                    };
                    break;
                case "title":
                    pageProperties[key] = {
                        "title": [{
                            "type": "text",
                            "text": {
                                "content": task
                            }
                        }]
                    };
                    break;
            }
            //        alert(key + ": " + databaseProperties[key].type + "\n\n" + pageProperties[key])
        }
        //alert(databasePropertyKeys)
        let pageObj = {
            "parent": {
                "database_id": databaseId
            },
            "properties": pageProperties,
        }

        notionRequest(createPageEndpoint, "POST", pageObj)
    }
    app.openURL(databaseToAppendTo.getUrl())

}


//function createTaskItemAsPageInDatabase(header,content,dueDate){
function createTaskItemAsPageInDatabaseDate(addMetadata = false) {
    let tasks = getLinesOfDraft()
    const databaseToAppendTo = getNotionItemFromSelectedTitle("database", "select database to add task")
    if (!databaseToAppendTo) {
        // nothing selected
        app.displayInfoMessage("no database selected")
        context.cancel("no database selected")
        return
    }
    const databaseId = databaseToAppendTo.getId()
    const databaseProperties = databaseToAppendTo.getProperties()
    const propKeys = Object.keys(databaseProperties)

    let taskCount = 0;
    let failCount = 0;
    let success = true;
    for (task of tasks) {
        let dateParseResult = undefined;
        let dueDate = undefined;
        let dueDateHasTime = false;
        let dueDateStr = ""
        if (stringContainsDueDate(task)) {
            // task contains a date that should be used as due date
            dateParseResult = getDateFromString(task)
            console.log(JSON.stringify(dateParseResult));
            //remove date from task string
            task = task.replace(dateParseResult.text, "")


            dueDate = dateParseResult.start.date();
            dueDateHasTime = dateParseResult.start.knownValues.hasOwnProperty("hour")
            if (!dueDateHasTime) {
                // no date in known value → just an implied time, therefore dont use time in iso string
                dueDateStr = dueDate.toISOString().split('T')[0]
            } else {
                dueDateStr = dueDate.toISOString()
            }
            //console.log("dueDateStr: " + dueDateStr)
            //alert("dueDateStr: " + dueDateStr)
        }

        // we need to define all the properties for that db into a data object
        let pageProperties = {}
        for (let key of propKeys) {
            // what type of property is it?
            switch (databaseProperties[key].type) {
                case "date":
                    if (dueDate) {
                        pageProperties[key] = {
                            "date": {
                                "start": dueDateStr
                            }
                        }
                    };
                    break;
                case "checkbox":
                    pageProperties[key] = {
                        "checkbox": false
                    };
                    break;
                case "title":
                    pageProperties[key] = {
                        "title": [{
                            "type": "text",
                            "text": {
                                "content": task
                            }
                        }]
                    };
                    break;
                case "relation": 
                    let id = addMetadata ? relationParser(task, databaseProperties[key]) : undefined;
                    if(id){
                        pageProperties[key] = {
                            "relation": [{
                                "id": id
                            }]
                        }
                    } else {
                        // no id returneds
                    }
                break;
                case "select":
                    let selection = addMetadata ? parseSelect(task, databaseProperties[key]) : undefined
                    if(selection){
                        pageProperties[key] = {
                            "select": {
                                "name": selection
                            }
                        }
                    } else {
                        // nothing selected, ignore
                    }
                default:
                    //alert(databaseProperties[key].type + "\n" + databaseProperties[key] + ":\n" + JSON.stringify(databaseProperties[key]))
            }
            //alert(databaseProperties[key].type + "\n" + databaseProperties[key] +":\n" + JSON.stringify(databaseProperties[key]))
            //        alert(key + ": " + databaseProperties[key].type + "\n\n" + pageProperties[key])
        }
        //alert(databasePropertyKeys)
        let pageObj = {
            "parent": {
                "database_id": databaseId
            },
            "properties": pageProperties,
        }

        let result = notionRequest(createPageEndpoint, "POST", pageObj)

        if(!result){
            success = false;
            failCount = failCount + 1;
        } else {
            taskCount = taskCount + 1;
        }
    }

    if(success){
        app.displaySuccessMessage("successfully created " + taskCount + " tasks")
    } else {
        let sum = taskCount + failCount;
        app.displayWarningMessage("only " + taskCount + "/" + sum + " tasks created")
        context.fail()
    }
    //app.openURL(databaseToAppendTo.getUrl())

}

function relationParser(taskContent, relationObj){
    // get the database id from the relation
    if(!relationObj.relation.database_id){
        // return undefined if not present, something is wrong -> don't fill that property
        return undefined
    }
    let dbId = relationObj.relation.database_id

    let endpointPath = databaseEndpoint + dbId + "/query"
    
    let data = {
        "query": relationObj.name,
        "filter": {
            "value": "page",
            "property": "object"
        }
    }
    data = {}

    let result = notionRequest(endpointPath,"POST",data)

    if(!result){
        return undefined
    }


    let items = result.results
    let namedItems = []
    for(let item of items){
        
        namedItems.push({
            temp: item.properties.Name,
            id: item.id,
            object: item.object,
            url: item.url,
            properties: item.properties
        })
    }
    // now results contains an object of the query a database endpoint: https://developers.notion.com/reference/post-database-query
    // this means we can parse that object to get a list of all pages inside the related database
    //let notionItems = parseDatabaseAndPageObjectsIntoNotionItems(result.results)
    let notionItems = parseDatabaseAndPageObjectsIntoNotionItems(namedItems)



    let selectedItem = getNotionItemFromSelectedTitleInProvidedItems(notionItems,"to create relation for task: \"" + taskContent + "\"" );
    if(selectedItem){
        return selectedItem.getId()
    } else {
        return undefined
    }
}


function getLinesOfDraft() {
    return draft.content.split("\n")
}



function stringContainsDueDate(wString) {
    return chrono.en.parse(wString).length > 0;
}

function getDateFromString(wString) {
    return chrono.en.parse(wString, new Date(), {
        forwardDate: true
    })[0];
}



/**
 * getNotionItemFromSelectedTitle - presents a prompt with all accessible notion items (pages, databases) and returns the NotionItem for the selected one
 * @param {NotionItem[]} notionItems notion items to choose from
 * @param {String} selectionDesctiption as string a descriptive string that will be displayed as message in the prompt
 * @returns {undefined | NotionItem} undefined if the user didn't select an item, the selected Notion item
 */
function getNotionItemFromSelectedTitleInProvidedItems(notionItems, selectionDesctiption = "") {
    // create prompt
    let p = new Prompt()
    p.title = "select item"
    if(selectionDesctiption != ""){
        p.message = selectionDesctiption
    }
    for (let notionItem of notionItems) {
        const title = notionItem.getTitle()
        // button shall display the title, but notionItem will be stored when a button is pressed
        p.addButton(title, notionItem)
    }
    if (p.show()) {
        // user selected an item - type gets not interpreted correctly so just create a new item to further access the data
        let selectedItem = new NotionItem(p.buttonPressed.type, p.buttonPressed.title, p.buttonPressed.id, p.buttonPressed.url, p.buttonPressed.properties)

        return selectedItem;
    } else {
        // user did not select an item, return undefined
        return undefined
    }


}

function parseSelect(taskContent, selectObj){
    if(!selectObj.select.options){
        return undefined
    }
    let p = new Prompt()
    p.title = "select option for \"" + selectObj.name + "\""
    p.message = "for task: \"" + taskContent + "\"";
    
    for(let opt of selectObj.select.options){
        p.addButton(opt.name)
    }

    if(!p.show()){
        return undefined
    }

    return p.buttonPressed
}