// Connewarre Turnout Reporter - cleaned app.js
// Refactor goals:
// - centralise state
// - isolate OCR parsing from UI wiring
// - validate extracted fields before submit
// - support multiple agencies
// - infer incident type and code from first message line
// - expose MVA-specific UI when incident details suggest a vehicle crash

const App = (() => {
  'use strict';

  const CONFIG = {
    incidentTypes: ['ALAR', 'STRU', 'NONS', 'INCI', 'G&SC'],
    codeLevels: ['C1', 'C3'],
    defaultAgency: 'CFA',
    minOcrConfidence: 0.6,
    selectors: {
      uploadInput: '#imageUpload',
      previewImage: '#previewImage',
      status: '#statusMessage',
      parseButton: '#parseButton',
      submitButton: '#submitButton',
      resetButton: '#resetButton',
      addAgencyButton: '#addAgencyButton',
      agencyContainer: '#agencyContainer',
      validationList: '#validationList',
      rawText: '#rawText',
      debugBox: '#debugBox',

      form: {
        date: '#incidentDate',
        time: '#incidentTime',
        address: '#incidentAddress',
        suburb: '#incidentSuburb',
        incidentType: '#incidentType',
        codeLevel: '#codeLevel',
        incidentClass: '#incidentClass',
        callSign: '#callSign',
        jobNumber: '#jobNumber',
        mvaSection: '#mvaSection',
        mvaToggle: '#isMVA',
      }
    }
  };

  const state = {
    imageFile: null,
    rawText: '',
    parsed: createEmptyParsedState(),
    agencies: [createAgency(CONFIG.defaultAgency)],
    validationErrors: [],
    validationWarnings: [],
    lastOcrMeta: null,
  };

  function createEmptyParsedState() {
    return {
      emergencyLine: '',
      firstContentLine: '',
      incidentDate: '',
      incidentTime: '',
      address: '',
      suburb: '',
      incidentType: '',
      codeLevel: '',
      incidentClass: '',
      callSign: '',
      jobNumber: '',
      isMVA: false,
      confidence: 0,
      lines: []
    };
  }

  function createAgency(name = '') {
    return {
      id: crypto.randomUUID ? crypto.randomUUID() : `agency-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      name,
      unit: '',
      role: ''
    };
  }

  function init() {
    bindEvents();
    render();
    setStatus('Ready');
  }

  function bindEvents() {
    const uploadInput = qs(CONFIG.selectors.uploadInput);
    const parseButton = qs(CONFIG.selectors.parseButton);
    const submitButton = qs(CONFIG.selectors.submitButton);
    const resetButton = qs(CONFIG.selectors.resetButton);
    const addAgencyButton = qs(CONFIG.selectors.addAgencyButton);

    uploadInput?.addEventListener('change', onImageSelected);
    parseButton?.addEventListener('click', onParseClicked);
    submitButton?.addEventListener('click', onSubmitClicked);
    resetButton?.addEventListener('click', onResetClicked);
    addAgencyButton?.addEventListener('click', onAddAgencyClicked);

    bindFormListeners();
  }

  function bindFormListeners() {
    Object.values(CONFIG.selectors.form).forEach((selector) => {
      const element = qs(selector);
      if (!element) return;

      element.addEventListener('input', syncFormToState);
      element.addEventListener('change', syncFormToState);
    });
  }

  async function onImageSelected(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    state.imageFile = file;
    previewImage(file);
    setStatus(`Loaded ${file.name}`);
  }

  async function onParseClicked() {
    if (!state.imageFile) {
      setStatus('Please upload a turnout image first.', 'error');
      return;
    }

    setStatus('Running OCR and checking extracted fields...');

    try {
      const { text, meta } = await runOCR(state.imageFile);
      state.rawText = normaliseText(text);
      state.lastOcrMeta = meta;

      const parsed = parseTurnoutMessage(state.rawText);
      state.parsed = parsed;
      syncStateToForm();
      validateParsedData();
      render();

      const summary = state.validationErrors.length
        ? `OCR complete with ${state.validationErrors.length} issue(s) to review.`
        : 'OCR complete. Review looks good.';

      setStatus(summary, state.validationErrors.length ? 'warn' : 'success');
    } catch (error) {
      console.error(error);
      setStatus('OCR failed. Check console and image quality.', 'error');
    }
  }

  function onSubmitClicked(event) {
    event.preventDefault();
    syncFormToState();
    validateParsedData();
    render();

    if (state.validationErrors.length) {
      setStatus('Fix validation issues before submitting.', 'error');
      return;
    }

    const payload = buildSubmissionPayload();
    console.log('Submission payload:', payload);
    setStatus('Validation passed. Payload ready for submission.', 'success');

    // Replace this block with your existing save/send logic.
    // submitTurnout(payload);
  }

  function onResetClicked() {
    state.imageFile = null;
    state.rawText = '';
    state.parsed = createEmptyParsedState();
    state.agencies = [createAgency(CONFIG.defaultAgency)];
    state.validationErrors = [];
    state.validationWarnings = [];
    state.lastOcrMeta = null;

    resetForm();
    render();
    setStatus('Reset complete');
  }

  function onAddAgencyClicked() {
    state.agencies.push(createAgency(''));
    renderAgencies();
  }

  function syncFormToState() {
    state.parsed.incidentDate = getValue(CONFIG.selectors.form.date);
    state.parsed.incidentTime = getValue(CONFIG.selectors.form.time);
    state.parsed.address = getValue(CONFIG.selectors.form.address);
    state.parsed.suburb = getValue(CONFIG.selectors.form.suburb);
    state.parsed.incidentType = getValue(CONFIG.selectors.form.incidentType);
    state.parsed.codeLevel = getValue(CONFIG.selectors.form.codeLevel);
    state.parsed.incidentClass = getValue(CONFIG.selectors.form.incidentClass);
    state.parsed.callSign = getValue(CONFIG.selectors.form.callSign);
    state.parsed.jobNumber = getValue(CONFIG.selectors.form.jobNumber);
    state.parsed.isMVA = Boolean(qs(CONFIG.selectors.form.mvaToggle)?.checked);

    syncAgencyInputsToState();
  }

  function syncStateToForm() {
    setValue(CONFIG.selectors.form.date, state.parsed.incidentDate);
    setValue(CONFIG.selectors.form.time, state.parsed.incidentTime);
    setValue(CONFIG.selectors.form.address, state.parsed.address);
    setValue(CONFIG.selectors.form.suburb, state.parsed.suburb);
    setValue(CONFIG.selectors.form.incidentType, state.parsed.incidentType);
    setValue(CONFIG.selectors.form.codeLevel, state.parsed.codeLevel);
    setValue(CONFIG.selectors.form.incidentClass, state.parsed.incidentClass);
    setValue(CONFIG.selectors.form.callSign, state.parsed.callSign);
    setValue(CONFIG.selectors.form.jobNumber, state.parsed.jobNumber);

    const mvaToggle = qs(CONFIG.selectors.form.mvaToggle);
    if (mvaToggle) mvaToggle.checked = Boolean(state.parsed.isMVA);

    renderAgencies();
    toggleMVASection();
  }

  function parseTurnoutMessage(rawText) {
    const lines = rawText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    const emergencyLine = lines.find((line) => /emergency/i.test(line)) || '';
    const firstContentLine = findFirstContentLine(lines);
    const incidentCode = extractIncidentCode(firstContentLine);
    const incidentType = incidentCode.type || inferIncidentType(lines, rawText);
    const codeLevel = incidentCode.codeLevel || inferCodeLevel(firstContentLine);
    const addressParts = extractAddress(lines, rawText);
    const dateTime = extractDateTime(lines, rawText);
    const isMVA = detectMVA(lines, rawText, incidentType);

    return {
      emergencyLine,
      firstContentLine,
      incidentDate: dateTime.date,
      incidentTime: dateTime.time,
      address: addressParts.address,
      suburb: addressParts.suburb,
      incidentType,
      codeLevel,
      incidentClass: buildIncidentClass(incidentType, codeLevel),
      callSign: extractCallSign(lines, rawText),
      jobNumber: extractJobNumber(lines, rawText),
      isMVA,
      confidence: estimateConfidence({ dateTime, addressParts, incidentType, codeLevel }),
      lines
    };
  }

  function findFirstContentLine(lines) {
    const emergencyIndex = lines.findIndex((line) => /emergency/i.test(line));
    if (emergencyIndex >= 0 && lines[emergencyIndex + 1]) {
      return lines[emergencyIndex + 1];
    }

    return lines[0] || '';
  }

  function extractIncidentCode(line) {
    const compact = (line || '').replace(/\s+/g, '').toUpperCase();
    const match = compact.match(/(ALAR|STRU|NONS|INCI|G&SC)(C1|C3)/);

    return {
      type: match?.[1] || '',
      codeLevel: match?.[2] || ''
    };
  }

  function inferIncidentType(lines, rawText) {
    const text = `${lines.join(' ')} ${rawText}`.toUpperCase();

    if (/ALAR|ALARM/.test(text)) return 'ALAR';
    if (/STRU|STRUCTURE|HOUSE FIRE|BUILDING FIRE/.test(text)) return 'STRU';
    if (/NONS|NON[- ]?STRUCTURE/.test(text)) return 'NONS';
    if (/GRASS|SCRUB|G&SC|BUSH/.test(text)) return 'G&SC';
    if (/INCI|MVA|RESCUE|HAZMAT|INCIDENT/.test(text)) return 'INCI';

    return '';
  }

  function inferCodeLevel(line) {
    const match = (line || '').toUpperCase().match(/\b(C1|C3)\b/);
    return match?.[1] || '';
  }

  function extractDateTime(lines, rawText) {
    const text = `${lines.join(' ')} ${rawText}`;

    const dateMatch = text.match(/\b(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})\b/);
    const timeMatch = text.match(/\b(\d{1,2}:\d{2})(?:\s?(AM|PM))?\b/i);

    return {
      date: dateMatch?.[1] || '',
      time: [timeMatch?.[1], timeMatch?.[2]].filter(Boolean).join(' ')
    };
  }

  function extractAddress(lines, rawText) {
    const joined = lines.join('\n');
    const addressPatterns = [
      /address[:\s]+(.+)/i,
      /location[:\s]+(.+)/i,
      /incident at[:\s]+(.+)/i,
      /\b(\d{1,4}\s+[A-Z0-9 .'-]+\s(?:ROAD|RD|STREET|ST|AVENUE|AVE|DRIVE|DR|LANE|LN|COURT|CT|HIGHWAY|HWY|CRESCENT|CRES|PLACE|PL))\b/i
    ];

    let address = '';

    for (const pattern of addressPatterns) {
      const match = joined.match(pattern) || rawText.match(pattern);
      if (match?.[1]) {
        address = cleanAddress(match[1]);
        break;
      }
    }

    const suburb = extractSuburb(address || rawText);
    return { address, suburb };
  }

  function cleanAddress(value) {
    return (value || '')
      .replace(/\s{2,}/g, ' ')
      .replace(/[|]+/g, ' ')
      .trim();
  }

  function extractSuburb(text) {
    const suburbMatch = (text || '').match(/\b(CONNEWARRE|ARMSTRONG CREEK|MOUNT DUNEED|MT DUNEED|BARWON HEADS|GEELONG)\b/i);
    return suburbMatch?.[1] || '';
  }

  function detectMVA(lines, rawText, incidentType) {
    const text = `${lines.join(' ')} ${rawText}`.toUpperCase();
    return incidentType === 'INCI' && /\bMVA\b|MOTOR VEHICLE|CAR|TRAPPED|RTC|CRASH|COLLISION/.test(text);
  }

  function extractCallSign(lines, rawText) {
    const text = `${lines.join(' ')} ${rawText}`;
    const match = text.match(/\b(?:CALL ?SIGN|APPLIANCE|RESPONDING UNIT)[:\s]+([A-Z0-9-]+)/i);
    return match?.[1] || '';
  }

  function extractJobNumber(lines, rawText) {
    const text = `${lines.join(' ')} ${rawText}`;
    const match = text.match(/\b(?:JOB|INCIDENT|EVENT)\s?(?:NO|NUMBER|#)?[:\s]+([A-Z0-9-]{5,})/i);
    return match?.[1] || '';
  }

  function buildIncidentClass(incidentType, codeLevel) {
    return [incidentType, codeLevel].filter(Boolean).join('');
  }

  function estimateConfidence({ dateTime, addressParts, incidentType, codeLevel }) {
    let score = 0;
    if (dateTime.date) score += 0.2;
    if (dateTime.time) score += 0.2;
    if (addressParts.address) score += 0.25;
    if (incidentType) score += 0.2;
    if (codeLevel) score += 0.15;
    return Number(score.toFixed(2));
  }

  function validateParsedData() {
    const errors = [];
    const warnings = [];
    const parsed = state.parsed;

    if (!parsed.incidentDate) errors.push('Missing incident date.');
    if (!parsed.incidentTime) errors.push('Missing incident time.');
    if (!parsed.address) errors.push('Address was not reliably extracted.');
    if (!parsed.incidentType || !CONFIG.incidentTypes.includes(parsed.incidentType)) {
      errors.push('Incident type must be ALAR, STRU, NONS, INCI or G&SC.');
    }
    if (!parsed.codeLevel || !CONFIG.codeLevels.includes(parsed.codeLevel)) {
      errors.push('Code level must be C1 or C3.');
    }
    if (parsed.confidence < CONFIG.minOcrConfidence) {
      warnings.push('OCR confidence is low. Manual review recommended.');
    }
    if (parsed.incidentType === 'INCI' && parsed.isMVA) {
      warnings.push('INCI appears to be an MVA. Check that MVA-specific fields are completed.');
    }
    if (!state.agencies.length || !state.agencies[0]?.name?.trim()) {
      errors.push('At least one agency is required.');
    }

    state.validationErrors = errors;
    state.validationWarnings = warnings;
  }

  function buildSubmissionPayload() {
    return {
      incident: {
        date: state.parsed.incidentDate,
        time: state.parsed.incidentTime,
        address: state.parsed.address,
        suburb: state.parsed.suburb,
        type: state.parsed.incidentType,
        codeLevel: state.parsed.codeLevel,
        incidentClass: state.parsed.incidentClass,
        callSign: state.parsed.callSign,
        jobNumber: state.parsed.jobNumber,
        isMVA: state.parsed.isMVA,
      },
      agencies: [...state.agencies],
      ocr: {
        rawText: state.rawText,
        confidence: state.parsed.confidence,
        meta: state.lastOcrMeta,
      }
    };
  }

  async function runOCR(file) {
    // Plug in your current OCR engine here.
    // Example placeholder designed to preserve current app flow.
    if (!window.Tesseract) {
      throw new Error('Tesseract is not available on window.');
    }

    const result = await window.Tesseract.recognize(file, 'eng', {
      logger: (message) => console.debug('OCR:', message)
    });

    return {
      text: result?.data?.text || '',
      meta: {
        confidence: result?.data?.confidence || 0,
        blocks: result?.data?.blocks?.length || 0,
      }
    };
  }

  function previewImage(file) {
    const image = qs(CONFIG.selectors.previewImage);
    if (!image) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      image.src = event.target?.result || '';
      image.hidden = false;
    };
    reader.readAsDataURL(file);
  }

  function render() {
    renderRawText();
    renderValidation();
    renderAgencies();
    toggleMVASection();
    renderDebug();
  }

  function renderRawText() {
    const rawTextBox = qs(CONFIG.selectors.rawText);
    if (rawTextBox) rawTextBox.value = state.rawText;
  }

  function renderValidation() {
    const list = qs(CONFIG.selectors.validationList);
    if (!list) return;

    const items = [
      ...state.validationErrors.map((message) => ({ level: 'error', message })),
      ...state.validationWarnings.map((message) => ({ level: 'warn', message }))
    ];

    list.innerHTML = items.length
      ? items.map(({ level, message }) => `<li class="${level}">${escapeHtml(message)}</li>`).join('')
      : '<li class="success">No validation issues detected.</li>';
  }

  function renderAgencies() {
    const container = qs(CONFIG.selectors.agencyContainer);
    if (!container) return;

    container.innerHTML = state.agencies
      .map((agency, index) => `
        <div class="agency-row" data-id="${agency.id}">
          <input type="text" class="agency-name" placeholder="Agency" value="${escapeHtmlAttr(agency.name)}" data-field="name" data-index="${index}">
          <input type="text" class="agency-unit" placeholder="Unit" value="${escapeHtmlAttr(agency.unit)}" data-field="unit" data-index="${index}">
          <input type="text" class="agency-role" placeholder="Role" value="${escapeHtmlAttr(agency.role)}" data-field="role" data-index="${index}">
          ${index > 0 ? `<button type="button" class="remove-agency" data-index="${index}">Remove</button>` : ''}
        </div>
      `)
      .join('');

    container.querySelectorAll('input').forEach((input) => {
      input.addEventListener('input', syncAgencyInputsToState);
    });

    container.querySelectorAll('.remove-agency').forEach((button) => {
      button.addEventListener('click', () => {
        const index = Number(button.dataset.index);
        state.agencies.splice(index, 1);
        renderAgencies();
      });
    });
  }

  function syncAgencyInputsToState() {
    const container = qs(CONFIG.selectors.agencyContainer);
    if (!container) return;

    const nextAgencies = [];
    container.querySelectorAll('.agency-row').forEach((row, index) => {
      const existing = state.agencies[index] || createAgency();
      nextAgencies.push({
        ...existing,
        name: row.querySelector('.agency-name')?.value?.trim() || '',
        unit: row.querySelector('.agency-unit')?.value?.trim() || '',
        role: row.querySelector('.agency-role')?.value?.trim() || ''
      });
    });

    state.agencies = nextAgencies.length ? nextAgencies : [createAgency(CONFIG.defaultAgency)];
  }

  function toggleMVASection() {
    const section = qs(CONFIG.selectors.form.mvaSection);
    if (!section) return;
    section.hidden = !state.parsed.isMVA;
  }

  function renderDebug() {
    const debugBox = qs(CONFIG.selectors.debugBox);
    if (!debugBox) return;

    debugBox.textContent = JSON.stringify({
      parsed: state.parsed,
      agencies: state.agencies,
      validationErrors: state.validationErrors,
      validationWarnings: state.validationWarnings,
      ocrMeta: state.lastOcrMeta,
    }, null, 2);
  }

  function setStatus(message, level = 'info') {
    const status = qs(CONFIG.selectors.status);
    if (!status) return;

    status.textContent = message;
    status.dataset.level = level;
  }

  function resetForm() {
    document.querySelector('form')?.reset();

    const preview = qs(CONFIG.selectors.previewImage);
    if (preview) {
      preview.src = '';
      preview.hidden = true;
    }

    const rawText = qs(CONFIG.selectors.rawText);
    if (rawText) rawText.value = '';
  }

  function normaliseText(text) {
    return (text || '')
      .replace(/\r/g, '')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  function getValue(selector) {
    return qs(selector)?.value?.trim() || '';
  }

  function setValue(selector, value) {
    const element = qs(selector);
    if (element) element.value = value || '';
  }

  function qs(selector) {
    return document.querySelector(selector);
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function escapeHtmlAttr(value) {
    return escapeHtml(value ?? '');
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', App.init);
