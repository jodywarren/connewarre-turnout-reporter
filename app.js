
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
let membersData = {
  connewarre: [],
  grovedale: [],
  freshwater: []
};

let selectedConnewarreMembers = [];

async function loadMembers(){
  try{
    const response = await fetch("members.json");
    membersData = await response.json();
  } catch(err){
    console.log("Failed to load members:", err);
  }
}

document.addEventListener("DOMContentLoaded", function(){

  const now = new Date();
  const date = now.toISOString().split("T")[0];

  document.getElementById("pager-date").value = date;
  document.getElementById("pager-time").value = now.toTimeString().slice(0,5);

  loadMembers();

});

function searchConnewarreMembers(){
  const search = document.getElementById("conn-search").value.toLowerCase().trim();
  const resultsDiv = document.getElementById("conn-results");
  resultsDiv.innerHTML = "";

  if(!search){
    return;
  }

  const matches = membersData.connewarre.filter(member =>
    member.name.toLowerCase().includes(search)
  );

  matches.forEach(member => {
    const div = document.createElement("div");
    div.className = "result-item";
    div.textContent = `${member.name} (${member.phone})`;
    div.onclick = () => addConnewarreMember(member);
    resultsDiv.appendChild(div);
  });
}

function addConnewarreMember(member){
  const alreadyAdded = selectedConnewarreMembers.some(m => m.id === member.id);
  if(alreadyAdded){
    return;
  }

  selectedConnewarreMembers.push({
    ...member,
    attribution: "",
    appliance: "",
    task: "",
    isOIC: false
  });

  document.getElementById("conn-search").value = "";
  document.getElementById("conn-results").innerHTML = "";
  renderConnewarreMembers();
}

function renderConnewarreMembers(){
  const container = document.getElementById("conn-selected");
  container.innerHTML = "";

  selectedConnewarreMembers.forEach((member, index) => {
    const card = document.createElement("div");
    card.className = "member-card";

    card.innerHTML = `
      <h4>${member.name}</h4>
      <div>${member.phone}</div>
      <div>${member.brigade}</div>

      <label>Attribution</label>
      <select onchange="updateConnMember(${index}, 'attribution', this.value)">
        <option value="">Select</option>
        <option value="Appliance" ${member.attribution === "Appliance" ? "selected" : ""}>Appliance</option>
        <option value="Station" ${member.attribution === "Station" ? "selected" : ""}>Station</option>
        <option value="Direct" ${member.attribution === "Direct" ? "selected" : ""}>Direct</option>
      </select>

      ${member.attribution === "Appliance" ? `
        <label>Appliance</label>
        <select onchange="updateConnMember(${index}, 'appliance', this.value)">
          <option value="">Select</option>
          <option value="Tanker 1" ${member.appliance === "Tanker 1" ? "selected" : ""}>Tanker 1</option>
          <option value="Tanker 2" ${member.appliance === "Tanker 2" ? "selected" : ""}>Tanker 2</option>
          <option value="Other" ${member.appliance === "Other" ? "selected" : ""}>Other</option>
        </select>
      ` : ""}

      <label>Crew Task</label>
      <select onchange="updateConnMember(${index}, 'task', this.value)">
        <option value="">Select</option>
        <option value="Driver" ${member.task === "Driver" ? "selected" : ""}>Driver</option>
        <option value="Crew Leader" ${member.task === "Crew Leader" ? "selected" : ""}>Crew Leader</option>
        <option value="Crew" ${member.task === "Crew" ? "selected" : ""}>Crew</option>
      </select>

      <label>
        <input type="checkbox" ${member.isOIC ? "checked" : ""} onchange="setConnewarreOIC(${index}, this.checked)">
        Incident OIC
      </label>
    `;

    container.appendChild(card);
  });
}

function updateConnMember(index, field, value){
  selectedConnewarreMembers[index][field] = value;
  renderConnewarreMembers();
}

function setConnewarreOIC(index, checked){
  if(checked){
    const existingIndex = selectedConnewarreMembers.findIndex(m => m.isOIC);
    if(existingIndex !== -1 && existingIndex !== index){
      const replace = confirm("Only one OIC can be assigned. Replace the existing OIC?");
      if(!replace){
        renderConnewarreMembers();
        return;
      }
      selectedConnewarreMembers[existingIndex].isOIC = false;
    }

    selectedConnewarreMembers[index].isOIC = true;
    document.getElementById("oic-name").textContent = selectedConnewarreMembers[index].name;
    document.getElementById("oic-name").classList.remove("missing");
    document.getElementById("oic-phone").textContent = selectedConnewarreMembers[index].phone || "______";
  } else {
    selectedConnewarreMembers[index].isOIC = false;

    const stillHasOIC = selectedConnewarreMembers.find(m => m.isOIC);
    if(!stillHasOIC){
      document.getElementById("oic-name").textContent = "Not assigned";
      document.getElementById("oic-name").classList.add("missing");
      document.getElementById("oic-phone").textContent = "______";
    }
  }

  renderConnewarreMembers();
}
