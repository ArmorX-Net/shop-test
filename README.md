https://vercel.com/

HAVE USED BELOW:
https://shop-tan-nine.vercel.app/api/proxy (THIS IN MAIN ACTUAL APP)

https://shop-test-eosin-one.vercel.app/api/proxy (THIS IN TESTING APP)

ABOVE TWO LINKS NEEDS TO BE REPLACED IN BELOW CODE
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
