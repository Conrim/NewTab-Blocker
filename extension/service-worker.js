function increaseBadgeCounter(tabId){
  chrome.action.getBadgeText({tabId: tabId}).then((text) =>{
    let count = parseInt(text);
    if (isNaN(count)){
      count = 0;
    }
    count++;
    chrome.action.setBadgeText({tabId: tabId, text: count.toString()});
  });
  chrome.action.setBadgeBackgroundColor({tabId: tabId, color: "black"});
  chrome.action.setBadgeTextColor({tabId: tabId, color: "white"});
}

function setBadgeToError(tabId){
  chrome.action.setBadgeText({tabId: tabId, text: "X"});
  chrome.action.setBadgeBackgroundColor({tabId: tabId, color: "orange"});
  chrome.action.setBadgeTextColor({tabId: tabId, color: "black"});
}

chrome.tabs.onCreated.addListener(async function(tab){
  freezeCurTabId = true;
  if (!await closeInCase(tab) && tmpCurTabId !== undefined){
    console.log(`new active tab: ${tmpCurTabId} (was on hold)`);
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
  function closeTab(tab, openerTabId){
    chrome.tabs.remove(tab.id).then(() => {
      flashIcon();
      if (openerTabId !== undefined){
        increaseBadgeCounter(openerTabId);
      }
      console.log(`opening '${tab.pendingUrl}' (${tab.url}) (id: ${tab.id}) was blocked`);
    }).catch((error) => {
      setBadgeToError(openerTabId);
      console.warn(`could not close new tab: ${error}`);
    });
  }
  let tab_url = tab.pendingUrl ? tab.pendingUrl : (tab.url ? tab.url : "");
  console.log(`'${tab_url}' (id: ${tab.id}) wants to be opened in a new tab`);

  if (tab_url && !tab_url.startsWith("http")){
    // probably user input (i. e. chrome://newtab/)
    console.log("probably user input");
    return false;
  }
  if (/^https:\/\/www.google.com\/search\?.*q=.*&sourceid=((opera)|(chrome))/.test(tab_url)){
    // sse issue #1 (2/2)
    console.log('search on highlighted text => no blocking');
    return false;
  }
  if ((tab.url && tab.pendingUrl !== tab.url) || (tab.lastAccessed > 0 && tab.lastAccessed < Date.now() - 100)) {
    console.log(`probably restored tab ${tab.pendingUrl} ${tab.url}`);
    return false;
  }

  let recentlyClosed = (await chrome.sessions.getRecentlyClosed({ maxResults: 1 }));
  let curRecentlyClosedId = "-1";
  if (recentlyClosed.length !== 0){
    curRecentlyClosedId = recentlyClosed[0].tab ? recentlyClosed[0].tab.sessionId : recentlyClosed[0].window.sessionId;
  }
  if (curRecentlyClosedId != recentlyClosedId){
    // recentlyClosedCount probably decresed because recently closed tab was restored and is therefore not "closed"
    console.log("tab is probably restored tab (i. e. with Ctrl+Shift+T)");
    recentlyClosedId = curRecentlyClosedId;
    return false;
  }

  let resolved = await Promise.all([chrome.tabs.query({}), chrome.storage.local.get()]);
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
  
  // get opener Url
  // recover openerTabId if necessary
  let openerTabId = tab.openerTabId;
  if (openerTabId === undefined){
    console.log('could not read openerTabId directly');

    // lets make an assumption
    openerTabId = curTabId;

    if (openerTabId === undefined){
      console.warn('could not recover openerTabId: curTabId === undefind');
    }
  }

  if (openerTabId === undefined){
    if (data.urls.includes("")){
      closeTab(tab, openerTabId);
      return true;
    }
    // warning already logged
    return false;
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

  if (openerUrl === tab_url){
    // see issue #1 (1/2)
    console.log('tab duplication => no blocking');
    return false;
  }

  for(let i = 0; i < data.urls.length; i++){
    if (openerUrl.startsWith(data.urls[i])){
      closeTab(tab, openerTabId);
      return true;
    }
  }
  
  console.log(`opening '${tab_url}' (id: ${tab.id}) from '${openerUrl}' (id: ${openerTabId}) was allowed`);
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
    console.log(`new active tab on hold (${eventInfo}): ${newId}`);
    return;
  }
  curTabId = newId;

  console.log(`new active tab (${eventInfo}): ${newId}`);
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

let recentlyClosedId = "-1"; // to detect if new tab is a restored tab (with Ctrl+Shift+T)

function updateRecentlyClosedId(){
  chrome.sessions.getRecentlyClosed({ maxResults: 1 }, (recentlyClosed) => {
    if (recentlyClosed.length === 0){
      recentlyClosedId = "-1";
      return;
    }
    recentlyClosedId = recentlyClosed[0].tab ? recentlyClosed[0].tab.sessionId : recentlyClosed[0].window.sessionId;
  });
}

updateRecentlyClosedId(); // udpate on startup
chrome.tabs.onRemoved.addListener(updateRecentlyClosedId); // update when tab if removed (and counts now as recently closed)

console.log("welcome to the console");