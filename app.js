function pasteFirs(){

navigator.clipboard.readText()
.then(text => {

document.getElementById("firs-code").value = text;

});

}
