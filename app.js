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
  const tabs = ["incident-tab", "connewarre-tab", "mtd-tab", "send-tab", "profile-tab"];

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

/* Service worker */
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

  const pagerDate = document.getElementById("pager-date");
  const pagerTime = document.getElementById("pager-time");

  if (pagerDate && !pagerDate.value) {
    pagerDate.value = now.toISOString().split("T")[0];
  }

  if (pagerTime && !pagerTime.value) {
    pagerTime.value = now.toTimeString().slice(0, 5);
  }

  loadMembers();
  loadProfile();
  renderPastEvents();
  bindSASUpload();
  bindCallTypeOverride();
  bindIncidentClassWatcher();
  updateEventIdPlaceholder();
  applyCallTypeUI();
  applyIncidentClassUI();

  const preview = localStorage.getItem("savedReportPreview");
  const previewField = document.getElementById("report-preview");
  if (preview && previewField) {
    previewField.value = preview;
  }
});

/* Profile and settings */
function getStoredProfile() {
  const raw = localStorage.getItem("turnoutProfile");
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function getStoredSettings() {
  const raw = localStorage.getItem("turnoutSettings");
  if (!raw) {
    return { secretaryEmail: "" };
  }

  try {
    return JSON.parse(raw);
  } catch {
    return { secretaryEmail: "" };
  }
}

function saveProfile() {
  const profile = {
    name: document.getElementById("profile-name")?.value.trim() || "",
    number: document.getElementById("profile-number")?.value.trim() || "",
    brigade: document.getElementById("profile-brigade")?.value || "",
    role: document.getElementById("profile-role")?.value || ""
  };

  const settings = {
    secretaryEmail: document.getElementById("secretary-email")?.value.trim() || ""
  };

  localStorage.setItem("turnoutProfile", JSON.stringify(profile));
  localStorage.setItem("turnoutSettings", JSON.stringify(settings));

  updateProfileDisplays(profile, settings);
  alert("Profile saved");
}

function loadProfile() {
  const profile = getStoredProfile();
  const settings = getStoredSettings();

  const nameField = document.getElementById("profile-name");
  const numberField = document.getElementById("profile-number");
  const brigadeField = document.getElementById("profile-brigade");
  const roleField = document.getElementById("profile-role");
  const secretaryEmailField = document.getElementById("secretary-email");

  if (profile) {
    if (nameField) nameField.value = profile.name || "";
    if (numberField) numberField.value = profile.number || "";
    if (brigadeField) brigadeField.value = profile.brigade || "";
    if (roleField) roleField.value = profile.role || "";
  }

  if (secretaryEmailField) {
    secretaryEmailField.value = settings.secretaryEmail || "";
  }

  updateProfileDisplays(profile, settings);
}

function updateProfileDisplays(profile, settings) {
  const safeProfile = profile || {
    name: "",
    number: "",
    brigade: "",
    role: ""
  };

  const safeSettings = settings || {
    secretaryEmail: ""
  };

  const profileName = document.getElementById("profile-name-display");
  const profileNumber = document.getElementById("profile-number-display");
  const profileBrigade = document.getElementById("profile-brigade-display");
  const profileRole = document.getElementById("profile-role-display");

  const authorName = document.getElementById("author-name-display");
  const authorNumber = document.getElementById("author-number-display");
  const authorBrigade = document.getElementById("author-brigade-display");
  const authorRole = document.getElementById("author-role-display");

  const secretaryLabel = document.getElementById("secretary-email-display");

  const nameText = safeProfile.name || "Not saved";
  const numberText = safeProfile.number || "Not saved";
  const brigadeText = safeProfile.brigade || "Not saved";
  const roleText = safeProfile.role || "Not saved";

  if (profileName) profileName.textContent = nameText;
  if (profileNumber) profileNumber.textContent = numberText;
  if (profileBrigade) profileBrigade.textContent = brigadeText;
  if (profileRole) profileRole.textContent = roleText;

  if (authorName) authorName.textContent = nameText;
  if (authorNumber) authorNumber.textContent = numberText;
  if (authorBrigade) authorBrigade.textContent = brigadeText;
  if (authorRole) authorRole.textContent = roleText;

  if (secretaryLabel) {
    secretaryLabel.textContent = safeSettings.secretaryEmail || "Not saved";
  }
}

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

/* Incident helpers */
function getEventId() {
  return document.getElementById("event-id")?.value.trim() || "";
}

function getFirsCode() {
  return document.getElementById("firs-code")?.value.trim() || "";
}

function getPagerDate() {
  return document.getElementById("pager-date")?.value || "";
}

function getPagerTime() {
  return document.getElementById("pager-time")?.value || "";
}

function getAddress() {
  return document.getElementById("incident-address")?.value.trim() || "";
}

function getIncidentType() {
  return document.getElementById("incident-type")?.value.trim() || "";
}

function getIncidentClass() {
  return document.getElementById("incident-class")?.value.trim() || "";
}

function getOtherAgencies() {
  return document.getElementById("other-agencies")?.value.trim() || "";
}

function getStreetNameFromAddress(address) {
  if (!address) {
    return "Unknown Street";
  }

  const cleaned = address.replace(/\s+/g, " ").trim();
  const firstPart = cleaned.split(",")[0].trim();
  const words = firstPart.split(" ").filter(Boolean);

  if (words.length === 0) {
    return "Unknown Street";
  }

  if (/^\d+[A-Za-z]?$/.test(words[0])) {
    return words.slice(1).join(" ") || "Unknown Street";
  }

  return firstPart || "Unknown Street";
}

function formatDisplayDate(dateStr) {
  if (!dateStr) {
    return "Unknown Date";
  }

  const parts = dateStr.split("-");
  if (parts.length !== 3) {
    return dateStr;
  }

  if (parts[0].length === 4) {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${parts[2]} ${months[parseInt(parts[1], 10) - 1]} ${parts[0]}`;
  }

  return dateStr;
}

function updateEventIdPlaceholder() {
  const pagerDate = getPagerDate();
  const eventField = document.getElementById("event-id");

  if (!eventField || !pagerDate) {
    return;
  }

  const [year, month] = pagerDate.split("-");
  if (!year || !month) {
    return;
  }

  const shortYear = year.slice(2);
  eventField.placeholder = `F${shortYear}${month}_____`;
}

/* Call type and incident class helpers */
function detectCallTypeFromCode(code) {
  const clean = (code || "").toUpperCase().trim();

  if (/^CONN[1-9]\b/.test(clean) || /^CONN[1-9]/.test(clean)) {
    return "Primary";
  }

  if (clean) {
    return "Support";
  }

  return "";
}

function getFinalCallType() {
  const override = document.getElementById("call-type-override")?.value || "";
  if (override) {
    return override;
  }

  return document.getElementById("call-type")?.value || "";
}

function applyCallTypeUI() {
  const finalType = getFinalCallType();
  const firsWrap = document.getElementById("firs-code-wrap");

  if (!firsWrap) {
    return;
  }

  firsWrap.style.display = finalType === "Support" ? "none" : "block";
}

function bindCallTypeOverride() {
  const override = document.getElementById("call-type-override");
  if (!override) {
    return;
  }

  override.addEventListener("change", () => {
    applyCallTypeUI();
  });
}

function applyIncidentClassUI() {
  const incidentClass = (getIncidentClass() || "").toUpperCase();
  const mvaSection = document.getElementById("mva-section");

  if (!mvaSection) {
    return;
  }

  mvaSection.style.display = incidentClass === "MVA" ? "block" : "none";
}

function bindIncidentClassWatcher() {
  const incidentClassField = document.getElementById("incident-class");
  if (!incidentClassField) {
    return;
  }

  incidentClassField.addEventListener("input", () => {
    applyIncidentClassUI();
  });
}

/* SAS upload and OCR */
function bindSASUpload() {
  const upload = document.getElementById("sas-upload");
  const previewWrap = document.getElementById("sas-preview-wrap");
  const previewImg = document.getElementById("sas-preview");
  const status = document.getElementById("sas-status");

  if (!upload || !previewWrap || !previewImg || !status) {
    return;
  }

  upload.addEventListener("change", async event => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setSASStatus("Preparing screenshot...");
    previewSASImage(file);

    try {
      const croppedBlob = await cropAlertCardFromImage(file);
      setSASStatus("Running OCR...");
      const text = await runSASOCR(croppedBlob);
      applyOCRToIncidentFields(text);
    } catch (err) {
      console.log("OCR failed", err);
      setSASStatus("OCR failed. Enter details manually.");
    }
  });
}

function previewSASImage(file) {
  const previewWrap = document.getElementById("sas-preview-wrap");
  const previewImg = document.getElementById("sas-preview");

  if (!previewWrap || !previewImg) {
    return;
  }

  const reader = new FileReader();
  reader.onload = function (e) {
    previewImg.src = e.target.result;
    previewWrap.style.display = "block";
  };
  reader.readAsDataURL(file);
}

function setSASStatus(message) {
  const status = document.getElementById("sas-status");
  if (status) {
    status.textContent = message;
  }
}

function loadImageFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = function (e) {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = e.target.result;
    };

    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function isRedPixel(r, g, b) {
  return r > 130 && g < 110 && b < 110 && (r - g) > 35 && (r - b) > 35;
}

function findLargestRedBounds(ctx, width, height) {
  const imageData = ctx.getImageData(0, 0, width, height).data;

  const topCrop = Math.floor(height * 0.22);
  const bottomCrop = Math.floor(height * 0.80);

  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  let found = false;

  for (let y = topCrop; y < bottomCrop; y++) {
    for (let x = 0; x < width; x++) {
      const index = (y * width + x) * 4;
      const r = imageData[index];
      const g = imageData[index + 1];
      const b = imageData[index + 2];

      if (isRedPixel(r, g, b)) {
        found = true;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (!found) {
    return null;
  }

  return {
    x: Math.max(0, minX - Math.floor(width * 0.02)),
    y: Math.max(0, minY - Math.floor(height * 0.01)),
    width: Math.min(width, maxX - minX + Math.floor(width * 0.04)),
    height: Math.min(height, maxY - minY + Math.floor(height * 0.02))
  };
}

function preprocessCanvas(sourceCanvas) {
  const canvas = document.createElement("canvas");
  canvas.width = sourceCanvas.width;
  canvas.height = sourceCanvas.height;

  const ctx = canvas.getContext("2d");
  ctx.drawImage(sourceCanvas, 0, 0);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    let gray = 0.299 * r + 0.587 * g + 0.114 * b;
    gray = gray < 145 ? 0 : 255;

    data[i] = gray;
    data[i + 1] = gray;
    data[i + 2] = gray;
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

async function cropAlertCardFromImage(file) {
  const img = await loadImageFile(file);

  const baseCanvas = document.createElement("canvas");
  const maxWidth = 1000;
  const scale = Math.min(1, maxWidth / img.width);

  baseCanvas.width = Math.floor(img.width * scale);
  baseCanvas.height = Math.floor(img.height * scale);

  const baseCtx = baseCanvas.getContext("2d");
  baseCtx.drawImage(img, 0, 0, baseCanvas.width, baseCanvas.height);

  const bounds = findLargestRedBounds(baseCtx, baseCanvas.width, baseCanvas.height);

  let cropX;
  let cropY;
  let cropWidth;
  let cropHeight;

  if (bounds) {
    cropX = bounds.x;
    cropY = bounds.y;
    cropWidth = bounds.width;
    cropHeight = bounds.height;
  } else {
    cropX = Math.floor(baseCanvas.width * 0.06);
    cropY = Math.floor(baseCanvas.height * 0.30);
    cropWidth = Math.floor(baseCanvas.width * 0.88);
    cropHeight = Math.floor(baseCanvas.height * 0.18);
  }

  const cropCanvas = document.createElement("canvas");
  cropCanvas.width = cropWidth;
  cropCanvas.height = cropHeight;

  const cropCtx = cropCanvas.getContext("2d");
  cropCtx.drawImage(
    baseCanvas,
    cropX, cropY, cropWidth, cropHeight,
    0, 0, cropWidth, cropHeight
  );

  const processedCanvas = preprocessCanvas(cropCanvas);

  return new Promise(resolve => {
    processedCanvas.toBlob(blob => resolve(blob), "image/png");
  });
}

async function runSASOCR(imageBlob) {
  const result = await Tesseract.recognize(imageBlob, "eng", {
    logger: m => {
      if (m.status === "recognizing text") {
        setSASStatus(`Running OCR... ${Math.round((m.progress || 0) * 100)}%`);
      }
    }
  });

  return result.data.text || "";
}

function normalizeOCRText(text) {
  return (text || "")
    .replace(/\r/g, "\n")
    .replace(/[|]/g, "I")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\t/g, " ")
    .replace(/[ ]{2,}/g, " ")
    .replace(/O(?=\d)/g, "0")
    .replace(/(?<=\d)O/g, "0")
    .trim();
}

function extractDetectedCode(text) {
  const upper = text.toUpperCase().replace(/\s+/g, "");
  const match = upper.match(/CONN[1-9]/);
  return match ? match[0] : "";
}

function extractEventId(text) {
  const upper = text.toUpperCase().replace(/\s+/g, "");
  const match = upper.match(/F\d{9}/);
  return match ? match[0] : "";
}

function extractTimeFromTopLine(text) {
  const lines = text.split(/\n+/).map(line => line.trim()).filter(Boolean);
  const target = lines[0] || text;
  const match = target.match(/\b([01]?\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?\b/);

  if (!match) {
    return "";
  }

  return `${match[1].padStart(2, "0")}:${match[2]}`;
}

function extractDate(text) {
  const match = text.match(/\b(\d{2})-(\d{2})-(\d{4})\b/);
  if (!match) {
    return "";
  }

  const dd = match[1];
  const mm = match[2];
  const yyyy = match[3];

  return `${yyyy}-${mm}-${dd}`;
}

function cleanAddressLine(line) {
  if (!line) {
    return "";
  }

  return line
    .replace(/\/[A-Z0-9\s.'-]+$/i, "")
    .replace(/\bM\s*\d+\b.*$/i, "")
    .replace(/\([^)]+\)/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function extractAddress(text) {
  const lines = (text || "")
    .split(/\n+/)
    .map(line => line.trim())
    .filter(Boolean);

  const addressLine = lines.find(line => /^\d+[A-Za-z]?\s+/.test(line));
  if (addressLine) {
    return cleanAddressLine(addressLine);
  }

  return "";
}

function extractIncidentClass(text) {
  const upper = text.toUpperCase();

  const known = ["MVA", "STRU", "ALAR", "ALARM", "NSTR", "INCI", "G&SC"];
  for (const code of known) {
    if (upper.includes(code)) {
      return code === "ALARM" ? "ALAR" : code;
    }
  }

  return "";
}

function extractIncidentType(text, incidentClass) {
  if (incidentClass === "MVA") return "MVA";
  if (incidentClass === "STRU") return "STRU";
  if (incidentClass === "ALAR") return "Alarm";
  if (incidentClass === "NSTR") return "NSTR";
  if (incidentClass === "INCI") return "INCI";
  if (incidentClass === "G&SC") return "G&SC";

  const upper = text.toUpperCase();
  if (upper.includes("EMERGENCY")) return "Emergency";

  return "";
}

function extractOtherAgencies(text) {
  const upper = text.toUpperCase();
  const knownAgencies = ["AFP", "AV", "SES", "FRV", "VICPOL", "POLICE"];

  const found = knownAgencies.filter(code => {
    const pattern = new RegExp(`\\b${code}\\b`);
    return pattern.test(upper);
  });

  return found.join(", ");
}

function applyOCRToIncidentFields(rawText) {
  const text = normalizeOCRText(rawText);

  const detectedCode = extractDetectedCode(text);
  const detectedCallType = detectCallTypeFromCode(detectedCode);
  const detectedEventId = extractEventId(text);
  const detectedTime = extractTimeFromTopLine(text);
  const detectedDate = extractDate(text);
  const detectedAddress = extractAddress(rawText);
  const detectedIncidentClass = extractIncidentClass(text);
  const detectedIncidentType = extractIncidentType(text, detectedIncidentClass);
  const detectedAgencies = extractOtherAgencies(text);

  const codeField = document.getElementById("detected-brigade-code");
  const callTypeField = document.getElementById("call-type");
  const eventIdField = document.getElementById("event-id");
  const typeField = document.getElementById("incident-type");
  const classField = document.getElementById("incident-class");
  const addressField = document.getElementById("incident-address");
  const pagerDateField = document.getElementById("pager-date");
  const pagerTimeField = document.getElementById("pager-time");
  const agenciesField = document.getElementById("other-agencies");

  if (codeField) codeField.value = detectedCode;
  if (callTypeField) callTypeField.value = detectedCallType;
  if (eventIdField && detectedEventId) eventIdField.value = detectedEventId;
  if (classField && detectedIncidentClass) classField.value = detectedIncidentClass;
  if (typeField && detectedIncidentType && !typeField.value.trim()) typeField.value = detectedIncidentType;
  if (addressField && detectedAddress) addressField.value = detectedAddress;
  if (pagerDateField && detectedDate) pagerDateField.value = detectedDate;
  if (pagerTimeField && detectedTime) pagerTimeField.value = detectedTime;
  if (agenciesField && detectedAgencies) agenciesField.value = detectedAgencies;

  updateEventIdPlaceholder();
  applyCallTypeUI();
  applyIncidentClassUI();

  const summaryParts = [];
  if (detectedCode) summaryParts.push(`Code: ${detectedCode}`);
  if (detectedCallType) summaryParts.push(`Call Type: ${detectedCallType}`);
  if (detectedEventId) summaryParts.push(`Event ID: ${detectedEventId}`);
  if (detectedIncidentClass) summaryParts.push(`Class: ${detectedIncidentClass}`);
  if (detectedDate) summaryParts.push("Date captured");
  if (detectedTime) summaryParts.push("Time captured");
  if (detectedAddress) summaryParts.push("Address filled");
  if (detectedAgencies) summaryParts.push(`Agencies: ${detectedAgencies}`);

  if (summaryParts.length) {
    setSASStatus(`OCR complete. ${summaryParts.join(" | ")}`);
  } else {
    setSASStatus("OCR complete, but the alert card could not be read clearly.");
  }
}

/* Validation helpers */
function getCurrentOIC() {
  const connOIC = selectedConnewarreMembers.find(member => member.isOIC);
  const mtdOIC = selectedMTDMembers.find(member => member.isOIC);
  return connOIC || mtdOIC || null;
}

function hasAnyMembers() {
  return selectedConnewarreMembers.length > 0 || selectedMTDMembers.length > 0;
}

function validateReportRequirements() {
  if (!getEventId()) {
    alert("Event ID required");
    showTab("incident-tab");
    return false;
  }

  if (!hasAnyMembers()) {
    alert("At least one attending member is required");
    showTab("connewarre-tab");
    return false;
  }

  if (!getCurrentOIC()) {
    alert("OIC required");
    return false;
  }

  return true;
}

function isQuietHours() {
  const now = new Date();
  const hour = now.getHours();
  return hour >= 22 || hour < 7;
}

/* Report grouping helpers */
function groupByAppliance(members, prefix) {
  const groups = {};

  members.forEach(member => {
    if (member.attribution !== "Appliance") {
      return;
    }

    let applianceName = member.appliance || "Unknown Appliance";

    if (applianceName === "Other") {
      applianceName = member.otherAppliance || "Other Appliance";
    }

    const fullName = prefix ? `${prefix} ${applianceName}` : applianceName;

    if (!groups[fullName]) {
      groups[fullName] = [];
    }

    groups[fullName].push(member);
  });

  return groups;
}

function sortCrewByTask(members) {
  const order = {
    "Crew Leader": 1,
    "Driver": 2,
    "Crew": 3
  };

  return [...members].sort((a, b) => {
    const aOrder = order[a.task] || 99;
    const bOrder = order[b.task] || 99;
    return aOrder - bOrder;
  });
}

function formatGroupedApplianceSection() {
  const lines = [];

  const connGroups = groupByAppliance(selectedConnewarreMembers, "CONN");
  const mtdGroups = groupByAppliance(selectedMTDMembers, "");

  const mergedGroups = { ...connGroups, ...mtdGroups };
  const groupNames = Object.keys(mergedGroups);

  if (groupNames.length === 0) {
    lines.push("APPLIANCE CREWS");
    lines.push("None recorded");
    lines.push("");
    return lines;
  }

  groupNames.forEach(groupName => {
    lines.push(groupName);

    const sortedMembers = sortCrewByTask(mergedGroups[groupName]);
    sortedMembers.forEach(member => {
      const label = member.task || "Crew";
      let detail = `${label} – ${member.name || "Unnamed Member"}`;

      if (member.baUsed) detail += " – BA Used";
      if (member.injured) detail += " – Injured";

      lines.push(detail);
    });

    lines.push("");
  });

  return lines;
}

function formatStationAndDirectSection() {
  const stationLines = [];
  const directLines = [];

  const allMembers = [
    ...selectedConnewarreMembers,
    ...selectedMTDMembers
  ];

  allMembers.forEach(member => {
    const displayName = member.brigade && member.brigade !== "Connewarre"
      ? `${member.name || "Unnamed Member"} (${member.brigade})`
      : `${member.name || "Unnamed Member"}`;

    let line = displayName;

    if (member.baUsed) line += " – BA Used";
    if (member.injured) line += " – Injured";

    if (member.attribution === "Station") stationLines.push(line);
    if (member.attribution === "Direct") directLines.push(line);
  });

  const output = [];

  output.push("STATION");
  output.push(...(stationLines.length ? stationLines : ["None recorded"]));
  output.push("");

  output.push("DIRECT");
  output.push(...(directLines.length ? directLines : ["None recorded"]));

  return output;
}

/* Report building */
function buildReportText() {
  const eventId = getEventId();
  const pagerDate = getPagerDate();
  const pagerTime = getPagerTime();
  const firsCode = getFirsCode();
  const address = getAddress();
  const incidentType = getIncidentType();
  const incidentClass = getIncidentClass();
  const callType = getFinalCallType();
  const otherAgencies = getOtherAgencies();
  const oic = getCurrentOIC();
  const profile = getStoredProfile();

  const vehicle1 = document.getElementById("vehicle-1")?.value.trim() || "";
  const vehicle2 = document.getElementById("vehicle-2")?.value.trim() || "";
  const vehicleNotes = document.getElementById("vehicle-notes")?.value.trim() || "";

  const applianceLines = formatGroupedApplianceSection();
  const stationDirectLines = formatStationAndDirectSection();

  const baseLines = [
    `EVENT ID: ${eventId || "Not entered"}`,
    `PAGER DATE: ${pagerDate || "Not entered"}`,
    `PAGER TIME: ${pagerTime || "Not entered"}`,
    `INCIDENT CLASS: ${incidentClass || "Not entered"}`,
    `TYPE: ${incidentType || "Not entered"}`,
    `CALL TYPE: ${callType || "Not entered"}`,
    `ADDRESS: ${address || "Not entered"}`,
    `OTHER AGENCIES: ${otherAgencies || "None recorded"}`
  ];

  if (callType !== "Support") {
    baseLines.push(`FIRS CODE: ${firsCode || "Not entered"}`);
  }

  if ((incidentClass || "").toUpperCase() === "MVA") {
    baseLines.push(
      "",
      "VEHICLE REPORT",
      `Vehicle 1: ${vehicle1 || "Not entered"}`,
      `Vehicle 2: ${vehicle2 || "Not entered"}`,
      `Other Vehicle / Notes: ${vehicleNotes || "Not entered"}`
    );
  }

  baseLines.push(
    "",
    `OIC: ${oic ? oic.name : "Not assigned"}`,
    `PHONE: ${oic ? (oic.phone || "______") : "______"}`,
    "",
    ...applianceLines,
    ...stationDirectLines,
    "",
    `REPORT AUTHOR: ${profile?.name || "Not saved"}`,
    `CFA MEMBER NUMBER: ${profile?.number || "Not saved"}`,
    `AUTHOR BRIGADE: ${profile?.brigade || "Not saved"}`,
    `AUTHOR ROLE: ${profile?.role || "Not saved"}`
  );

  return baseLines.join("\n");
}

function generateReport() {
  if (!validateReportRequirements()) {
    return;
  }

  const report = buildReportText();
  const preview = document.getElementById("report-preview");

  if (preview) {
    preview.value = report;
  }

  localStorage.setItem("savedReportPreview", report);
}

function copyReport() {
  const preview = document.getElementById("report-preview");

  if (!preview || !preview.value.trim()) {
    alert("Generate the report first.");
    return;
  }

  navigator.clipboard.writeText(preview.value)
    .then(() => {
      alert("Report copied to clipboard");
    })
    .catch(() => {
      alert("Copy failed");
    });
}

/* Past events */
function buildPastEventTitle(reportText) {
  const lines = reportText.split("\n");

  const typeLine = lines.find(line => line.startsWith("TYPE: "));
  const addressLine = lines.find(line => line.startsWith("ADDRESS: "));
  const dateLine = lines.find(line => line.startsWith("PAGER DATE: "));

  const type = typeLine ? typeLine.replace("TYPE: ", "").trim() : "Unknown Type";
  const address = addressLine ? addressLine.replace("ADDRESS: ", "").trim() : "";
  const date = dateLine ? dateLine.replace("PAGER DATE: ", "").trim() : "Unknown Date";

  const streetName = getStreetNameFromAddress(address);

  return `${type || "Unknown Type"} – ${streetName} – ${formatDisplayDate(date)}`;
}

function getSavedReports() {
  try {
    return JSON.parse(localStorage.getItem("savedReports") || "[]");
  } catch {
    return [];
  }
}

function saveReportLocally() {
  const report = buildReportText();
  const eventId = getEventId();

  localStorage.setItem("savedReportPreview", report);

  const savedReports = getSavedReports();
  savedReports.unshift({
    savedAt: new Date().toISOString(),
    eventId: eventId,
    title: buildPastEventTitle(report),
    reportText: report
  });

  localStorage.setItem("savedReports", JSON.stringify(savedReports));

  const preview = document.getElementById("report-preview");
  if (preview) {
    preview.value = report;
  }

  renderPastEvents();
  alert("Report saved locally");
}

function renderPastEvents() {
  const list = document.getElementById("past-events-list");
  if (!list) {
    return;
  }

  list.innerHTML = "";

  const savedReports = getSavedReports();

  if (savedReports.length === 0) {
    list.innerHTML = "<p>No past events saved.</p>";
    return;
  }

  savedReports.forEach((item, index) => {
    const wrapper = document.createElement("div");
    wrapper.className = "member-card";

    wrapper.innerHTML = `
      <h4>${item.title || "Untitled Report"}</h4>
      <div>${item.eventId || "No Event ID"}</div>
      <button type="button" onclick="loadSavedReport(${index})">Open Report</button>
      <button type="button" onclick="emailSavedReportToSecretary(${index})">Email Secretary</button>
    `;

    list.appendChild(wrapper);
  });
}

function loadSavedReport(index) {
  const savedReports = getSavedReports();
  const item = savedReports[index];

  if (!item) {
    return;
  }

  const preview = document.getElementById("report-preview");
  if (preview) {
    preview.value = item.reportText || "";
  }

  localStorage.setItem("savedReportPreview", item.reportText || "");
  showTab("send-tab");
}

function emailSavedReportToSecretary(index) {
  const savedReports = getSavedReports();
  const item = savedReports[index];

  if (!item) {
    return;
  }

  const settings = getStoredSettings();
  const secretaryEmail = settings?.secretaryEmail || "";

  const subject = encodeURIComponent(`Turnout Report – ${item.title || item.eventId || "Saved Report"}`);
  const body = encodeURIComponent(item.reportText || "");

  const mailto = secretaryEmail
    ? `mailto:${secretaryEmail}?subject=${subject}&body=${body}`
    : `mailto:?subject=${subject}&body=${body}`;

  window.location.href = mailto;
}

/* Send/save workflow */
async function sendReportNow() {
  const report = buildReportText();
  const preview = document.getElementById("report-preview");

  if (preview) {
    preview.value = report;
  }

  localStorage.setItem("savedReportPreview", report);

  if (navigator.share) {
    try {
      await navigator.share({
        title: "Turnout Report",
        text: report
      });
      return;
    } catch (err) {
      console.log("Share cancelled or failed", err);
    }
  }

  try {
    await navigator.clipboard.writeText(report);
    alert("Report copied to clipboard. Paste it into your SMS or email.");
  } catch {
    alert("Unable to send directly. Copy the report manually.");
  }
}

function emailCurrentReportToSecretary() {
  if (!validateReportRequirements()) {
    return;
  }

  const report = buildReportText();
  const settings = getStoredSettings();
  const secretaryEmail = settings?.secretaryEmail || "";

  const eventId = getEventId();
  const title = buildPastEventTitle(report);

  const subject = encodeURIComponent(`Turnout Report – ${title} – ${eventId || "No Event ID"}`);
  const body = encodeURIComponent(report);

  const mailto = secretaryEmail
    ? `mailto:${secretaryEmail}?subject=${subject}&body=${body}`
    : `mailto:?subject=${subject}&body=${body}`;

  window.location.href = mailto;
}

function quietHoursPrompt() {
  const sendNow = confirm(
    "Does this report need to be sent now?\n\n" +
    "Yes = send now\n" +
    "Cancel = choose Save to local or Return to report"
  );

  if (sendNow) {
    sendReportNow();
    return;
  }

  const saveLocal = confirm(
    "Would you like to save this report to local storage?\n\n" +
    "Yes = Save to local\n" +
    "Cancel = Return to report"
  );

  if (saveLocal) {
    saveReportLocally();
  } else {
    showTab("incident-tab");
  }
}

function handleSendAction() {
  if (!validateReportRequirements()) {
    return;
  }

  generateReport();

  if (isQuietHours()) {
    quietHoursPrompt();
    return;
  }

  const sendNow = confirm(
    "Does this report need to be sent now?\n\n" +
    "Yes = send now\n" +
    "Cancel = choose Save to local or Return to report"
  );

  if (sendNow) {
    sendReportNow();
    return;
  }

  const saveLocal = confirm(
    "Would you like to save this report to local storage?\n\n" +
    "Yes = Save to local\n" +
    "Cancel = Return to report"
  );

  if (saveLocal) {
    saveReportLocally();
  } else {
    showTab("incident-tab");
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
    otherAppliance: "",
    task: "",
    isOIC: false,
    baUsed: false,
    injured: false
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

      ${member.attribution === "Appliance" && member.appliance === "Other" ? `
        <label>Other Appliance</label>
        <input type="text" value="${member.otherAppliance || ""}" onchange="updateConnMember(${index}, 'otherAppliance', this.value)">
      ` : ""}

      <label>Crew Task</label>
      <select onchange="updateConnMember(${index}, 'task', this.value)">
        <option value="">Select</option>
        <option value="Driver" ${member.task === "Driver" ? "selected" : ""}>Driver</option>
        <option value="Crew Leader" ${member.task === "Crew Leader" ? "selected" : ""}>Crew Leader</option>
        <option value="Crew" ${member.task === "Crew" ? "selected" : ""}>Crew</option>
      </select>

      <label>
        <input type="checkbox" ${member.baUsed ? "checked" : ""} onchange="updateConnMember(${index}, 'baUsed', this.checked)">
        BA Used
      </label>

      <label>
        <input type="checkbox" ${member.injured ? "checked" : ""} onchange="updateConnMember(${index}, 'injured', this.checked)">
        Injured
      </label>

      <label>
        <input type="checkbox" ${member.isOIC ? "checked" : ""} onchange="setConnewarreOIC(${index}, this.checked)">
        Incident OIC
      </label>

      <button type="button" onclick="removeConnewarreMember(${index})">Remove Member</button>
    `;

    container.appendChild(card);
  });
}

