let windowCount = 0;
let netSizes = [];
let loggedRetailer = null;
let authorizedDistributors = [];
let currentOrderId = ""; // OrderID assigned per new order

// ------- AUTH/LOGIN -------
fetch('RDDRetailDistData.json')
  .then(r => r.json())
  .then(data => { authorizedDistributors = data; });

document.addEventListener("DOMContentLoaded", () => {
  fetch('MQ_Sizes_Unit_Color_and_Links.json')
    .then(r => r.json())
    .then(data => { netSizes = data; })
    .catch(e => alert("Could not load net size database!"));

  if (localStorage.getItem('retailUser')) {
    loggedRetailer = localStorage.getItem('retailUser');
    document.getElementById('login-section').style.display = 'none';
    document.getElementById('logout-btn').style.display = 'inline-block';
    document.getElementById('order-stepper-container').style.display = 'block';
    showStep(1);
    addWindowEntry();
  }
});

function login() {
  let phone = document.getElementById('retailer-phone').value.trim();
  if (!/^\d{10}$/.test(phone)) { alert('Enter valid 10-digit mobile.'); return; }
  if (!authorizedDistributors.length) {
    alert("Loading authorized distributor list. Please try again in a moment."); return;
  }
  let found = authorizedDistributors.find(x => x.mobile === phone);
  if (!found) { alert('Unauthorized. This mobile is not registered as an ArmorX Retail Distributor.'); return; }
  localStorage.setItem('retailUser', phone);
  localStorage.setItem('retailUserName', found.name);
  document.getElementById('login-section').style.display = 'none';
  document.getElementById('logout-btn').style.display = 'inline-block';
  document.getElementById('order-stepper-container').style.display = 'block';
  showStep(1);
  addWindowEntry();
}

function logout() {
  localStorage.removeItem('retailUser');
  localStorage.removeItem('retailUserName');
  localStorage.removeItem('retailerUPI');
  document.getElementById('logout-btn').style.display = 'none';
  window.location.reload();
}


// ------- STEPPER UI -------
function showStep(n) {
  for (let i = 1; i <= 4; i++) document.getElementById('step-' + i).style.display = (i === n ? 'block' : 'none');
}

// ------- WINDOWS & PRICING -------
function addWindowEntry() {
  const idx = ++windowCount;
  const wBox = document.createElement('div');
  wBox.className = 'window-box';
  wBox.id = 'window-box-' + idx;
  wBox.innerHTML = `
    <button class="remove-btn" onclick="removeWindowEntry(${idx})" title="Remove">×</button>
    <div class="details-row">
      <input type="number" min="1" id="h${idx}" placeholder="Height" oninput="calcPrice(${idx})"/>
      <input type="number" min="1" id="w${idx}" placeholder="Width" oninput="calcPrice(${idx})"/>
    </div>
    <div class="details-row">
      <select id="u${idx}" onchange="calcPrice(${idx})">
        <option value="Cm">cm</option>
        <option value="Inch">in</option>
        <option value="Feet">ft</option>
      </select>
      <select id="c${idx}" onchange="calcPrice(${idx})">
        <option value="BK">Black</option>
        <option value="CR">Cream</option>
        <option value="GR">Grey</option>
        <option value="WH">White</option>
      </select>
      <input type="number" min="1" value="1" id="qty${idx}" placeholder="Qty" oninput="calcPrice(${idx})"/>
    </div>
    <div class="price-link">
  <span class="price-label">Deal Price: ₹<span class="price-value" id="p${idx}">0</span></span>
  <a id="a${idx}" href="#" target="_blank" style="display:none; font-size:0.98em; color:#2856A5; margin-left:8px;">Amazon</a>
</div>

  `;
  document.getElementById('windows-list').appendChild(wBox);
}
function removeWindowEntry(idx) {
  const box = document.getElementById('window-box-' + idx);
  if (box) box.remove();
  updateTotal();
}
function calcPrice(idx) {
  let h = parseFloat(document.getElementById('h' + idx).value || 0);
  let w = parseFloat(document.getElementById('w' + idx).value || 0);
  let u = document.getElementById('u' + idx).value;
  let c = document.getElementById('c' + idx).value;
  let qty = parseInt(document.getElementById('qty' + idx).value || 1);

  // Convert to cm for checking limits
  let hCm = u === "Cm" ? h : (u === "Inch" ? h * 2.54 : h * 30.48);
  let wCm = u === "Cm" ? w : (u === "Inch" ? w * 2.54 : w * 30.48);

   // Check BOTH orientations for exceeding limits
  if ((hCm > 185 && wCm > 340) || (hCm > 340 && wCm > 185)) {
    showSizeLimitPopup();
    // Clear input fields for this entry
    document.getElementById('h' + idx).value = '';
    document.getElementById('w' + idx).value = '';
    document.getElementById('p' + idx).innerText = '0';
    let a = document.getElementById('a' + idx);
    if (a) a.style.display = 'none';
    updateTotal();
    return;
}

  if (!h || !w || !qty) {
    document.getElementById('p' + idx).innerText = '0';
    let a = document.getElementById('a' + idx);
    if (a) a.style.display = 'none';
    updateTotal(); return;
  }

  let best = findClosestSize(h, w, c, u);
  if (best) {
    let dealUnit = parseFloat(best['Deal Price']) || 0;
    let dealPrice = dealUnit * qty;
    document.getElementById('p' + idx).innerText = dealPrice;
    let a = document.getElementById('a' + idx);
    if (a) {
      a.href = best['Amazon Link'];
      a.style.display = best['Amazon Link'] ? '' : 'none';
    }
  } else {
    document.getElementById('p' + idx).innerText = '0';
    let a = document.getElementById('a' + idx);
    if (a) a.style.display = 'none';
  }
  updateTotal();
}



