// localize (code from https://stackoverflow.com/questions/25467009/internationalization-of-html-pages-for-my-google-chrome-extension)
function localizeHtmlPage()
{
    //Localize by replacing __MSG_***__ meta tags
    var objects = document.getElementsByTagName('html');
    for (var j = 0; j < objects.length; j++)
    {
        var obj = objects[j];

        var valStrH = obj.innerHTML.toString();
        var valNewH = valStrH.replace(/__MSG_(\w+)__/g, function(match, v1)
        {
            return v1 ? chrome.i18n.getMessage(v1) : "";
        });

        if(valNewH != valStrH)
        {
            obj.innerHTML = valNewH;
        }
    }
}
localizeHtmlPage();

const inpBox = document.getElementById("inpBox");
const con = document.getElementById("con");
const btn = document.getElementById("addBtn");
const activeSwitch = document.getElementById("activeSwitch");

let curUrl;

class Item {
    static allItems = [];
    urlStart;
    htmlElement;
    constructor(urlStart){
        this.urlStart = urlStart;
        this.htmlElement = this.createElement();
        
        Item.allItems.push(this);

        con.appendChild(this.htmlElement);
        con.scrollTo(0, con.scrollHeight);
    }
    delete(){
        con.removeChild(this.htmlElement);
        Item.allItems.splice(Item.allItems.indexOf(this), 1);
    }
    createElement() {
        // <div class="listItem"><button>x</button> <div class="spacer"></div>text</div>
        // (from chatGPT)


        // <span class="listRow">
        //   <div class="listItem">
        //     <button>x</button><div class="spacer"></div>text
        //   </div><br>
        // </span>
        // (from chatGPT)

        // Create the elements
        const listRowSpan = document.createElement('span');
        listRowSpan.classList.add('listRow');

        const listItemDiv = document.createElement('div');
        listItemDiv.classList.add('listItem');

        const closeButton = document.createElement('button');
        closeButton.onclick = () =>{
            this.delete.bind(this)();
            saveState();
        };

        const spacerDiv = document.createElement('div');
        spacerDiv.classList.add('spacer');

        const textNode = document.createTextNode(this.urlStart+"...");

        // Assemble the elements
        listItemDiv.appendChild(closeButton);
        listItemDiv.appendChild(spacerDiv);
        listItemDiv.appendChild(textNode);
        listRowSpan.appendChild(listItemDiv);
        
        return listRowSpan;
    }
}

function trimUrl(url){
    let startIndex = url.indexOf("://");
    startIndex = startIndex === -1 ? 0 : (startIndex + 3)
 
    let endIndex = url.indexOf("/", startIndex);
    if (endIndex === -1){
        return url;
    }
    return url.substring(0, endIndex);
}

function isValid(urlStart){
    // if item in list remove it (and add it afterwards to the end in onClick)
    for (let i = 0; i < Item.allItems.length; i++) {
        if (Item.allItems[i].urlStart === urlStart) {
            Item.allItems[i].delete();
            return true;
        }
    }

    if(curUrl === urlStart){
        return true;
    }
    if (/^https?:\/\/[a-z0-9\-_]+(\.[a-z0-9\-_]+)+\/?$/.test(urlStart)){
        return true;
    }
    let t0 = Date.now();
    let res = (urlStart !== "") ? confirm(chrome.i18n.getMessage("wrongUrlPatternPromt", urlStart)) : 
                                    confirm(chrome.i18n.getMessage("emptyUrlPromt"));
    if (Date.now()-t0 < 50){
        //probably alerts blocked
        return true;
    }
    return res;
}
function saveState(){
    chrome.storage.local.set({
        urls: Item.allItems.map(item => item.urlStart),
        active: activeSwitch.checked
    });
}

async function loadState(){
    let data = await chrome.storage.local.get();
    data["urls"].forEach(urlStart => new Item(urlStart));
    activeSwitch
    activeSwitch.checked = data["active"];
}

function onClick(){
    let newUrlStart = inpBox.value.trim();
    if (!isValid(newUrlStart)){
        return;
    }
    new Item(newUrlStart);
    inpBox.value = "";

    saveState();
}

// try to set inpBox-value to current url
try{
    chrome.tabs.query({ currentWindow: true, active: true }, function (tabs) {
        curUrl = trimUrl(tabs[0].url);
        inpBox.value = curUrl;
    });
}
catch(error){
    console.warn("could not read current url");
}

btn.onclick = onClick;
inpBox.onkeyup = (e) => {
    if (e.key === "Enter"){
        onClick();
    }
}

activeSwitch.onchange = () => {
    saveState();
    chrome.runtime.sendMessage({name:"changeIcon", path: activeSwitch.checked ? "icons/default.png" : "icons/gray.png"});
};

loadState();

inpBox.focus();

//can not be added to css-file (because the state is changed by code at the start and we don not want to animate that)
setTimeout(() => {
    let style_element = document.createElement("style");
    style_element.innerHTML = ".slider::before{transition: .2s;}";
    document.head.appendChild(style_element);
}, 50);