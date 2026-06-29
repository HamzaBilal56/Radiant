/* =====================================================
   utils.js — Shared Utilities Used By All Modules
   Includes: Pagination, Modal, Toast, Delete
   ===================================================== */

/* Number of records to show per page in all tables */
const PAGE_SIZE = 10;

/* ── PAGINATION ──────────────────────────────────────
   key          → matches the id of the container e.g. "students-pages"
   total        → total number of filtered records
   current      → current page number
   onPageChange → callback function called with new page number
   ─────────────────────────────────────────────────── */
function renderPages(key, total, current, onPageChange) {
  const el = document.getElementById(`${key}-pages`);
  if (!el) return;

  const totalPages = Math.ceil(total / PAGE_SIZE) || 1;
  const start      = total === 0 ? 0 : (current - 1) * PAGE_SIZE + 1;
  const end        = Math.min(current * PAGE_SIZE, total);

  // Build number buttons (with ellipsis for long ranges)
  let numBtns = "";
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || Math.abs(i - current) <= 1) {
      numBtns += `<button class="pg ${i === current ? "active" : ""}"
                    onclick="(${onPageChange})(${i})">${i}</button>`;
    } else if (Math.abs(i - current) === 2) {
      numBtns += `<span style="color:var(--text3);padding:0 4px;line-height:30px">…</span>`;
    }
  }

  el.innerHTML = `
    <span class="pages-info">Showing ${start}–${end} of ${total}</span>
    <div class="pages-btns">
      <button class="pg" onclick="(${onPageChange})(${current - 1})"
        ${current === 1 ? "disabled" : ""}>‹ Prev</button>
      ${numBtns}
      <button class="pg" onclick="(${onPageChange})(${current + 1})"
        ${current === totalPages ? "disabled" : ""}>Next ›</button>
    </div>`;
}

/* ── MODAL ───────────────────────────────────────────
   Only one modal can be open at a time.
   ─────────────────────────────────────────────────── */
let currentModal = null;

function openModal(id) {
  currentModal = id;
  document.getElementById("modal-overlay").style.display = "block";
  document.getElementById(id).classList.add("open");
}

function closeModal() {
  if (currentModal) {
    document.getElementById(currentModal).classList.remove("open");
  }
  document.getElementById("modal-overlay").style.display = "none";
  currentModal = null;
}

// Close modal when clicking the dark overlay behind it
document.addEventListener("DOMContentLoaded", function () {
  document.getElementById("modal-overlay").addEventListener("click", closeModal);
});
/* ── TOAST NOTIFICATIONS ─────────────────────────────
   type: "success" | "error" | "info"
   Auto-disappears after 3.5 seconds.
   ─────────────────────────────────────────────────── */
function toast(msg, type = "info") {
  const icons = { success: "✓", error: "✕", info: "ℹ" };
  const el    = document.createElement("div");
  el.className    = `toast-msg ${type}`;
  el.textContent  = `${icons[type] || "ℹ"} ${msg}`;
  document.getElementById("toast").appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

/* ── DELETE WITH CONFIRMATION ────────────────────────
   type: "student" | "teacher" | "fee"
   id  : record id to delete
   ─────────────────────────────────────────────────── */
function deleteRecord(type, id) {
  const db = getDB();

  // Build a friendly name for the confirmation message
  let name = "this record";
  if (type === "student") {
    const s = db.students.find(x => x.id === id);
    if (s) name = `student "${s.firstName} ${s.lastName}"`;
  }
  if (type === "teacher") {
    const t = db.teachers.find(x => x.id === id);
    if (t) name = `teacher "${t.firstName} ${t.lastName}"`;
  }
  if (type === "fee") name = "this fee record";

  // Show confirmation modal
  document.getElementById("confirm-msg").textContent =
    `Are you sure you want to delete ${name}? This cannot be undone.`;

  document.getElementById("confirm-ok").onclick = () => {
    const db2 = getDB();

    if (type === "student") db2.students   = db2.students.filter(x => x.id !== id);
    if (type === "teacher") db2.teachers   = db2.teachers.filter(x => x.id !== id);
    if (type === "fee")     db2.fees       = db2.fees.filter(x => x.id !== id);

    saveDB(db2);
    closeModal();
    toast("Deleted successfully", "info");

    // Refresh the correct page
    if (type === "student") renderStudents();
    if (type === "teacher") renderTeachers();
    if (type === "fee")     renderFees();
  };

  openModal("modal-confirm");
}
