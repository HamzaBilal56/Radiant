/* =====================================================
   fees.js — Fee List, Stats, Add, Edit, Delete
   ===================================================== */

let feePage   = 1;
let editFeeId = null;

/* ── RENDER FEE TABLE + STAT CARDS ── */
function renderFees() {
  const db      = getDB();
  const search  = document.getElementById("f-search").value.toLowerCase();
  const status  = document.getElementById("f-status-filter").value;
  const isAdmin = currentUser.role === "admin";

  /* ── STAT CARDS ── */
  const totalPaid = db.fees
    .filter(f => f.status === "Paid")
    .reduce((sum, f) => sum + Number(f.amount), 0);
  const pendingCount = db.fees.filter(f => f.status === "Pending").length;
  const overdueCount = db.fees.filter(f => f.status === "Overdue").length;

  document.getElementById("fee-stats").innerHTML = `
    <div class="stat-card">
      <div class="stat-icon" style="background:rgba(34,197,94,.15)">💰</div>
      <div>
        <div class="stat-val">$${(totalPaid / 1000).toFixed(1)}k</div>
        <div class="stat-lbl">Collected</div>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon" style="background:rgba(245,158,11,.15)">⏳</div>
      <div>
        <div class="stat-val">${pendingCount}</div>
        <div class="stat-lbl">Pending</div>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon" style="background:rgba(239,68,68,.15)">⚠</div>
      <div>
        <div class="stat-val">${overdueCount}</div>
        <div class="stat-lbl">Overdue</div>
      </div>
    </div>`;

  /* ── FILTER FEE RECORDS ── */
  // Students only see their own fees
  let fees = currentUser.role === "student"
    ? db.fees.filter(f => {
        const s = db.students.find(x => x.studentId === currentUser.studentId);
        return s && f.studentId === s.id;
      })
    : db.fees;

  fees = fees.filter(f => {
    const s    = db.students.find(x => x.id === f.studentId);
    const name = s ? `${s.firstName} ${s.lastName}`.toLowerCase() : "";
    return (!search || name.includes(search))
        && (!status || f.status === status);
  });

  /* ── RENDER TABLE ROWS ── */
  const start = (feePage - 1) * PAGE_SIZE;
  const page  = fees.slice(start, start + PAGE_SIZE);

  document.getElementById("fees-body").innerHTML = page.length
    ? page.map(f => {
        const s      = db.students.find(x => x.id === f.studentId);
        const name   = s ? `${s.firstName} ${s.lastName}` : "Unknown";
        const badgeCls = f.status === "Paid" ? "badge-green"
                       : f.status === "Overdue" ? "badge-red" : "badge-amber";
        return `<tr>
          <td><strong>${name}</strong></td>
          <td>${s ? s.class : "—"}</td>
          <td style="font-weight:600">$${Number(f.amount).toLocaleString()}</td>
          <td>${f.month}</td>
          <td><span class="badge ${badgeCls}">${f.status}</span></td>
          <td style="display:flex;gap:4px;flex-wrap:wrap;">
            ${isAdmin && f.status !== "Paid"
              ? `<button class="btn-success" onclick="markFeePaid('${f.id}')">✓ Paid</button>` : ""}
            ${isAdmin
              ? `<button class="btn btn-sm btn-danger" onclick="deleteRecord('fee','${f.id}')">Del</button>` : ""}
          </td>
        </tr>`;
      }).join("")
    : `<tr><td colspan="6">
         <div class="empty"><div class="empty-icon">💰</div><p>No fee records found</p></div>
       </td></tr>`;

  renderPages("fees", fees.length, feePage, p => {
    feePage = p;
    renderFees();
  });
}

/* ── MARK A FEE AS PAID ── */
function markFeePaid(id) {
  const db  = getDB();
  const idx = db.fees.findIndex(f => f.id === id);
  if (idx > -1) {
    db.fees[idx].status   = "Paid";
    db.fees[idx].paidDate = new Date().toISOString().split("T")[0];
  }
  saveDB(db);
  renderFees();
  toast("Payment marked as paid ✓", "success");
}

/* ── OPEN ADD / EDIT FORM ── */
function openFeeForm(id = null) {
  editFeeId = id;
  document.getElementById("fee-modal-title").textContent = id ? "Edit Payment" : "Record Payment";

  if (!id) {
    // Defaults for new fee record
    document.getElementById("ff-student").value = "";
    document.getElementById("ff-amount").value  = "";
    document.getElementById("ff-status").value  = "Paid";
    document.getElementById("ff-due").value     = new Date().toISOString().split("T")[0];

    // Pre-select current month
    const monthNames = ["January","February","March","April","May","June",
                        "July","August","September","October","November","December"];
    document.getElementById("ff-month").value = monthNames[new Date().getMonth()];
  }

  // Clear validation errors
  ["ff-student-e","ff-amount-e"].forEach(i =>
    document.getElementById(i).textContent = ""
  );

  openModal("modal-fee");
}

/* ── SAVE FEE RECORD ── */
function saveFee() {
  const studentId = document.getElementById("ff-student").value;
  const amount    = document.getElementById("ff-amount").value;

  // Validate
  let valid = true;
  if (!studentId)              { document.getElementById("ff-student-e").textContent = "Select a student"; valid = false; }
  if (!amount || Number(amount) <= 0) { document.getElementById("ff-amount-e").textContent = "Enter a valid amount"; valid = false; }
  if (!valid) return;

  const db      = getDB();
  const student = db.students.find(s => s.id === studentId);
  const feeData = {
    studentId,
    amount:    Number(amount),
    month:     document.getElementById("ff-month").value,
    dueDate:   document.getElementById("ff-due").value,
    status:    document.getElementById("ff-status").value,
    receiptNo: `RCP${Math.floor(Math.random() * 90000) + 10000}`
  };

  if (editFeeId) {
    // Update existing record
    const idx = db.fees.findIndex(f => f.id === editFeeId);
    if (idx > -1) db.fees[idx] = { ...db.fees[idx], ...feeData };
    toast("Payment updated", "success");
  } else {
    // Add new record
    db.fees.push({ id: uid(), ...feeData });

    // Log activity only for paid fees
    if (student && feeData.status === "Paid") {
      logActivity(
        `Fee $${amount} received from ${student.firstName} ${student.lastName}`,
        "#4f7cff"
      );
    }
    toast("Payment recorded successfully", "success");
  }

  saveDB(db);
  closeModal();
  renderFees();
}
