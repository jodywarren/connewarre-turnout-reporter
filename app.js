
function pasteFirs(){

navigator.clipboard.readText()
.then(text => {

document.getElementById("firs-code").value = text;

})
.catch(err => {

alert("Clipboard paste failed");

});

}


/* Register service worker for offline support */

if("serviceWorker" in navigator){

window.addEventListener("load", () => {

navigator.serviceWorker.register("service-worker.js")
.then(() => {

console.log("Service worker registered");

});

});

}