function updateConnMember(index, field, value) {
  selectedConnewarreMembers[index][field] = value;
  renderConnewarreMembers();
}

function removeConnewarreMember(index) {
  const removedMember = selectedConnewarreMembers[index];

  selectedConnewarreMembers.splice(index, 1);

  if (removedMember && removedMember.isOIC) {
    refreshOICHeaderFromSelections();
  }

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
    isOIC: false,
    baUsed: false,
    injured: false
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
    manualEntry: true,
    baUsed: false,
    injured: false
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
        <input type="checkbox" ${member.baUsed ? "checked" : ""} onchange="updateMTDMember(${index}, 'baUsed', this.checked)">
        BA Used
      </label>

      <label>
        <input type="checkbox" ${member.injured ? "checked" : ""} onchange="updateMTDMember(${index}, 'injured', this.checked)">
        Injured
      </label>

      <label>
        <input type="checkbox" ${member.isOIC ? "checked" : ""} onchange="setMTDOIC(${index}, this.checked)">
        Incident OIC
      </label>

      <button type="button" onclick="removeMTDMember(${index})">Remove Member</button>
    `;

    container.appendChild(card);
  });
}

function updateMTDMember(index, field, value) {
  selectedMTDMembers[index][field] = value;
  renderMTDMembers();
}

function removeMTDMember(index) {
  const removedMember = selectedMTDMembers[index];

  selectedMTDMembers.splice(index, 1);

  if (removedMember && removedMember.isOIC) {
    refreshOICHeaderFromSelections();
  }

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
    if ((existingConn !== -1 && existingConn !== index) || existingMTD !== -1) {
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
