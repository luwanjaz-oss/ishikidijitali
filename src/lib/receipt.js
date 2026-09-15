const WHATSAPP_NUMBER = "255754282086";

// RISITI (RECEIPT) - inatengeneza picha (PNG) yenye logo na muundo mzuri
// (red/black/white, kama ilivyokubaliwa), kwa Canvas ya browser (hauitaji
// maktaba ya ziada). Inapakuliwa moja kwa moja mteja anapobonyeza "Pakua Risiti".
function drawRoundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function fmtTZSReceipt(n) {
  return (n || 0).toLocaleString("en-US") + " TZS";
}

// Namba ya uthibitisho ya kipekee (haibadiliki kwa oda hiyo hiyo) - kwa
// ajili ya kuonyesha uhalali wa risiti (kinga dhidi ya kughushiwa).
function generateAuthCode(order) {
  const base = `IKD-${order.id || "0"}-${order.customerPhone || ""}-${order.total || 0}`;
  let hash = 0;
  for (let i = 0; i < base.length; i++) {
    hash = (hash * 31 + base.charCodeAt(i)) >>> 0;
  }
  return hash.toString(36).toUpperCase().slice(0, 6);
}

function loadImagePromise(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

export async function downloadReceipt(order) {
  if (!order) return;
  const RED = "#E5383B";
  const BLACK = "#12182B";
  const GRAY = "#6B7280";
  const LIGHT = "#F4F4F4";

  const width = 750;
  const rowH = 42;
  const itemsCount = Math.max(order.items.length, 1);
  const itemsH = itemsCount * rowH;
  const height = 800 + itemsH;

  const authCode = generateAuthCode(order);
  const qrData = encodeURIComponent(`https://wa.me/${WHATSAPP_NUMBER}?text=Nataka%20kufuatilia%20oda%20namba%20${order.id || ""}`);
  const qrImg = await loadImagePromise(`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${qrData}`);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.textBaseline = "alphabetic";

  // BACKGROUND
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, width, height);

  // WATERMARK (kinga dhidi ya kughushiwa) - "ISHI KIDIJITALI" nyepesi,
  // imepindishwa, imerudiwa kama muundo chinichini.
  ctx.save();
  ctx.globalAlpha = 0.05;
  ctx.fillStyle = "#000000";
  ctx.font = "bold 28px Arial";
  ctx.translate(width / 2, height / 2);
  ctx.rotate(-Math.PI / 8);
  for (let wy = -height; wy < height; wy += 70) {
    ctx.fillText("ISHI KIDIJITALI  •  ORIGINAL RECEIPT", -width, wy);
  }
  ctx.restore();
  ctx.globalAlpha = 1;

  // LOGO: red box "I" + "SHI" (black) + "KIDIJITALI" (black, bigger)
  ctx.fillStyle = RED;
  drawRoundedRect(ctx, 40, 36, 62, 62, 6);
  ctx.fill();
  ctx.fillStyle = "#000000";
  ctx.font = "italic 900 40px Georgia";
  ctx.fillText("I", 60, 82);

  ctx.font = "900 26px Arial";
  ctx.fillStyle = "#000000";
  ctx.fillText("SHI", 112, 62);
  ctx.font = "900 30px Arial";
  ctx.fillText("KIDIJITALI", 112, 92);
  ctx.font = "bold 10px Arial";
  ctx.fillStyle = GRAY;
  ctx.fillText("L I F E S T Y L E   S E R V I C E", 113, 106);

  // TOP RIGHT TAGLINE
  ctx.textAlign = "right";
  ctx.font = "900 15px Arial";
  ctx.fillStyle = "#000000";
  ctx.fillText("SHOP SMART", width - 40, 52);
  ctx.fillStyle = RED;
  ctx.fillText("LIVE DIGITAL", width - 40, 72);
  ctx.strokeStyle = RED;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(width - 40 - 90, 82);
  ctx.lineTo(width - 40, 82);
  ctx.stroke();
  ctx.textAlign = "left";

  let y = 168;

  // RECEIPT title
  ctx.fillStyle = "#000000";
  ctx.font = "900 42px Arial";
  ctx.fillText("RECEIPT", 40, y);

  // No / Date / Time (right aligned, same row area)
  ctx.textAlign = "left";
  ctx.font = "bold 13px Arial";
  ctx.fillStyle = "#000000";
  const infoX = width - 260;
  let infoY = y - 34;
  ctx.fillText("No:", infoX, infoY);
  ctx.fillStyle = RED;
  ctx.font = "bold 13px Arial";
  ctx.fillText(`IKD${String(order.id || "000000").padStart(6, "0")}`, infoX + 45, infoY);
  infoY += 20;
  ctx.fillStyle = "#000000";
  ctx.fillText("Date:", infoX, infoY);
  ctx.font = "13px Arial";
  const d = order.date ? new Date(order.date) : new Date();
  ctx.fillText(d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }), infoX + 45, infoY);
  infoY += 20;
  ctx.font = "bold 13px Arial";
  ctx.fillText("Time:", infoX, infoY);
  ctx.font = "13px Arial";
  ctx.fillText(d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }), infoX + 45, infoY);
  infoY += 24;

  // STEMPU YA UTHIBITISHO - "✓ ODA IMETHIBITISHWA"
  ctx.save();
  ctx.strokeStyle = "#16A34A";
  ctx.lineWidth = 1.5;
  const stampText = "✓ ODA IMETHIBITISHWA";
  ctx.font = "bold 11px Arial";
  const stampW = ctx.measureText(stampText).width + 20;
  drawRoundedRect(ctx, infoX, infoY - 14, stampW, 22, 11);
  ctx.stroke();
  ctx.fillStyle = "#16A34A";
  ctx.fillText(stampText, infoX + 10, infoY + 1);
  ctx.restore();
  infoY += 26;

  ctx.font = "10px Arial";
  ctx.fillStyle = GRAY;
  ctx.fillText(`Auth Code: ${authCode}`, infoX, infoY);

  y += 20;
  ctx.font = "14px Arial";
  ctx.fillStyle = GRAY;
  ctx.fillText("Thank you for shopping with", 40, y);
  y += 22;
  ctx.font = "bold 16px Arial";
  ctx.fillStyle = RED;
  ctx.fillText("ishikidijitali.com", 40, y);

  y += 38;
  // Customer Name / Phone / Location lines
  ctx.font = "bold 13px Arial";
  ctx.fillStyle = "#000000";
  function underlineField(label, value, yy) {
    ctx.fillStyle = "#000000";
    ctx.font = "bold 13px Arial";
    ctx.fillText(label, 40, yy);
    const labelW = ctx.measureText(label).width;
    ctx.strokeStyle = "#CCCCCC";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(40 + labelW + 10, yy + 2);
    ctx.lineTo(width - 40, yy + 2);
    ctx.stroke();
    if (value) {
      ctx.font = "13px Arial";
      ctx.fillStyle = "#000000";
      ctx.fillText(value, 40 + labelW + 18, yy);
    }
  }
  underlineField("Customer Name:", order.customerName, y);
  y += 32;
  underlineField("Phone:", order.customerPhone, y);
  y += 32;
  const locationVal = `${order.customerMkoa || ""}${order.customerAddress ? " - " + order.customerAddress : ""}`;
  underlineField("Location:", locationVal, y);

  y += 44;

  // TABLE HEADER (red bg, white bold text)
  const col1 = 40, col2 = 100, col3 = 430, col4 = 530, colEnd = width - 40;
  const tableTop = y;
  ctx.fillStyle = RED;
  ctx.fillRect(40, tableTop, width - 80, 40);
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 13px Arial";
  ctx.textAlign = "left";
  ctx.fillText("#", col1 + 10, tableTop + 25);
  ctx.fillText("Product Name", col2, tableTop + 25);
  ctx.fillText("Qty", col3, tableTop + 25);
  ctx.fillText("Unit Price (TZS)", col4, tableTop + 25);
  ctx.textAlign = "right";
  ctx.fillText("Total (TZS)", colEnd - 4, tableTop + 25);
  ctx.textAlign = "left";

  y = tableTop + 40;

  // TABLE ROWS (zebra)
  order.items.forEach((item, i) => {
    const lineTotal = (item.price || 0) * (item.qty || 1);
    ctx.fillStyle = i % 2 === 0 ? "#FFFFFF" : LIGHT;
    ctx.fillRect(40, y, width - 80, rowH);
    ctx.strokeStyle = "#E5E5E5";
    ctx.strokeRect(40, y, width - 80, rowH);

    ctx.fillStyle = "#000000";
    ctx.font = "bold 12px Arial";
    ctx.fillText(String(i + 1), col1 + 10, y + 24);

    let name = item.name || "";
    const optionsParts = [];
    if (item.selectedSize) optionsParts.push(`Size: ${item.selectedSize}`);
    if (item.selectedColor) optionsParts.push(`Rangi: ${item.selectedColor}`);
    if (item.selectedType) optionsParts.push(item.selectedType);
    if (item.selectedOptions) {
      Object.entries(item.selectedOptions).forEach(([label, val]) => {
        if (val) optionsParts.push(`${label}: ${val}`);
      });
    }
    if (optionsParts.length > 0) name += ` (${optionsParts.join(", ")})`;
    if (name.length > 46) name = name.slice(0, 46) + "…";
    ctx.font = "12px Arial";
    ctx.fillText(name, col2, y + 24);

    ctx.fillText(String(item.qty || 1), col3, y + 24);
    ctx.fillText(fmtTZSReceipt(item.price), col4, y + 24);

    ctx.font = "bold 12px Arial";
    ctx.textAlign = "right";
    ctx.fillText(fmtTZSReceipt(lineTotal), colEnd - 4, y + 24);
    ctx.textAlign = "left";

    y += rowH;
  });

  // SUBTOTAL / SHIPPING / TOTAL rows (right-side summary spanning col4-colEnd)
  function summaryRow(label, value, bg, textColor, bold) {
    ctx.fillStyle = bg;
    ctx.fillRect(col4 - 20, y, colEnd - (col4 - 20), rowH - 6);
    ctx.fillStyle = textColor;
    ctx.font = (bold ? "bold " : "") + "13px Arial";
    ctx.fillText(label, col4, y + 24);
    ctx.textAlign = "right";
    ctx.fillText(value, colEnd - 4, y + 24);
    ctx.textAlign = "left";
    y += rowH - 6;
  }
  summaryRow("Subtotal", fmtTZSReceipt(order.subtotal), LIGHT, "#000000", false);
  summaryRow("Shipping", fmtTZSReceipt(order.shippingFee), LIGHT, "#000000", false);
  summaryRow("TOTAL (TZS)", fmtTZSReceipt(order.total), RED, "#FFFFFF", true);

  y += 46;

  // "Asante!" handwritten-style + red underline swash
  ctx.font = "italic bold 34px Georgia";
  ctx.fillStyle = "#000000";
  ctx.fillText("Asante!", 40, y);
  ctx.strokeStyle = RED;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(40, y + 8);
  ctx.quadraticCurveTo(90, y + 16, 140, y + 8);
  ctx.stroke();

  y += 30;
  ctx.font = "13px Arial";
  ctx.fillStyle = GRAY;
  ctx.fillText("For choosing Ishikidijitali", 40, y);
  y += 18;
  ctx.fillText("Your Lifestyle Partner", 40, y);
  ctx.strokeStyle = RED;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(40, y + 6);
  ctx.lineTo(180, y + 6);
  ctx.stroke();

  y += 50;

  // QR CODE - "Scan & Fuatilia Oda Yako" (inaongeza uaminifu na urahisi)
  const qrBoxY = y;
  if (qrImg) {
    ctx.drawImage(qrImg, 40, qrBoxY, 100, 100);
  } else {
    ctx.strokeStyle = "#CCCCCC";
    ctx.strokeRect(40, qrBoxY, 100, 100);
  }
  ctx.font = "bold 13px Arial";
  ctx.fillStyle = "#000000";
  ctx.fillText("Scan & Fuatilia Oda Yako", 156, qrBoxY + 24);
  ctx.font = "12px Arial";
  ctx.fillStyle = RED;
  ctx.fillText("ishikidijitali.com", 156, qrBoxY + 44);
  ctx.font = "11px Arial";
  ctx.fillStyle = GRAY;
  ctx.fillText("Piga picha (scan) QR hii kwa simu yako", 156, qrBoxY + 64);
  ctx.fillText("kufuatilia hali ya mzigo wako moja kwa moja.", 156, qrBoxY + 80);

  y += 116;

  // MASHARTI (Terms) - inajenga uaminifu kwa kuweka wazi sera ya kurudisha
  ctx.font = "10px Arial";
  ctx.fillStyle = GRAY;
  ctx.fillText(
    "Masharti: Bidhaa zenye kasoro zinaweza kurudishwa ndani ya siku 3 baada ya kupokea. Piga simu kabla ya kurudisha bidhaa.",
    40,
    y
  );
  y += 26;

  // ICON ROW: Gadgets/Fashion, Home & Living/Beauty, Fast/Delivery, Trusted/Service
  const icons = [
    { emoji: "🛒", l1: "GADGETS", l2: "FASHION" },
    { emoji: "🏠", l1: "HOME & LIVING", l2: "BEAUTY" },
    { emoji: "🚚", l1: "FAST", l2: "DELIVERY" },
    { emoji: "✅", l1: "TRUSTED", l2: "SERVICE" },
  ];
  const iconSpacing = (width - 80) / icons.length;
  icons.forEach((ic, i) => {
    const cx = 40 + iconSpacing * i;
    ctx.font = "26px Arial";
    ctx.fillStyle = "#000000";
    ctx.fillText(ic.emoji, cx, y);
    ctx.font = "bold 11px Arial";
    ctx.fillText(ic.l1, cx + 34, y - 8);
    ctx.fillText(ic.l2, cx + 34, y + 8);
  });

  y += 40;

  // FOOTER BAR (red)
  const footerH = 60;
  ctx.fillStyle = RED;
  ctx.fillRect(0, height - footerH, width, footerH);
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 13px Arial";
  ctx.textAlign = "left";
  ctx.fillText("🌐 www.ishikidijitali.com", 40, height - footerH / 2 - 2);
  ctx.fillText(`📞 ${WHATSAPP_NUMBER}`, 320, height - footerH / 2 - 2);
  ctx.textAlign = "right";
  ctx.fillText("IG • FB • TikTok • YouTube  |  IshiKidijitali", width - 40, height - footerH / 2 - 2);
  ctx.textAlign = "left";

  const link = document.createElement("a");
  link.download = `Risiti-IshiKidijitali-Oda${order.id || ""}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}