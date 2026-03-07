function pasteFirs() {
  navigator.clipboard.readText()
    .then(text => {
      const firsField = document.getElementById("firs-code");
      if (firsField) {
        firsField.value = text;
      }
    })
    .catch(() => {
      alert("Clipboard paste failed");
    });
}

function showTab(tab) {
  const tabs = ["incident-tab", "connewarre-tab", "mtd-tab", "send-tab"];

  tabs.forEach(id => {
    const section = document.getElementById(id);
    if (section) {
      section.style.display = "none";
    }
  });

  const activeTab = document.getElementById(tab);
  if (activeTab) {
    activeTab.style.display = "block";
  }
}

/* Register service worker for offline support */
if ("serviceWorker" in navigator) {
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

/* Data stores */
let membersData = {
  connewarre: [],
  grovedale: [],
  freshwater: []
};

let selectedConnewarreMembers = [];
let selectedMTDMembers = [];

/* Initial load */
async function loadMembers() {
  try {
    const response = await fetch("members.json");
    membersData = await response.json();
  } catch (err) {
    console.log("Failed to load members:", err);
  }
}

document.addEventListener("DOMContentLoaded", function () {
  const now = new Date();
  const date = now.toISOString().split("T")[0];

  const pagerDate = document.getElementById("pager-date");
  const pagerTime = document.getElementById("pager-time");

  if (pagerDate) {
    pagerDate.value = date;
  }

  if (pagerTime) {
    pagerTime.value = now.toTimeString().slice(0, 5);
  }

  loadMembers();
});

/* Shared OIC helpers */
function updateOICHeader(name, phone) {
  const oicName = document.getElementById("oic-name");
  const oicPhone = document.getElementById("oic-phone");

  if (!oicName || !oicPhone) {
    return;
  }

  if (name) {
    oicName.textContent = name;
    oicName.classList.remove("missing");
    oicPhone.textContent = phone || "______";
  } else {
    oicName.textContent = "Not assigned";
    oicName.classList.add("missing");
    oicPhone.textContent = "______";
  }
}

function clearAllOICFlags() {
  selectedConnewarreMembers.forEach(member => {
    member.isOIC = false;
  });

  selectedMTDMembers.forEach(member => {
    member.isOIC = false;
  });
}

function refreshOICHeaderFromSelections() {
  const connOIC = selectedConnewarreMembers.find(member => member.isOIC);
  const mtdOIC = selectedMTDMembers.find(member => member.isOIC);

  if (connOIC) {
    updateOICHeader(connOIC.name, connOIC.phone);
  } else if (mtdOIC) {
    updateOICHeader(mtdOIC.name, mtdOIC.phone);
  } else {
    updateOICHeader("", "");
  }
}

/* Connewarre */
function searchConnewarreMembers() {
  const searchField = document.getElementById("conn-search");
  const resultsDiv = document.getElementById("conn-results");

  if (!searchField || !resultsDiv) {
    return;
  }

  const search = searchField.value.toLowerCase().trim();
  resultsDiv.innerHTML = "";

  if (!search) {
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

function addConnewarreMember(member) {
  const alreadyAdded = selectedConnewarreMembers.some(m => m.id === member.id);
  if (alreadyAdded) {
    return;
  }

  selectedConnewarreMembers.push({
    ...member,
    attribution: "",
    appliance: "",
    task: "",
    isOIC: false
  });

  const searchField = document.getElementById("conn-search");
  const resultsDiv = document.getElementById("conn-results");

  if (searchField) {
    searchField.value = "";
  }

  if (resultsDiv) {
    resultsDiv.innerHTML = "";
  }

  renderConnewarreMembers();
}

function renderConnewarreMembers() {
  const container = document.getElementById("conn-selected");
  if (!container) {
    return;
  }

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

function updateConnMember(index, field, value) {
  selectedConnewarreMembers[index][field] = value;
  renderConnewarreMembers();
}

function setConnewarreOIC(index, checked) {
  const existingConn = selectedConnewarreMembers.findIndex(m => m.isOIC);
  const existingMTD = selectedMTDMembers.findIndex(m => m.isOIC);

  if (checked) {
    if ((existingConn !== -1 && existingConn !== index) || existingMTD !== -1) {
      const replace = confirm("Only one OIC can be assigned. Replace the existing OIC?");
      if (!replace) {
        renderConnewarreMembers();
        return;
      }

      clearAllOICFlags();
    }

    selectedConnewarreMembers[index].isOIC = true;
  } else {
    selectedConnewarreMembers[index].isOIC = false;
  }

  renderConnewarreMembers();
  renderMTDMembers();
  refreshOICHeaderFromSelections();
}

/* MTD */
function clearMTDSearch() {
  const brigadeField = document.getElementById("mtd-brigade");
  const otherWrap = document.getElementById("mtd-other-brigade-wrap");
  const otherBrigadeField = document.getElementById("mtd-other-brigade");
  const searchField = document.getElementById("mtd-search");
  const resultsDiv = document.getElementById("mtd-results");

  if (!brigadeField || !otherWrap || !otherBrigadeField || !searchField || !resultsDiv) {
    return;
  }

  const brigade = brigadeField.value;

  searchField.value = "";
  resultsDiv.innerHTML = "";

  if (brigade === "Other") {
    otherWrap.style.display = "block";
  } else {
    otherWrap.style.display = "none";
    otherBrigadeField.value = "";
  }
}

function searchMTDMembers() {
  const brigadeField = document.getElementById("mtd-brigade");
  const searchField = document.getElementById("mtd-search");
  const resultsDiv = document.getElementById("mtd-results");

  if (!brigadeField || !searchField || !resultsDiv) {
    return;
  }

  const brigade = brigadeField.value;
  const search = searchField.value.toLowerCase().trim();

  resultsDiv.innerHTML = "";

  if (!brigade || !search) {
    return;
  }

  let sourceList = [];

  if (brigade === "Connewarre") {
    sourceList = membersData.connewarre || [];
  } else if (brigade === "Grovedale") {
    sourceList = membersData.grovedale || [];
  } else if (brigade === "Freshwater Creek") {
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

function addMTDMember(member, selectedBrigade) {
  
  const alreadyAdded = selectedMTDMembers.some(
    m => m.id === member.id && m.brigade === selectedBrigade
  );

  if (alreadyAdded) {
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

  const searchField = document.getElementById("mtd-search");
  const resultsDiv = document.getElementById("mtd-results");

  if (searchField) {
    searchField.value = "";
  }

  if (resultsDiv) {
    resultsDiv.innerHTML = "";
  }

  renderMTDMembers();
}

function addOtherMTDMember() {
  const brigadeField = document.getElementById("mtd-brigade");
  const otherBrigadeField = document.getElementById("mtd-other-brigade");

  if (!brigadeField || !otherBrigadeField) {
    return;
  }

  const brigade = brigadeField.value;
  const otherBrigade = otherBrigadeField.value.trim();

  if (brigade !== "Other" || !otherBrigade) {
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

function renderMTDMembers() {
  const container = document.getElementById("mtd-selected");
  const brigadeField = document.getElementById("mtd-brigade");

  if (!container || !brigadeField) {
    return;
  }

  container.innerHTML = "";

  if (brigadeField.value === "Other") {
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

function updateMTDMember(index, field, value) {
  selectedMTDMembers[index][field] = value;
  renderMTDMembers();
}

function updateMTDAttribution(index, value) {
  selectedMTDMembers[index].attribution = value;

  if (value === "Appliance" && !selectedMTDMembers[index].appliance) {
    selectedMTDMembers[index].appliance = "MTD P/T";
  }

  if (value !== "Appliance") {
    selectedMTDMembers[index].appliance = "";
    selectedMTDMembers[index].otherAppliance = "";
  }

  renderMTDMembers();
}

function updateMTDAppliance(index, value) {
  selectedMTDMembers[index].appliance = value;

  if (value !== "Other") {
    selectedMTDMembers[index].otherAppliance = "";
  }

  renderMTDMembers();
}

function setMTDOIC(index, checked) {
  const existingConn = selectedConnewarreMembers.findIndex(m => m.isOIC);
  const existingMTD = selectedMTDMembers.findIndex(m => m.isOIC);

  if (checked) {
    if (existingConn !== -1 || (existingMTD !== -1 && existingMTD !== index)) {
      const replace = confirm("Only one OIC can be assigned. Replace the existing OIC?");
      if (!replace) {
        renderMTDMembers();
        return;
      }

      clearAllOICFlags();
    }

    selectedMTDMembers[index].isOIC = true;
  } else {
    selectedMTDMembers[index].isOIC = false;
  }

  renderConnewarreMembers();
  renderMTDMembers();
  refreshOICHeaderFromSelections();
}
