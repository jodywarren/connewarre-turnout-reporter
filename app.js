
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

   const existingConn = selectedConnewarreMembers.findIndex(m => m.isOIC);
   const existingMTD = selectedMTDMembers ? selectedMTDMembers.findIndex(m => m.isOIC) : -1;

   if(checked){

      if((existingConn !== -1 && existingConn !== index) || existingMTD !== -1){

         const replace = confirm("Only one OIC can be assigned. Replace the existing OIC?");
         if(!replace){
            renderConnewarreMembers();
            return;
         }

         if(typeof clearAllOICFlags === "function"){
            clearAllOICFlags();
         }
      }

      selectedConnewarreMembers[index].isOIC = true;

      document.getElementById("oic-name").textContent =
         selectedConnewarreMembers[index].name;

      document.getElementById("oic-name").classList.remove("missing");

      document.getElementById("oic-phone").textContent =
         selectedConnewarreMembers[index].phone || "______";

   } else {

      selectedConnewarreMembers[index].isOIC = false;

      const stillHasConnOIC = selectedConnewarreMembers.find(m => m.isOIC);

      if(stillHasConnOIC){

         document.getElementById("oic-name").textContent = stillHasConnOIC.name;
         document.getElementById("oic-name").classList.remove("missing");
         document.getElementById("oic-phone").textContent =
            stillHasConnOIC.phone || "______";

      } else {

         document.getElementById("oic-name").textContent = "Not assigned";
         document.getElementById("oic-name").classList.add("missing");
         document.getElementById("oic-phone").textContent = "______";

      }
   }

   renderConnewarreMembers();
}
 let selectedMTDMembers = [];

function clearAllOICFlags(){
  selectedConnewarreMembers.forEach(member => member.isOIC = false);
  selectedMTDMembers.forEach(member => member.isOIC = false);
}

function clearMTDSearch(){
  const brigade = document.getElementById("mtd-brigade").value;
  const otherWrap = document.getElementById("mtd-other-brigade-wrap");

  document.getElementById("mtd-search").value = "";
  document.getElementById("mtd-results").innerHTML = "";

  if(brigade === "Other"){
    otherWrap.style.display = "block";
  } else {
    otherWrap.style.display = "none";
    document.getElementById("mtd-other-brigade").value = "";
  }
}

function searchMTDMembers(){
  const brigade = document.getElementById("mtd-brigade").value;
  const search = document.getElementById("mtd-search").value.toLowerCase().trim();
  const resultsDiv = document.getElementById("mtd-results");

  resultsDiv.innerHTML = "";

  if(!brigade || !search){
    return;
  }

  let sourceList = [];

  if(brigade === "Connewarre"){
    sourceList = membersData.connewarre || [];
  } else if(brigade === "Grovedale"){
    sourceList = membersData.grovedale || [];
  } else if(brigade === "Freshwater Creek"){
    sourceList = membersData.freshwater || [];
  } else {
    return;
  }

  const matches = sourceList.filter(member =>
    member.name.toLowerCase().includes(search)
  );

  matches.forEach(member => {
    const div = document.createElement("div");
    div.className = "result-item";
    div.textContent = `${member.name} (${member.brigade}) (${member.phone})`;
    div.onclick = () => addMTDMember(member, brigade);
    resultsDiv.appendChild(div);
  });
}

function addMTDMember(member, selectedBrigade){
  const alreadyAdded = selectedMTDMembers.some(m => m.id === member.id && m.brigade === selectedBrigade);
  if(alreadyAdded){
    return;
  }

  selectedMTDMembers.push({
    ...member,
    brigade: selectedBrigade,
    attribution: "",
    appliance: "",
    otherAppliance: "",
    task: "",
    isOIC: false
  });

  document.getElementById("mtd-search").value = "";
  document.getElementById("mtd-results").innerHTML = "";
  renderMTDMembers();
}

function addOtherMTDMember(){
  const brigade = document.getElementById("mtd-brigade").value;
  const otherBrigade = document.getElementById("mtd-other-brigade").value.trim();

  if(brigade !== "Other" || !otherBrigade){
    return;
  }

  const tempId = "other_" + Date.now();

  selectedMTDMembers.push({
    id: tempId,
    name: "",
    phone: "",
    brigade: otherBrigade,
    attribution: "",
    appliance: "",
    otherAppliance: "",
    task: "",
    isOIC: false,
    manualEntry: true
  });

  renderMTDMembers();
}

