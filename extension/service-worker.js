chrome.tabs.onCreated.addListener(async function(tab){
  freezeCurTabId = true;
  if (!await closeInCase(tab) && tmpCurTabId !== undefined){
    console.log(`new acitve tab: ${tmpCurTabId} (was on hold)`);
    curTabId = tmpCurTabId;
    tmpCurTabId = undefined;
  }
  freezeCurTabId = false;
});

let stopFlashIcon;
function flashIcon(){
  let flashTime = 800;
  chrome.action.setIcon({path: "icons/flash.png"});
  stopFlashIcon = new Date().getTime() + flashTime;
  setTimeout(()=>{
    if (new Date().getTime() < stopFlashIcon){
      return;
    }
    chrome.action.setIcon({path: "icons/default.png"});
  }, flashTime);
}

async function closeInCase(tab){
  function closeTab(tab){
    chrome.tabs.remove(tab.id).then(() => {
      flashIcon();
      console.log(`opening '${tab.pendingUrl}' (id: ${tab.id}) was blocked`);
    }).catch((error) => {
      console.warn(`could not close new tab: ${error}`);
    });
  }
  
  console.log(`'${tab.pendingUrl}' (id: ${tab.id}) wants to be opened in a new tab`);  

  if ("pendingUrl" in tab && !tab.pendingUrl.startsWith("http")){
    // probalby user input (i. e. chrome://newtab/)
    console.log("probably user input");
    return false;
  }

  let resolved = await Promise.all([chrome.tabs.query({}), chrome.storage.local.get()]);
  //let openerUrl = resolved[0].url;
  let tabs = resolved[0];
  let data = resolved[1];
  
  if (!data.active || data.urls.length === 0){
    console.log('not active or empty list');
    return false;
  }

  if (tabs.length <= 1){
    console.log('only tab existing => no blocking');
    return false;
  }

  if ("" in data.urls){
    closeTab(tab);
    return true;
  }
  
  // get opener Url
  // recover openerTabId if necessary
  let openerTabId = tab.openerTabId;
  if (openerTabId === undefined){
    console.log('could not read openerTabId directly');
    if (curTabId === undefined){
      console.warn('could not recover openerTabId: curTabId === undefind');
      return false;
    }
    // lets make an assumption
    openerTabId = curTabId;
  }
  let openerUrl;
  try{
    openerUrl = (await chrome.tabs.get(openerTabId)).url;
  } 
  catch(error){
    console.warn(`could not get openerUrl: ${error}`);
    return false;
  }
  if (openerUrl === undefined || openerUrl === ""){
    console.warn(`could not get openerUrl: openerUrl = '${openerUrl}' of tab: ${openerTabId}`);
    return false;
  }
  console.log(`openerUrl: ${openerUrl}`);


  for(let i = 0; i < data.urls.length; i++){
    if (openerUrl.startsWith(data.urls[i])){
      closeTab(tab);
      return true;
    }
  }
  
  console.log(`opening '${tab.pendingUrl}' (id: ${tab.id}) from '${openerUrl}' (id: ${openerTabId}) was allowed`);
  return false;
}

// initialize storage if necessary and set icon
chrome.storage.local.get().then((res) => {
  if (Object.keys(res).length === 0){
    chrome.storage.local.set({urls:[], active:true});
    return;
  }
  chrome.action.setIcon({path: res["active"] ? "icons/default.png" : "icons/gray.png"});
});

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse){
  if (request.name === "changeIcon"){
    chrome.action.setIcon({path: request.path});
  }
});

// use curTabId as backup (sometimes new_tab.openerTabId === undefind)
let curTabId = undefined;
let freezeCurTabId = false;
let tmpCurTabId = undefined;

function setCurTabId(newId, eventInfo = ""){
  if (freezeCurTabId){
    tmpCurTabId = newId;
    console.log(`new acitve tab on hold (${eventInfo}): ${newId}`);
    return;
  }
  curTabId = newId;

  console.log(`new acitve tab (${eventInfo}): ${newId}`);
}

chrome.tabs.onActivated.addListener(function(activeInfo) {
  setCurTabId(activeInfo.tabId);
});

// tab change on window change is not covered by tabs.onActivated
chrome.windows.onFocusChanged.addListener(windowId => {
  if (windowId === -1){
    return;
  }
  chrome.tabs.query({"active": true, "windowId": windowId}).then((tabs) => {
    setCurTabId(tabs[0].id, "window change");
  }).catch((error) => {
    console.warn(`could not get curtabId on window change: ${error}`);
  });
});

// set curTabId on extension startup
chrome.tabs.query({"active": true, "lastFocusedWindow": true}).then((tabs) => {
  setCurTabId(tabs[0].id, "startup");
}).catch((error) => {
  console.warn(`could not get curtabId on startup: ${error}`);
});

console.log("welcome to the console");