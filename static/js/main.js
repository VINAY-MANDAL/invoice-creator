/**
 * InvoiceFlow — Main JS
 * Landing page → Wizard flow
 * Handles: navigation, item management, live totals, preview, PDF download
 */

// ── State ──────────────────────────────────────────────
let currentStep = 1;
const TOTAL_STEPS = 4;
let itemCounter = 0;

// ── Init ───────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  // Landing → Wizard buttons
  document.getElementById("landingCreateBtn").addEventListener("click", startWizard);
  document.getElementById("heroCreateBtn").addEventListener("click", startWizard);
  document.getElementById("backToLanding").addEventListener("click", goToLanding);

  // Wizard nav
  document.getElementById("nextBtn").addEventListener("click", handleNext);
  document.getElementById("prevBtn").addEventListener("click", handlePrev);
  document.getElementById("addItemBtn").addEventListener("click", addItemRow);
  document.getElementById("downloadPdfBtn").addEventListener("click", downloadPDF);
});

// ── Landing ↔ Wizard ───────────────────────────────────
function startWizard() {
  document.getElementById("landingPage").style.display = "none";
  document.getElementById("appPage").style.display = "block";
  document.getElementById("appPage").classList.remove("app-hidden");

  // Init wizard only once
  if (itemCounter === 0) {
    fetchInvoiceNumber();
    setTodayDates();
    addItemRow();
    updateUI();
  }
}

function goToLanding() {
  document.getElementById("appPage").style.display = "none";
  document.getElementById("landingPage").style.display = "flex";
}

// ── Invoice number ─────────────────────────────────────
async function fetchInvoiceNumber() {
  try {
    const res = await fetch("/api/invoice-number");
    const data = await res.json();
    document.getElementById("invoiceNumber").value = data.invoice_number;
  } catch {
    document.getElementById("invoiceNumber").value = "INV-" + Date.now();
  }
}

// ── Dates ──────────────────────────────────────────────
function setTodayDates() {
  const today = new Date();
  const due = new Date();
  due.setDate(due.getDate() + 30);
  document.getElementById("invoiceDate").value = formatDate(today);
  document.getElementById("dueDate").value = formatDate(due);
}

function formatDate(d) {
  return d.toISOString().split("T")[0];
}

// ── Wizard Navigation ──────────────────────────────────
function handleNext() {
  if (!validateStep(currentStep)) return;
  if (currentStep === 3) buildPreview();
  if (currentStep < TOTAL_STEPS) {
    currentStep++;
    updateUI();
  }
}

function handlePrev() {
  if (currentStep > 1) {
    currentStep--;
    updateUI();
  }
}

function updateUI() {
  document.querySelectorAll(".step-panel").forEach((p, i) => {
    p.classList.toggle("active", i + 1 === currentStep);
  });

  document.querySelectorAll(".step-dot").forEach((dot, i) => {
    const s = i + 1;
    dot.classList.remove("active", "done");
    if (s === currentStep) dot.classList.add("active");
    else if (s < currentStep) dot.classList.add("done");
  });

  document.querySelectorAll(".step-connector").forEach((c, i) => {
    c.classList.toggle("done", i + 1 < currentStep);
  });

  document.getElementById("progressFill").style.width =
    ((currentStep / TOTAL_STEPS) * 100) + "%";

  document.getElementById("stepLabel").textContent =
    `Step ${currentStep} of ${TOTAL_STEPS}`;

  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");
  prevBtn.style.display = currentStep === 1 ? "none" : "inline-flex";
  nextBtn.style.display = currentStep === TOTAL_STEPS ? "none" : "inline-flex";
}

// ── Validation ─────────────────────────────────────────
function validateStep(step) {
  let valid = true;

  const rules = {
    1: [
      { id: "sellerName",    msg: "Seller name required" },
      { id: "sellerPhone",   msg: "Valid phone required", pattern: /^[\d\s\+\-]{7,15}$/ },
      { id: "sellerEmail",   msg: "Invalid email", pattern: /^$|^[^\s@]+@[^\s@]+\.[^\s@]+$/, optional: true },
      { id: "sellerAddress", msg: "Address required" },
      { id: "invoiceDate",   msg: "Invoice date required" },
      { id: "dueDate",       msg: "Due date required" },
    ],
    2: [
      { id: "customerName",    msg: "Customer name required" },
      { id: "customerPhone",   msg: "Valid phone required", pattern: /^[\d\s\+\-]{7,15}$/ },
      { id: "customerEmail",   msg: "Invalid email", pattern: /^$|^[^\s@]+@[^\s@]+\.[^\s@]+$/, optional: true },
      { id: "customerAddress", msg: "Address required" },
      { id: "customerState",   msg: "Select a state" },
    ],
  };

  if (step === 3) return validateItems();

  (rules[step] || []).forEach(({ id, msg, pattern, optional }) => {
    const el = document.getElementById(id);
    const errEl = document.getElementById("err-" + id);
    const v = el.value.trim();
    let ok = v.length > 0;
    if (optional && v === "") ok = true;
    if (pattern && v !== "") ok = pattern.test(v);
    el.classList.toggle("invalid", !ok);
    if (errEl) errEl.textContent = ok ? "" : msg;
    if (!ok) valid = false;
  });

  return valid;
}