function renderMTDMembers(){
  const container = document.getElementById("mtd-selected");
  container.innerHTML = "";

  if(document.getElementById("mtd-brigade").value === "Other"){
    const addBtn = document.createElement("button");
    addBtn.textContent = "Add Other Brigade Member";
    addBtn.onclick = addOtherMTDMember;
    container.appendChild(addBtn);
  }

  selectedMTDMembers.forEach((member, index) => {
    const card = document.createElement("div");
    card.className = "member-card";

    card.innerHTML = `
      <h4>${member.manualEntry ? "Manual Member" : member.name}</h4>
      <div>Brigade: ${member.brigade}</div>
      <div>Phone: ${member.phone || "______"}</div>

      ${member.manualEntry ? `
        <label>Name</label>
        <input type="text" value="${member.name}" onchange="updateMTDMember(${index}, 'name', this.value)">

        <label>Phone</label>
        <input type="text" value="${member.phone}" onchange="updateMTDMember(${index}, 'phone', this.value)">
      ` : ""}

      <label>Attribution</label>
      <select onchange="updateMTDAttribution(${index}, this.value)">
        <option value="">Select</option>
        <option value="Appliance" ${member.attribution === "Appliance" ? "selected" : ""}>Appliance</option>
        <option value="Station" ${member.attribution === "Station" ? "selected" : ""}>Station</option>
        <option value="Direct" ${member.attribution === "Direct" ? "selected" : ""}>Direct</option>
      </select>

      ${member.attribution === "Appliance" ? `
        <label>Appliance</label>
        <select onchange="updateMTDAppliance(${index}, this.value)">
          <option value="MTD P/T" ${member.appliance === "MTD P/T" ? "selected" : ""}>MTD P/T</option>
          <option value="Other" ${member.appliance === "Other" ? "selected" : ""}>Other</option>
        </select>
      ` : ""}

      ${member.attribution === "Appliance" && member.appliance === "Other" ? `
        <label>Other Appliance</label>
        <input type="text" value="${member.otherAppliance || ""}" onchange="updateMTDMember(${index}, 'otherAppliance', this.value)">
      ` : ""}

      <label>Crew Task</label>
      <select onchange="updateMTDMember(${index}, 'task', this.value)">
        <option value="">Select</option>
        <option value="Driver" ${member.task === "Driver" ? "selected" : ""}>Driver</option>
        <option value="Crew Leader" ${member.task === "Crew Leader" ? "selected" : ""}>Crew Leader</option>
        <option value="Crew" ${member.task === "Crew" ? "selected" : ""}>Crew</option>
      </select>

      <label>
        <input type="checkbox" ${member.isOIC ? "checked" : ""} onchange="setMTDOIC(${index}, this.checked)">
        Incident OIC
      </label>
    `;

    container.appendChild(card);
  });
}

function updateMTDMember(index, field, value){
  selectedMTDMembers[index][field] = value;
  renderMTDMembers();
}

function updateMTDAttribution(index, value){
  selectedMTDMembers[index].attribution = value;

  if(value === "Appliance" && !selectedMTDMembers[index].appliance){
    selectedMTDMembers[index].appliance = "MTD P/T";
  }

  if(value !== "Appliance"){
    selectedMTDMembers[index].appliance = "";
    selectedMTDMembers[index].otherAppliance = "";
  }

  renderMTDMembers();
}

function updateMTDAppliance(index, value){
  selectedMTDMembers[index].appliance = value;

  if(value !== "Other"){
    selectedMTDMembers[index].otherAppliance = "";
  }

  renderMTDMembers();
}

function setMTDOIC(index, checked){
  if(checked){
    const existingConn = selectedConnewarreMembers.findIndex(m => m.isOIC);
    const existingMTD = selectedMTDMembers.findIndex(m => m.isOIC);

    if(existingConn !== -1 || (existingMTD !== -1 && existingMTD !== index)){
      const replace = confirm("Only one OIC can be assigned. Replace the existing OIC?");
      if(!replace){
        renderMTDMembers();
        return;
      }
      clearAllOICFlags();
    }

    selectedMTDMembers[index].isOIC = true;
    document.getElementById("oic-name").textContent = selectedMTDMembers[index].name || "Not assigned";
    document.getElementById("oic-name").classList.remove("missing");
    document.getElementById("oic-phone").textContent = selectedMTDMembers[index].phone || "______";
  } else {
    selectedMTDMembers[index].isOIC = false;

    const stillHasConnOIC = selectedConnewarreMembers.find(m => m.isOIC);
    const stillHasMTDOIC = selectedMTDMembers.find(m => m.isOIC);

    if(stillHasConnOIC){
      document.getElementById("oic-name").textContent = stillHasConnOIC.name;
      document.getElementById("oic-name").classList.remove("missing");
      document.getElementById("oic-phone").textContent = stillHasConnOIC.phone || "______";
    } else if(stillHasMTDOIC){
      document.getElementById("oic-name").textContent = stillHasMTDOIC.name || "Not assigned";
      document.getElementById("oic-name").classList.remove("missing");
      document.getElementById("oic-phone").textContent = stillHasMTDOIC.phone || "______";
    } else {
      document.getElementById("oic-name").textContent = "Not assigned";
      document.getElementById("oic-name").classList.add("missing");
      document.getElementById("oic-phone").textContent = "______";
    }
  }

  renderConnewarreMembers();
  renderMTDMembers();
}
