let windowCount = 0;
let netSizes = [];
let loggedRetailer = null;
let authorizedDistributors = []; // will load from JSON

// Load authorized list on page load
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
    if (typeof showAfterLogin === "function") showAfterLogin(); // In case this is used
    document.getElementById('login-section').style.display = 'none';
    document.getElementById('order-section').style.display = 'block';
    if (document.getElementById('main-title')) document.getElementById('main-title').style.display = 'block';
    if (document.getElementById('app-title')) document.getElementById('app-title').style.display = 'none';
    addWindowEntry();
  }
});

function login() {
  let phone = document.getElementById('retailer-phone').value.trim();
  if (!/^\d{10}$/.test(phone)) { 
    alert('Enter valid 10-digit mobile.'); 
    return; 
  }

  // Wait until list is loaded
  if (!authorizedDistributors.length) {
    alert("Loading authorized distributor list. Please try again in a moment.");
    return;
  }

  // Find authorized distributor
  let found = authorizedDistributors.find(x => x.mobile === phone);
  if (!found) {
    alert('Unauthorized. This mobile is not registered as an ArmorX Retail Distributor.');
    return;
  }
  // Save for session/use (optional: you can show name on main screen)
  localStorage.setItem('retailUser', phone);
  localStorage.setItem('retailUserName', found.name);

  // Continue with your normal login logic:
  if (typeof showAfterLogin === "function") showAfterLogin();
  document.getElementById('login-section').style.display = 'none';
  document.getElementById('order-section').style.display = 'block';
  if (document.getElementById('main-title')) document.getElementById('main-title').style.display = 'block';
  if (document.getElementById('app-title')) document.getElementById('app-title').style.display = 'none';
  addWindowEntry();
}


function logout() {
  localStorage.removeItem('retailUser');
  window.location.reload();
}

// Support for delivery address field (call this from delivery select "onchange")
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
      <a id="a${idx}" href="#" class="amz-link" target="_blank" style="display:none;">Amazon</a>
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

  if (!h || !w || !qty) {
    document.getElementById('p' + idx).innerText = '0';
    document.getElementById('a' + idx).style.display = 'none';
    updateTotal();
    return;
  }

  // Convert all entered values to cm for searching
  let h_cm = u === "Cm" ? h : (u === "Inch" ? h * 2.54 : h * 30.48);
  let w_cm = u === "Cm" ? w : (u === "Inch" ? w * 2.54 : w * 30.48);

  let best = findClosestSize(h_cm, w_cm, c);
  if (best) {
    // Use ONLY Deal Price (no fallback to Selling Price)
    let dealUnit = parseFloat(best['Deal Price']) || 0;
    let dealPrice = dealUnit * qty;
    document.getElementById('p' + idx).innerText = dealPrice;
    let a = document.getElementById('a' + idx);
    a.href = best['Amazon Link'];
    a.style.display = '';
  } else {
    document.getElementById('p' + idx).innerText = '0';
    document.getElementById('a' + idx).style.display = 'none';
  }
  updateTotal();
}

function findClosestSize(h_cm, w_cm, c) {
  // Find available net in cm, same color, minimize abs diff (height+width)
  let filtered = netSizes.filter(x => x.Color === c && x.Unit === "Cm");
  if (filtered.length === 0) return null;
  let best = filtered[0],
      bestDist = Math.abs(filtered[0]['Height(H)'] - h_cm) + Math.abs(filtered[0]['Width(W)'] - w_cm);
  for (let item of filtered) {
    let dist = Math.abs(item['Height(H)'] - h_cm) + Math.abs(item['Width(W)'] - w_cm);
    if (dist < bestDist) { best = item; bestDist = dist; }
  }
  return best;
}