function validateItems() {
  const rows = document.querySelectorAll(".item-row");
  if (rows.length === 0) {
    document.getElementById("err-items").textContent = "Add at least one item.";
    return false;
  }
  let valid = true;
  rows.forEach(row => {
    const nameEl  = row.querySelector(".item-name");
    const qtyEl   = row.querySelector(".item-qty");
    const priceEl = row.querySelector(".item-price");
    const nameOk  = nameEl.value.trim().length > 0;
    const qtyOk   = parseFloat(qtyEl.value) > 0;
    const priceOk = parseFloat(priceEl.value) >= 0;
    nameEl.classList.toggle("invalid", !nameOk);
    qtyEl.classList.toggle("invalid", !qtyOk);
    priceEl.classList.toggle("invalid", !priceOk);
    if (!nameOk || !qtyOk || !priceOk) valid = false;
  });
  document.getElementById("err-items").textContent =
    valid ? "" : "Fill all item fields correctly.";
  return valid;
}

// ── Item Rows ──────────────────────────────────────────
function addItemRow() {
  const id = ++itemCounter;
  const tbody = document.getElementById("itemsBody");
  const tr = document.createElement("tr");
  tr.className = "item-row";
  tr.dataset.id = id;
  tr.innerHTML = `
    <td><input type="text"   class="item-name"  placeholder="Item / Service" /></td>
    <td><input type="number" class="item-qty"   min="1"   value="1"  style="width:60px" /></td>
    <td><input type="number" class="item-price" min="0"   value=""   placeholder="0.00" /></td>
    <td><input type="number" class="item-tax"   min="0"   max="100"  value="18" style="width:64px" /></td>
    <td class="item-amount">₹0.00</td>
    <td><button class="btn-delete" type="button" title="Remove">✕</button></td>
  `;
  tbody.appendChild(tr);

  tr.querySelectorAll("input").forEach(inp => inp.addEventListener("input", () => {
    recalcRow(tr);
    recalcTotals();
  }));
  tr.querySelector(".btn-delete").addEventListener("click", () => {
    tr.remove();
    recalcTotals();
  });
}

function recalcRow(row) {
  const qty   = parseFloat(row.querySelector(".item-qty").value)   || 0;
  const price = parseFloat(row.querySelector(".item-price").value) || 0;
  const tax   = parseFloat(row.querySelector(".item-tax").value)   || 0;
  const base  = qty * price;
  const taxAmt = base * tax / 100;
  const amount = base + taxAmt;
  row.querySelector(".item-amount").textContent = "₹" + amount.toFixed(2);
  row.dataset.amount = amount.toFixed(2);
  row.dataset.base   = base.toFixed(2);
  row.dataset.taxAmt = taxAmt.toFixed(2);
}

function recalcTotals() {
  let subtotal = 0, gstTotal = 0;
  document.querySelectorAll(".item-row").forEach(row => {
    subtotal += parseFloat(row.dataset.base   || 0);
    gstTotal += parseFloat(row.dataset.taxAmt || 0);
  });
  const grand = subtotal + gstTotal;
  document.getElementById("subtotal").textContent   = "₹" + subtotal.toFixed(2);
  document.getElementById("gstTotal").textContent   = "₹" + gstTotal.toFixed(2);
  document.getElementById("grandTotal").textContent = "₹" + grand.toFixed(2);
}

// ── Collect Data ───────────────────────────────────────
function collectData() {
  const items = [];
  document.querySelectorAll(".item-row").forEach(row => {
    items.push({
      name:      row.querySelector(".item-name").value.trim(),
      qty:       parseFloat(row.querySelector(".item-qty").value),
      unitPrice: parseFloat(row.querySelector(".item-price").value),
      tax:       parseFloat(row.querySelector(".item-tax").value),
      amount:    parseFloat(row.dataset.amount || 0),
    });
  });
  return {
    sellerName:      val("sellerName"),
    sellerPhone:     val("sellerPhone"),
    sellerEmail:     val("sellerEmail"),
    sellerAddress:   val("sellerAddress"),
    sellerGST:       val("sellerGST"),
    invoiceNumber:   val("invoiceNumber"),
    invoiceDate:     val("invoiceDate"),
    dueDate:         val("dueDate"),
    customerName:    val("customerName"),
    customerPhone:   val("customerPhone"),
    customerEmail:   val("customerEmail"),
    customerAddress: val("customerAddress"),
    customerState:   val("customerState"),
    customerGST:     val("customerGST"),
    notes:           val("notes"),
    items,
    subtotal:   document.getElementById("subtotal").textContent.replace("₹", ""),
    gstTotal:   document.getElementById("gstTotal").textContent.replace("₹", ""),
    grandTotal: document.getElementById("grandTotal").textContent.replace("₹", ""),
  };
}

