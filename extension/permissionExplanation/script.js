// localization (same as your popup)
function localizeHtmlPage() {
    var objects = document.getElementsByTagName('html');
    for (var j = 0; j < objects.length; j++) {
        var obj = objects[j];

        var valStrH = obj.innerHTML.toString();
        var valNewH = valStrH.replace(/__MSG_(\w+)__/g, function(match, v1) {
            return v1 ? chrome.i18n.getMessage(v1) : "";
        });

        if (valNewH != valStrH) {
            obj.innerHTML = valNewH;
        }
    }
}
localizeHtmlPage();


const btn = document.getElementById("grantBtn");
const statusText = document.getElementById("statusText");

btn.onclick = () => {
    chrome.permissions.request({ origins: ["<all_urls>"] }, (granted) => {
        if (granted) {
            statusText.textContent = chrome.i18n.getMessage("permissionGranted");
            chrome.storage.local.set({
            allowCtrlClick: true
        });
        // inject into all already-open tabs
        chrome.tabs.query({}, (tabs) => {
            for (const tab of tabs) {
                console.log("onFirst");
                chrome.scripting.executeScript({
                    target: { tabId: tab.id, allFrames: true },
                    files: ["key-state.js"],
                    injectImmediately: true
                }).catch(() => {console.log("failed to inject into already-open tab: " + tab.url);}); // ignore chrome:// and other restricted tabs
            }
        });
        // close tab after short delay
        setTimeout(() => window.close(), 400);
        }
        else {
            statusText.textContent = chrome.i18n.getMessage("permissionDenied");
        }
    });
};