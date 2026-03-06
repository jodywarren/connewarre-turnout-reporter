
function pasteFirs(){

navigator.clipboard.readText()
.then(text => {

document.getElementById("firs-code").value = text;

})
.catch(err => {

alert("Clipboard paste failed");

});

}

function showTab(tab){

document.getElementById("incident-tab").style.display="none";
document.getElementById("connewarre-tab").style.display="none";
document.getElementById("mtd-tab").style.display="none";
document.getElementById("send-tab").style.display="none";

document.getElementById(tab).style.display="block";

}

/* Register service worker for offline support */

if("serviceWorker" in navigator){

window.addEventListener("load", () => {

navigator.serviceWorker.register("service-worker.js")
.then(() => {

console.log("Service worker registered");

})
.catch(err => {

console.log("Service worker failed:", err);

});

});

}
document.addEventListener("DOMContentLoaded", function(){

const now = new Date();

const date = now.toISOString().split("T")[0];

document.getElementById("pager-date").value = date;

document.getElementById("pager-time").value =
now.toTimeString().slice(0,5);

});