function val(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : "";
}

// ── Preview ────────────────────────────────────────────
function buildPreview() {
  const d = collectData();
  const itemsHTML = d.items.map((item, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${esc(item.name)}</td>
      <td>${item.qty}</td>
      <td>₹${item.unitPrice.toFixed(2)}</td>
      <td>${item.tax}%</td>
      <td>₹${item.amount.toFixed(2)}</td>
    </tr>
  `).join("");

  document.getElementById("invoicePreview").innerHTML = `
    <div class="preview-header">
      <div>
        <div class="preview-inv-title">INVOICE<span>${esc(d.sellerName)}</span></div>
      </div>
      <div class="preview-meta">
        <div class="inv-num">${esc(d.invoiceNumber)}</div>
        <div><strong>Date:</strong> ${d.invoiceDate}</div>
        <div><strong>Due:</strong> ${d.dueDate}</div>
        ${d.sellerPhone ? `<div>${esc(d.sellerPhone)}</div>` : ""}
        ${d.sellerEmail ? `<div>${esc(d.sellerEmail)}</div>` : ""}
      </div>
    </div>
    <div class="preview-parties">
      <div class="preview-party">
        <h4>From</h4>
        <p class="party-name">${esc(d.sellerName)}</p>
        <p>${esc(d.sellerAddress)}</p>
        ${d.sellerGST ? `<span class="gst-pill">GST: ${esc(d.sellerGST)}</span>` : ""}
      </div>
      <div class="preview-party">
        <h4>Bill To</h4>
        <p class="party-name">${esc(d.customerName)}</p>
        <p>${esc(d.customerAddress)}</p>
        ${d.customerState  ? `<p>${esc(d.customerState)}</p>`  : ""}
        ${d.customerPhone  ? `<p>${esc(d.customerPhone)}</p>`  : ""}
        ${d.customerEmail  ? `<p>${esc(d.customerEmail)}</p>`  : ""}
        ${d.customerGST    ? `<span class="gst-pill">GST: ${esc(d.customerGST)}</span>` : ""}
      </div>
    </div>
    <table class="preview-table">
      <thead>
        <tr><th>#</th><th>Item</th><th>Qty</th><th>Unit Price</th><th>Tax %</th><th>Amount</th></tr>
      </thead>
      <tbody>${itemsHTML}</tbody>
    </table>
    <div class="preview-totals">
      <div class="preview-totals-box">
        <div class="pt-line"><span>Subtotal</span><span>₹${d.subtotal}</span></div>
        <div class="pt-line"><span>GST</span><span>₹${d.gstTotal}</span></div>
        <div class="pt-line grand"><span>Grand Total</span><span>₹${d.grandTotal}</span></div>
      </div>
    </div>
    ${d.notes ? `<div class="preview-notes"><h4>Notes / Terms</h4><p>${esc(d.notes)}</p></div>` : ""}
    <div class="preview-footer">Thank you for your business! · Generated by InvoiceFlow</div>
  `;
}

// ── PDF Download ───────────────────────────────────────
async function downloadPDF() {
  const btn    = document.getElementById("downloadPdfBtn");
  const errBox = document.getElementById("pdfError");
  errBox.style.display = "none";
  btn.textContent = "Generating…";
  btn.disabled = true;

  try {
    const data = collectData();
    const res  = await fetch("/api/generate-pdf", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(data),
    });

    if (!res.ok) {
      // Show actual server error text
      let errText = `Server error ${res.status}`;
      try { const j = await res.json(); errText = j.error || errText; } catch {}
      throw new Error(errText);
    }

    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `${data.invoiceNumber}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

  } catch (err) {
    errBox.style.display = "block";
    errBox.innerHTML = `
      <strong>PDF generation failed</strong><br/>
      ${esc(err.message)}<br/><br/>
      <strong>Check:</strong><br/>
      • wkhtmltopdf installed at <code>C:\\Program Files\\wkhtmltopdf\\bin\\wkhtmltopdf.exe</code><br/>
      • Flask server running on port 5000<br/>
      • Run <code>pip install pdfkit</code>
    `;
  } finally {
    btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Download PDF`;
    btn.disabled = false;
  }
}

// ── Helper ─────────────────────────────────────────────
function esc(str) {
  const d = document.createElement("div");
  d.textContent = str || "";
  return d.innerHTML;
}