function updateTotal() {
  let total = 0;
  document.querySelectorAll('[id^=p]').forEach(span => {
    let val = parseFloat(span.innerText || 0);
    if (isFinite(val)) total += val;
  });
  document.getElementById('total-price').innerText = total;
}
function showUPIQR() {
  let upiID = localStorage.getItem('retailerUPI');
  // Validate or prompt if not available
  if (!upiID || !upiID.includes('@')) {
    upiID = prompt("Enter your UPI ID for payment collection (e.g., 9876543210@okicici):");
    if (!upiID || !upiID.includes('@')) {
      alert("Invalid UPI ID. Please try again.");
      return;
    }
    localStorage.setItem('retailerUPI', upiID);
  }
  const payee = "ArmorX Retailer";
  const amount = document.getElementById('total-price').innerText || 0;
  const note = "ArmorX Window Order";
  const upiString = `upi://pay?pa=${encodeURIComponent(upiID)}&pn=${encodeURIComponent(payee)}&am=${amount}&cu=INR&tn=${encodeURIComponent(note)}`;
  // Generate QR
  var qr = new QRious({
    element: document.getElementById('qrCanvas'),
    value: upiString,
    size: 220
  });
document.getElementById('upiText').innerText = upiID;
document.getElementById('upiAmount').innerHTML = `<span style="font-size:1.25em;">₹${amount}</span>`;
document.getElementById('upiModal').style.display = "flex";
}

function editUPI() {
  let current = localStorage.getItem('retailerUPI') || "";
  let upiID = prompt("Update your UPI ID:", current);
  if (upiID && upiID.includes('@')) {
    localStorage.setItem('retailerUPI', upiID);
    document.getElementById('upiText').innerText = upiID;
    showUPIQR(); // Refresh QR with new UPI
  } else if (upiID !== null) {
    alert("Invalid UPI ID.");
  }
}


function sendOnWhatsApp() {
  let name = document.getElementById('cust-name').value.trim();
  let phone = document.getElementById('cust-phone').value.trim();
  let delivery = document.getElementById('delivery-mode').value;
  let address = '';
  if (!name || !/^\d{10}$/.test(phone)) { alert('Enter customer details correctly!'); return; }
  if (delivery === "Home Delivery") {
    address = document.getElementById('cust-address').value.trim();
    if (!address) { alert('Please enter customer address for Home Delivery.'); return; }
  }

  // Retail info from localStorage
  let retailerName = localStorage.getItem('retailUserName') || "";
  let retailerNumber = localStorage.getItem('retailUser') || "";

  // --- Build WhatsApp message ---
  let msg = `ArmorX Order (Retailer: ${retailerName} - ${retailerNumber})\nCustomer: ${name} (${phone})\nDelivery: ${delivery}`;
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
  if (!hasAny) { alert('Please enter at least one window net details.'); return; }
  msg += `\nTotal: ₹${total}`;

  // --- Build windows array for the Sheet ---
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
    order_id: "", // leave blank for auto ID, or set custom if needed
    retailer_name: retailerName,
    retailer_mobile: retailerNumber,
    customer_name: name,
    customer_phone: phone,
    address: address,
    payment_status: "Pending",
    confirmation_status: "Pending",
    windows: windowsArr,
    total_amount: total,
    wa_message: msg
  };

  // 1. Open WhatsApp with the message
  let url = `https://wa.me/917304692553?text=${encodeURIComponent(msg)}`;
  window.open(url, '_blank');

  // 2. Send to Google Sheet (only after WhatsApp opened)
  sendOrderToSheet(orderObj);
}

// This function is unchanged:
function sendOrderToSheet(orderObj) {
  fetch('https://shop-tan-nine.vercel.app/api/proxy', {
    method: 'POST',
    body: JSON.stringify(orderObj),
    headers: {'Content-Type': 'application/json'}
  })
  .then(r => r.json())
  .then(res => {
    if(res.success) {
      // Optionally, show a toast/alert: "Order saved in system!"
    }
  })
  .catch(e => {
    // Optionally, notify user/admin if logging to Sheet fails
    console.error('Sheet logging failed:', e);
  });
}

