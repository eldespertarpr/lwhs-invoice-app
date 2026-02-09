const $ = (id) => document.getElementById(id);
const fmt = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

function pad2(n){ return String(n).padStart(2, "0"); }
function escapeHtml(s){
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[c]));
}

function makeDefaultInvoiceNumber() {
  // Compatible con uso local (file://) sin depender de localStorage.
  const d = new Date();
  const y = d.getFullYear();
  const m = pad2(d.getMonth() + 1);
  const day = pad2(d.getDate());
  const hh = pad2(d.getHours());
  const mm = pad2(d.getMinutes());
  const ss = pad2(d.getSeconds());
  return `${y}${m}${day}-${hh}${mm}${ss}`;
}

function addRow(desc = "", qty = 1, price = 0) {
  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td><input class="desc" placeholder="Descripción" value="${escapeHtml(desc)}"></td>
    <td class="num"><input class="qty" type="number" step="1" min="0" value="${qty}"></td>
    <td class="num"><input class="price" type="number" step="0.01" min="0" value="${price}"></td>
    <td class="num"><span class="lineTotal">$0.00</span></td>
    <td><button type="button" class="del">✕</button></td>
  `;
  $("itemsBody").appendChild(tr);

  tr.querySelectorAll("input").forEach(inp => inp.addEventListener("input", recalc));
  tr.querySelector(".del").addEventListener("click", () => { tr.remove(); recalc(); });

  recalc();
}

function getItems() {
  const rows = [...$("itemsBody").querySelectorAll("tr")];
  return rows.map(tr => {
    const desc = tr.querySelector(".desc").value.trim();
    const qty = parseFloat(tr.querySelector(".qty").value || "0");
    const price = parseFloat(tr.querySelector(".price").value || "0");
    const total = (qty * price) || 0;
    tr.querySelector(".lineTotal").textContent = fmt.format(total);
    return { desc, qty, price, total };
  }).filter(x => x.desc || x.qty || x.price);
}

function recalc() {
  const items = getItems();
  const subtotal = items.reduce((a, x) => a + x.total, 0);
  const taxRate = parseFloat($("taxRate").value || "0");
  const shipping = parseFloat($("shipping").value || "0");
  const tax = subtotal * (taxRate / 100);
  const grand = subtotal + tax + shipping;

  $("subTotal").textContent = fmt.format(subtotal);
  $("taxTotal").textContent = fmt.format(tax);
  $("shipTotal").textContent = fmt.format(shipping);
  $("grandTotal").textContent = fmt.format(grand);
}

function collectData() {
  const items = getItems();
  const subtotal = items.reduce((a, x) => a + x.total, 0);
  const taxRate = parseFloat($("taxRate").value || "0");
  const shipping = parseFloat($("shipping").value || "0");
  const tax = subtotal * (taxRate / 100);
  const grand = subtotal + tax + shipping;

  return {
    biz: {
      name: $("bizName").value.trim(),
      addr: $("bizAddr").value.trim(),
      phone: $("bizPhone").value.trim(),
      email: $("bizEmail").value.trim(),
    },
    cust: {
      name: $("custName").value.trim(),
      addr: $("custAddr").value.trim(),
      phone: $("custPhone").value.trim(),
    },
    inv: {
      number: $("invNumber").value.trim(),
      date: $("invDate").value,
      tracking: $("trackingNo").value.trim(), // <-- TRACKING
    },
    items,
    totals: { subtotal, taxRate, tax, shipping, grand },
    payNotes: $("payNotes").value.trim(),
  };
}

function buildInvoiceHtml(d) {
  const rows = d.items.map(it => `
    <tr>
      <td>${escapeHtml(it.desc)}</td>
      <td class="num">${it.qty}</td>
      <td class="num">${fmt.format(it.price)}</td>
      <td class="num">${fmt.format(it.total)}</td>
    </tr>
  `).join("");

  const safe = (v) => escapeHtml(v || "");
  const br = (v) => safe(v).replace(/\n/g, "<br>");

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Factura ${safe(d.inv.number)}</title>
<style>
  body{ font-family: Arial, sans-serif; color:#111; margin:24px; }
  .top{ display:flex; justify-content:space-between; gap:16px; }
  h1{ margin:0; font-size:22px; }
  .box{ border:1px solid #ddd; border-radius:10px; padding:12px; }
  .muted{ color:#666; font-size:12px; }
  table{ width:100%; border-collapse:collapse; margin-top:14px; }
  th,td{ border-bottom:1px solid #eee; padding:10px; vertical-align:top; }
  th{ background:#fafafa; text-align:left; font-size:13px; }
  .num{ text-align:right; white-space:nowrap; }
  .totals{ width:320px; margin-left:auto; margin-top:12px; }
  .totals div{ display:flex; justify-content:space-between; padding:6px 0; }
  .grand{ border-top:1px dashed #ddd; margin-top:6px; padding-top:10px; font-size:16px; }
  @media print { body{ margin:0; } .noPrint{ display:none; } }
</style>
</head>
<body>
  <div class="top">
    <div>
      <h1>FACTURA</h1>
      <div class="muted">
        Núm: <b>${safe(d.inv.number)}</b><br>
        Fecha: <b>${safe(d.inv.date)}</b>
        ${d.inv.tracking ? `<br>Tracking: <b>${safe(d.inv.tracking)}</b>` : ""}
      </div>
    </div>
    <div class="box" style="min-width:280px">
      <b>${safe(d.biz.name)}</b><br>
      ${br(d.biz.addr)}<br>
      ${safe(d.biz.phone)}<br>
      ${safe(d.biz.email)}
    </div>
  </div>

  <div class="box" style="margin-top:14px">
    <b>Cliente</b><br>
    ${safe(d.cust.name)}<br>
    ${br(d.cust.addr)}<br>
    ${safe(d.cust.phone)}
  </div>

  <table>
    <thead>
      <tr><th>Descripción</th><th class="num">Cant.</th><th class="num">Precio</th><th class="num">Total</th></tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="totals">
    <div><span>Subtotal</span><b>${fmt.format(d.totals.subtotal)}</b></div>
    <div><span>IVU (${d.totals.taxRate || 0}%)</span><b>${fmt.format(d.totals.tax)}</b></div>
    <div><span>Envío</span><b>${fmt.format(d.totals.shipping)}</b></div>
    <div class="grand"><span>Total</span><b>${fmt.format(d.totals.grand)}</b></div>
  </div>

  ${d.payNotes ? `<div class="box" style="margin-top:14px">
    <b>Pago</b><br>${br(d.payNotes)}
  </div>` : ""}

  <p class="muted noPrint" style="margin-top:14px">
    Puedes cerrar esta pestaña cuando guardes el PDF.
  </p>
</body>
</html>`;
}

