const MAX_CENTS_DEFAULT = 200000; // 2000.00 — cap is strictly below this value

function toCents(amount) {
  return Math.round(amount * 100);
}

function fromCents(cents) {
  return cents / 100;
}

function formatMoney(cents) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(fromCents(cents));
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Split total into the fewest parts, each strictly below maxPerTx (in cents).
 * Amounts are randomized within valid bounds, not clustered at the cap.
 */
function splitBill(totalCents, maxPerTxCents) {
  if (totalCents <= 0) {
    throw new Error("Enter an amount greater than zero.");
  }
  if (maxPerTxCents <= 1) {
    throw new Error("Max per transaction must be greater than zero.");
  }

  const cap = maxPerTxCents - 1; // strictly under max (e.g. under 2000 → max 1999.99)

  if (totalCents <= cap) {
    return [totalCents];
  }

  const count = Math.ceil(totalCents / cap);
  const parts = [];
  let remaining = totalCents;

  for (let i = 0; i < count - 1; i++) {
    const slotsLeft = count - i;
    const minForThis = Math.max(1, remaining - (slotsLeft - 1) * cap);
    const maxForThis = Math.min(cap, remaining - (slotsLeft - 1));

    if (minForThis > maxForThis) {
      throw new Error("Could not split this amount with the given limit.");
    }

    const minRupee = Math.ceil(minForThis / 100);
    const maxRupee = Math.floor(maxForThis / 100);
    const amount =
      minRupee <= maxRupee
        ? randomInt(minRupee, maxRupee) * 100
        : randomInt(minForThis, maxForThis);
    parts.push(amount);
    remaining -= amount;
  }

  parts.push(remaining);
  return parts;
}

const form = document.getElementById("split-form");
const totalInput = document.getElementById("total");
const maxInput = document.getElementById("max-per-tx");
const resultsEl = document.getElementById("results");
const txList = document.getElementById("tx-list");
const summaryEl = document.getElementById("summary");
const verifyEl = document.getElementById("verify");
const reshuffleBtn = document.getElementById("reshuffle");
const copyAllBtn = document.getElementById("copy-all");

let lastTotalCents = 0;
let lastMaxCents = MAX_CENTS_DEFAULT;
let lastParts = [];

function readInputs() {
  const total = parseFloat(totalInput.value);
  const maxPerTx = parseFloat(maxInput.value);
  if (!Number.isFinite(total) || total <= 0) {
    throw new Error("Enter a valid total amount.");
  }
  if (!Number.isFinite(maxPerTx) || maxPerTx <= 0) {
    throw new Error("Enter a valid max per transaction.");
  }
  return { totalCents: toCents(total), maxCents: toCents(maxPerTx) };
}

function renderParts(parts, totalCents) {
  txList.innerHTML = "";
  parts.forEach((cents, index) => {
    const li = document.createElement("li");
    const isLast = index === parts.length - 1;
    li.innerHTML = `
      <span class="tx-index">#${index + 1}</span>
      <span class="tx-amount">${formatMoney(cents)}${isLast ? ' <span style="font-weight:500;font-size:0.8rem;color:var(--muted)">remaining</span>' : ""}</span>
      <button type="button" class="tx-copy" data-cents="${cents}">Copy</button>
    `;
    txList.appendChild(li);
  });

  const sum = parts.reduce((a, b) => a + b, 0);
  summaryEl.textContent = `${parts.length} transaction${parts.length === 1 ? "" : "s"} · cap under ${formatMoney(lastMaxCents - 1)}`;
  verifyEl.textContent = `Total: ${formatMoney(sum)}${sum === totalCents ? " ✓" : " — mismatch"}`;
  resultsEl.classList.remove("hidden");
  reshuffleBtn.disabled = false;
}

function runSplit() {
  const { totalCents, maxCents } = readInputs();
  lastTotalCents = totalCents;
  lastMaxCents = maxCents;
  lastParts = splitBill(totalCents, maxCents);
  renderParts(lastParts, totalCents);
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  try {
    runSplit();
  } catch (err) {
    alert(err.message);
  }
});

reshuffleBtn.addEventListener("click", () => {
  try {
    lastParts = splitBill(lastTotalCents, lastMaxCents);
    renderParts(lastParts, lastTotalCents);
  } catch (err) {
    alert(err.message);
  }
});

txList.addEventListener("click", (e) => {
  const btn = e.target.closest(".tx-copy");
  if (!btn) return;
  const cents = btn.getAttribute("data-cents");
  const text = fromCents(Number(cents)).toFixed(2);
  navigator.clipboard.writeText(text).then(() => {
    btn.textContent = "Copied";
    setTimeout(() => {
      btn.textContent = "Copy";
    }, 1200);
  });
});

copyAllBtn.addEventListener("click", () => {
  if (!lastParts.length) return;
  const lines = lastParts.map((c, i) => `${i + 1}. ${fromCents(c).toFixed(2)}`);
  navigator.clipboard.writeText(lines.join("\n")).then(() => {
    copyAllBtn.textContent = "Copied";
    setTimeout(() => {
      copyAllBtn.textContent = "Copy all";
    }, 1200);
  });
});