// Utility: Normalize and cap sizes (returns [heightCm, widthCm])
function normalizeSizes(h, w, unit) {
  let hCm = unit === "Cm" ? h : (unit === "Inch" ? h * 2.54 : h * 30.48);
  let wCm = unit === "Cm" ? w : (unit === "Inch" ? w * 2.54 : w * 30.48);
  // Cap both sizes at 338 and 183 (either can be height or width)
  let [bigger, smaller] = [Math.max(hCm, wCm), Math.min(hCm, wCm)];
  bigger = Math.min(bigger, 338);
  smaller = Math.min(smaller, 183);
  return [bigger, smaller];
}

// Utility: Normalize and cap sizes (returns [heightCm, widthCm])
function normalizeSizes(h, w, unit) {
  let hCm = unit === "Cm" ? h : (unit === "Inch" ? h * 2.54 : h * 30.48);
  let wCm = unit === "Cm" ? w : (unit === "Inch" ? w * 2.54 : w * 30.48);
  // Cap both sizes at 338 and 183 (either can be height or width)
  let [bigger, smaller] = [Math.max(hCm, wCm), Math.min(hCm, wCm)];
  bigger = Math.min(bigger, 338);
  smaller = Math.min(smaller, 183);
  return [bigger, smaller];
}

function findClosestSize(h, w, color, unit = "Cm") {
  // Normalize and cap entered sizes
  const [enteredA, enteredB] = normalizeSizes(h, w, unit);
  let closestMatch = null, smallestDifference = Infinity;
  const penalty = 500, tolerance = 2.5;

  // Filter by color and 'Cm'
  const filtered = netSizes.filter(x =>
    x.Unit === "Cm" && x.Color.toUpperCase() === color.toUpperCase()
  );

  filtered.forEach(size => {
    let H = size['Height(H)'], W = size['Width(W)'];
    // Orientation 1: enteredA~H, enteredB~W
    let diff1 = 0;
    if (H >= enteredA || (enteredA - H) <= tolerance) diff1 += Math.max(0, H - enteredA);
    else diff1 += (enteredA - H) * penalty;
    if (W >= enteredB || (enteredB - W) <= tolerance) diff1 += Math.max(0, W - enteredB);
    else diff1 += (enteredB - W) * penalty;
    // Orientation 2: enteredA~W, enteredB~H
    let diff2 = 0;
    if (W >= enteredA || (enteredA - W) <= tolerance) diff2 += Math.max(0, W - enteredA);
    else diff2 += (enteredA - W) * penalty;
    if (H >= enteredB || (enteredB - H) <= tolerance) diff2 += Math.max(0, H - enteredB);
    else diff2 += (enteredB - H) * penalty;
    const diff = Math.min(diff1, diff2);
    if (diff < smallestDifference) {
      smallestDifference = diff;
      closestMatch = size;
    }
  });

  // If nothing, return null
  return closestMatch;
}