function openPrintView() {
  const data = collectData();
  const html = buildInvoiceHtml(data);

  const w = window.open("", "_blank");
  if (!w) {
    alert("Tu navegador bloqueó la ventana de impresión. Intenta de nuevo y acepta los permisos, o usa otro navegador.");
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
  w.focus();
  w.print();
}

async function copyToClipboard(text) {
  // Intenta Clipboard API
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (_) {}

  // Fallback: textarea + execCommand
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.top = "-1000px";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    if (ok) return true;
  } catch (_) {}

  // Último recurso: prompt para copiar manual
  window.prompt("Copia y pega esto en Pirate Ship:", text);
  return false;
}

function buildPirateAddressBlock() {
  const name = $("custName").value.trim();
  const addr = $("custAddr").value.trim();
  const phone = $("custPhone").value.trim();

  // Bloque simple para "Paste Address" en Pirate Ship
  const lines = [];
  if (name) lines.push(name);
  if (addr) lines.push(addr);
  if (phone) lines.push(phone);
  return lines.join("\n");
}

function init() {
  const today = new Date();
  $("invDate").value = `${today.getFullYear()}-${pad2(today.getMonth()+1)}-${pad2(today.getDate())}`;
  $("invNumber").value = makeDefaultInvoiceNumber();

  $("addItemBtn").addEventListener("click", () => addRow());
  $("taxRate").addEventListener("input", recalc);
  $("shipping").addEventListener("input", recalc);

  $("previewBtn").addEventListener("click", openPrintView);
  $("clearBtn").addEventListener("click", () => location.reload());

  $("copyPirateBtn").addEventListener("click", async () => {
    const block = buildPirateAddressBlock();
    if (!block) {
      alert("Primero llena al menos el nombre y la dirección del cliente.");
      return;
    }
    await copyToClipboard(block);
    alert("Dirección copiada. Ve a Pirate Ship y pega en 'Paste Address'.");
  });

  $("openPirateBtn").addEventListener("click", () => {
    window.open("https://pirateship.com", "_blank");
  });

  // start with 2 lines
  addRow("Artículo 1", 1, 0);
  addRow("Artículo 2", 1, 0);
}
$("copyTrackingBtn").addEventListener("click", async () => {
  const t = $("trackingNo").value.trim();
  if (!t) return alert("No hay tracking para copiar.");
  await copyToClipboard(t);
  alert("Tracking copiado ✅");
});
init();