function updateTotal() {
  let total = 0;
  document.querySelectorAll('[id^=p]').forEach(span => {
    let val = parseFloat(span.innerText || 0);
    if (isFinite(val)) total += val;
  });
  document.getElementById('total-price').innerText = total;
}
function handleDeliveryChange() {
  const val = document.getElementById('delivery-mode').value;
  const addr = document.getElementById('cust-address');
  if (val === "Home Delivery") {
    addr.style.display = "";
    addr.required = true;
  } else {
    addr.style.display = "none";
    addr.value = "";
    addr.required = false;
  }
}
function showSizeLimitPopup() {
    // WhatsApp message
    let waMsg = encodeURIComponent("Hi ArmorX, I need a custom mosquito net size larger than the standard limits. Please assist!");
    let waLink = "https://wa.me/917304692553?text=" + waMsg;
    let callLink = "tel:7304692553";

    // Simple HTML modal, style as you wish
    let html = `
      <div id="sizeLimitModal" style="position:fixed;top:0;left:0;width:100vw;height:100vh;background:#0006;z-index:9999;display:flex;align-items:center;justify-content:center;">
        <div style="background:#fff;padding:28px 20px;border-radius:13px;max-width:310px;text-align:center;box-shadow:0 6px 32px #0001;">
          <div style="font-size:1.35em;color:#d70000;margin-bottom:14px;font-weight:600;">Size Exceeds Limit</div>
          <div style="margin-bottom:18px;">For sizes above <b>185cm x 340cm</b>, contact Team ArmorX for verification or custom order.</div>
          <a href="${waLink}" target="_blank" style="background:#25d366;color:#fff;font-weight:700;font-size:1.12em;padding:10px 18px;border-radius:7px;text-decoration:none;display:inline-block;margin-bottom:9px;">
            <span style="font-size:1.3em;margin-right:7px;">🟢</span> WhatsApp Us
          </a>
          <br>
          <a href="${callLink}" style="color:#1552d1;font-size:1.11em;text-decoration:underline;">📞 Call 7304692553</a>
          <br><br>
          <button onclick="document.getElementById('sizeLimitModal').remove()" style="margin-top:12px;background:#eee;color:#d70000;padding:6px 22px;border-radius:7px;border:none;cursor:pointer;">Close</button>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', html);
}

// ------- STEPPER LOGIC: BUTTON HANDLERS -------
// Step 1 → Step 2: Validate & create Order ID
function handleOrderDetailsNext() {
  const name = document.getElementById('cust-name').value.trim();
  const phone = document.getElementById('cust-phone').value.trim();
  const delivery = document.getElementById('delivery-mode').value;
  const address = (delivery === "Home Delivery") ? document.getElementById('cust-address').value.trim() : '';
  let hasAny = false;

  document.querySelectorAll('.window-box').forEach((box) => {
    const idx = box.id.split('-')[2];
    const h = document.getElementById('h'+idx).value;
    const w = document.getElementById('w'+idx).value;
    const qty = Number(document.getElementById('qty'+idx).value || 0);
    const price = parseFloat(document.getElementById('p'+idx).innerText || 0);
    if (h && w && price > 0 && qty > 0) hasAny = true;
  });

  if (!name || !/^\d{10}$/.test(phone)) {
    alert('Enter customer details correctly!');
    return;
  }
  if (delivery === "Home Delivery" && !address) {
    alert('Please enter customer address for Home Delivery.');
    return;
  }
  if (!hasAny) {
    alert('Please enter at least one window net details.');
    return;
  }
  // Check if total price is zero
  const total = parseFloat(document.getElementById('total-price').innerText || '0');
  if (total === 0) {
    alert('Order total cannot be zero. Please enter valid window sizes.');
    return;
  }

  // --- Generate new Order ID here ---
  const retailerNumber = localStorage.getItem('retailUser') || "";
  const last4 = retailerNumber.slice(-4);
  const now = new Date();
  const pad = n => n.toString().padStart(2,'0');
  currentOrderId = `AXW-${last4}-${now.getFullYear().toString().slice(-2)}${pad(now.getMonth()+1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
  document.getElementById('order-id-display').innerText = currentOrderId;

  // ---- Build summary like in handlePaymentNext() ----
  let summary = "";
  summary += `<b>Customer:</b> ${name} (${phone})<br>`;
  summary += `<b>Delivery:</b> ${delivery}`;
  if (document.getElementById('cust-address').style.display !== 'none')
    summary += `<br><b>Address:</b> ${address}`;
  summary += "<hr><b>Windows:</b><br>";
  document.querySelectorAll('.window-box').forEach((box, i) => {
    const idx = box.id.split('-')[2];
    const h = document.getElementById('h'+idx).value;
    const w = document.getElementById('w'+idx).value;
    const u = document.getElementById('u'+idx).value;
    const c = document.getElementById('c'+idx).value;
    const qty = document.getElementById('qty'+idx).value;
    const price = document.getElementById('p'+idx).innerText;
    const colorName = { BK: 'Black', CR: 'Cream', GR: 'Grey', WH: 'White' }[c] || c;
    if (h && w && price && qty > 0) {
      summary += `#${i+1}: ${h}x${w} ${u} | ${colorName} | Qty: ${qty} | ₹${price}<br>`;
    }
  });
  summary += `<hr><b>Total: ₹${document.getElementById('total-price').innerText}</b>`;
  document.getElementById('payment-order-summary').innerHTML = summary;

  showStep(2);
}

// Payment checkbox
function togglePaymentNextBtn() {
  document.getElementById('step2-next-btn').disabled = !document.getElementById('payment-collected-checkbox').checked;
}
// Step 2 → Step 3: Show order summary
function handlePaymentNext() {
  // Render summary for confirmation
  let summary = `<b>Order ID:</b> ${currentOrderId}<br>`;
  summary += `<b>Customer:</b> ${document.getElementById('cust-name').value} (${document.getElementById('cust-phone').value})<br>`;
  summary += `<b>Delivery:</b> ${document.getElementById('delivery-mode').value}`;
  if (document.getElementById('cust-address').style.display !== 'none')
    summary += `<br><b>Address:</b> ${document.getElementById('cust-address').value}`;
  summary += "<hr><b>Windows:</b><br>";
  document.querySelectorAll('.window-box').forEach((box, i) => {
    let idx = box.id.split('-')[2];
    let h = document.getElementById('h'+idx).value;
    let w = document.getElementById('w'+idx).value;
    let u = document.getElementById('u'+idx).value;
    let c = document.getElementById('c'+idx).value;
    let qty = document.getElementById('qty'+idx).value;
    let price = document.getElementById('p'+idx).innerText;
    let colorName = { BK: 'Black', CR: 'Cream', GR: 'Grey', WH: 'White' }[c] || c;
    if (h && w && price && qty > 0) {
      summary += `#${i+1}: ${h}x${w} ${u} | ${colorName} | Qty: ${qty} | ₹${price}<br>`;
    }
  });
  summary += `<hr><b>Total: ₹${document.getElementById('total-price').innerText}</b>`;
  document.getElementById('order-summary-panel').innerHTML = summary;
  showStep(3);
}

// Step 3 → Step 4: Save order & WhatsApp
function handleSubmitOrder() {
  // --- Rebuild all data (to avoid risk of "edit after summary") ---
  let name = document.getElementById('cust-name').value.trim();
  let phone = document.getElementById('cust-phone').value.trim();
  let delivery = document.getElementById('delivery-mode').value;
  let address = (delivery === "Home Delivery") ? document.getElementById('cust-address').value.trim() : '';
  let retailerName = localStorage.getItem('retailUserName') || "";
  let retailerNumber = localStorage.getItem('retailUser') || "";
  let msg = `ArmorX Order (Retailer: ${retailerName} - ${retailerNumber})\nOrder ID: ${currentOrderId}\nCustomer: ${name} (${phone})\nDelivery: ${delivery}`;
  if (address) msg += `\nAddress: ${address}`;
  msg += `\n\nWindows:\n`;

  let total = 0;
  let hasAny = false;
  document.querySelectorAll('.window-box').forEach((box, i) => {
    let idx = box.id.split('-')[2];
    let h = document.getElementById('h'+idx).value;
    let w = document.getElementById('w'+idx).value;
    let u = document.getElementById('u'+idx).value;
    let c = document.getElementById('c'+idx).value;
    let qty = document.getElementById('qty'+idx).value;
    let price = document.getElementById('p'+idx).innerText;
    let colorName = { BK: 'Black', CR: 'Cream', GR: 'Grey', WH: 'White' }[c] || c;
    if (h && w && price && qty > 0) {
      msg += `#${i+1}: ${h}x${w} ${u} | ${colorName} | Qty: ${qty} | ₹${price}\n`;
      total += parseFloat(price);
      hasAny = true;
    }
  });
  if (!hasAny) { alert('Please enter at least one window net details.'); showStep(1); return; }
  msg += `\nTotal: ₹${total}`;

  // Build windows array
  let windowsArr = [];
  document.querySelectorAll('.window-box').forEach((box, i) => {
    let idx = box.id.split('-')[2];
    let h = document.getElementById('h'+idx).value;
    let w = document.getElementById('w'+idx).value;
    let u = document.getElementById('u'+idx).value;
    let c = document.getElementById('c'+idx).value;
    let qty = document.getElementById('qty'+idx).value;
    let price = document.getElementById('p'+idx).innerText;
    if(h && w && qty > 0 && price) {
      windowsArr.push({
        height: h, width: w, unit: u,
        color: c, qty: qty,
        deal_price: (qty && price ? (parseFloat(price)/parseInt(qty)) : 0),
        total: price
      });
    }
  });

  // --- Build the orderObj for Google Sheet ---
  let orderObj = {
    timestamp: new Date().toISOString(),
    order_id: currentOrderId,
    retailer_name: retailerName,
    retailer_mobile: retailerNumber,
    customer_name: name,
    customer_phone: phone,
    address: address,
    payment_status: "Collected",
    confirmation_status: "Pending",
    windows: windowsArr,
    total_amount: total,
    wa_message: msg
  };

  // 1. Show spinner
  document.getElementById('savingSpinner').style.display = "block";
  // 2. Save order
  fetch('https://shop-tan-nine.vercel.app/api/proxy', {
    method: 'POST',
    body: JSON.stringify(orderObj),
    headers: {'Content-Type': 'application/json'}
  })
  .then(r => r.json())
  .then(res => {
    document.getElementById('savingSpinner').style.display = "none";
    // 3. Open WhatsApp
    let url = `https://wa.me/917304692553?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
    // 4. Success UI
    showStep(4);
  })
  .catch(e => {
    document.getElementById('savingSpinner').style.display = "none";
    alert("Order save failed: " + e);
  });
}

// UPI QR
function showUPIQR() {
  const upiID = "mbventures@kotak"; // Hardcoded UPI ID
  const payee = "ArmorX Retail Shop";
  const amount = document.getElementById('total-price').innerText || 0;
  const note = `ArmorX Window Order ${currentOrderId}`;
  const upiString = `upi://pay?pa=${encodeURIComponent(upiID)}&pn=${encodeURIComponent(payee)}&am=${amount}&cu=INR&tn=${encodeURIComponent(note)}`;
  var qr = new QRious({
    element: document.getElementById('qrCanvas'),
    value: upiString,
    size: 220
  });
  document.getElementById('upiText').innerText = upiID;
  document.getElementById('upiAmount').innerHTML = `<span style="font-size:1.25em;">₹${amount}</span>`;
  document.getElementById('upiModal').style.display = "flex";
}

// Allow closing UPI modal with outside click (optional, for good UX)
document.addEventListener("click", function(e) {
  if (e.target.id === "upiModal") document.getElementById('upiModal').style.display = "none";
});

// === Retailer PIN & Payout Logic (keep this together!) ===

// Attach long-press detection on logo after DOM loads
document.addEventListener("DOMContentLoaded", function() {
  const logo = document.querySelector('.brand-logo');
  let timer = null;
  if (logo) {
    logo.addEventListener('mousedown', () => { timer = setTimeout(showPinModal, 850); });
    logo.addEventListener('touchstart', () => { timer = setTimeout(showPinModal, 850); });
    logo.addEventListener('mouseup', () => { if (timer) clearTimeout(timer); });
    logo.addEventListener('mouseleave', () => { if (timer) clearTimeout(timer); });
    logo.addEventListener('touchend', () => { if (timer) clearTimeout(timer); });
  }
});

function showPinModal() {
  document.getElementById('retailerPinInput').value = "";
  document.getElementById('pinError').style.display = "none";
  document.getElementById('pinModal').style.display = "flex";
  setTimeout(() => {
    document.getElementById('retailerPinInput').focus();
  }, 100);
}
function closePinModal() {
  document.getElementById('pinModal').style.display = "none";
}
function closePayoutModal() {
  document.getElementById('payoutModal').style.display = "none";
}

function verifyRetailerPIN() {
  const input = document.getElementById('retailerPinInput').value.trim();
  const retailerNumber = localStorage.getItem('retailUser') || "";
  const expectedPin = retailerNumber.slice(-4); // last 4 digits
  if (input === expectedPin) {
  closePinModal();
  showDashboardModal(); // << call your dashboard modal function here!
} else {
  document.getElementById('pinError').style.display = "block";
}
}

// --- Payout LIVE (replace fetch with actual Sheet call in future) ---

async function fetchAndUpdateDashboard() {
  const retailerNumber = localStorage.getItem('retailUser') || "";
  if (!retailerNumber) return;

  // Use your Google Apps Script URL
  const url = `https://script.google.com/macros/s/AKfycbxIb3-J4n4Kt1sXBxcttdgcyQFSq7EZF_2eZ7H0r3ktRSXKSfkyRtWW7mr_DapkVh3nRA/exec?retailer=${retailerNumber}`;
  try {
    const res = await fetch(url);
    const data = await res.json();

    const now = new Date();
    let todayOrders = 0, monthSales = 0, commission = 0;
    let recentOrders = [];

    // Find orders from this month and today, calculate commission
    data.orders.forEach(order => {
      const orderDate = new Date(order.timestamp);
      // Today's Orders
      if (orderDate.toDateString() === now.toDateString()) todayOrders++;
      // This Month's Sales
      if (orderDate.getMonth() === now.getMonth() && orderDate.getFullYear() === now.getFullYear())
        monthSales += Number(order.total_amount);

      // Commission (only Confirmed or Paid)
      const status = (order.status || "").toLowerCase();
      const payStatus = (order.payment_status || "").toLowerCase();
      if (status.includes("confirm") || status.includes("paid") || payStatus.includes("paid")) {
        commission += Number(order.total_amount) * 0.10;
      }
      // Save for recent
      recentOrders.push(order);
    });

    // Sort and take latest 5 orders
    recentOrders.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    let recentHtml = recentOrders.slice(0, 5).map(order => 
      `<div>${order.order_id} | <b>₹${order.total_amount}</b> | 
       <span style="color:${order.status === 'Confirmed' ? '#007b1c' : (order.status === 'Pending' ? '#bfa000' : '#e25c04')}">${order.status}</span></div>`
    ).join('');

    // Update dashboard metrics
    document.getElementById('dashTodayOrders').innerText = todayOrders;
    document.getElementById('dashMonthSales').innerText = "₹" + monthSales.toLocaleString();
    // If you want to add commission metric:
    if(document.getElementById('retailerCommission'))
      document.getElementById('retailerCommission').innerText = "₹" + commission.toLocaleString();

    // For payout, you'll need to implement it later
    document.getElementById('dashPending').innerText = "₹0";
    document.getElementById('dashLastPayout').innerText = "₹0";
    document.getElementById('dashRecentOrders').innerHTML = recentHtml;

    // Update bar chart with last 7 days
    let days = [];
    let sales = [];
    for (let i = 6; i >= 0; i--) {
      let d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      days.push(d.toLocaleDateString(undefined, {weekday:'short'}));
      let totalForDay = data.orders.filter(o => {
        let od = new Date(o.timestamp);
        return od.toDateString() === d.toDateString() &&
            ((o.status || "").toLowerCase().includes("confirm") || (o.status || "").toLowerCase().includes("paid"));
      }).reduce((sum, o) => sum + Number(o.total_amount), 0);
      sales.push(totalForDay);
    }

    let ctx = document.getElementById('ordersBarChart').getContext('2d');
    if (window.dashboardChart) window.dashboardChart.destroy();
    window.dashboardChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: days,
        datasets: [{
          label: 'Orders',
          data: sales,
          backgroundColor: '#a8e063'
        }]
      },
      options: {
        responsive: false,
        plugins: { legend: { display: false }},
        scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
      }
    });

  } catch (e) {
    document.getElementById('dashRecentOrders').innerHTML = "<div style='color:#b20000'>Could not fetch dashboard data.</div>";
  }
}


// --- Dashboard Modal logic ---
function showDashboardModal() {
  // Set name and mobile in modal
  document.getElementById('retailerDashName').innerText = localStorage.getItem('retailUserName') || "Retailer";
  document.getElementById('retailerDashMobile').innerText = localStorage.getItem('retailUser') || "";
  fetchAndUpdateDashboard();
  document.getElementById('dashboardModal').style.display = 'flex';
}

function closeDashboardModal() {
  document.getElementById('dashboardModal').style.display = 'none';
}
