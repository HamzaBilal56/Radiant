/* =====================================================
   students.js — Student List, Add, Edit, Delete
   ===================================================== */

let studentPage  = 1;
let editStudentId = null;

/* ── RENDER TABLE ── */
function renderStudents() {
  const db      = getDB();
  const search  = document.getElementById("s-search").value.toLowerCase();
  const cls     = document.getElementById("s-class-filter").value;
  const isAdmin = currentUser.role === "admin";

  // Students can only see their own record
  let list = currentUser.role === "student"
    ? db.students.filter(s => s.studentId === currentUser.studentId)
    : db.students.filter(s =>
        (!search || `${s.firstName} ${s.lastName} ${s.studentId}`.toLowerCase().includes(search))
        && (!cls || s.class === cls)
      );

  const start = (studentPage - 1) * PAGE_SIZE;
  const page  = list.slice(start, start + PAGE_SIZE);

  document.getElementById("students-body").innerHTML = page.length
    ? page.map(s => `
        <tr>
          <td><strong>${s.firstName} ${s.lastName}</strong></td>
          <td style="color:var(--text2);font-size:12px">${s.studentId}</td>
          <td>${s.class}</td>
          <td>${s.parentName || "—"}</td>
          <td><span class="badge ${s.status === "Active" ? "badge-green" : "badge-red"}">${s.status}</span></td>
          <td style="display:flex;gap:4px;flex-wrap:wrap;">
            ${isAdmin ? `
              <button class="btn btn-sm" onclick="openStudentForm('${s.id}')">Edit</button>
              <button class="btn btn-sm btn-danger" onclick="deleteRecord('student','${s.id}')">Del</button>
            ` : "—"}
          </td>
        </tr>`).join("")
    : `<tr><td colspan="6"><div class="empty"><div class="empty-icon">🎓</div><p>No students found</p></div></td></tr>`;

  renderPages("students", list.length, studentPage, p => {
    studentPage = p;
    renderStudents();
  });
}

/* ── OPEN ADD / EDIT FORM ── */
function openStudentForm(id = null) {
  editStudentId = id;
  document.getElementById("student-modal-title").textContent = id ? "Edit Student" : "Add Student";

  if (id) {
    // Fill form with existing student data
    const s = getDB().students.find(x => x.id === id);
    if (!s) return;
    document.getElementById("sf-fname").value     = s.firstName;
    document.getElementById("sf-lname").value     = s.lastName;
    document.getElementById("sf-dob").value       = s.dob;
    document.getElementById("sf-gender").value    = s.gender || "";
    document.getElementById("sf-class").value     = s.class;
    document.getElementById("sf-parent").value    = s.parentName || "";
    document.getElementById("sf-phone").value     = s.phone || "";
    document.getElementById("sf-fee").value       = s.feeAmount || "";
    document.getElementById("sf-status").value    = s.status;
    document.getElementById("sf-admission").value = s.admissionDate || "";
  } else {
    // Clear form for new student
    ["sf-fname","sf-lname","sf-dob","sf-parent","sf-phone","sf-fee","sf-admission"]
      .forEach(i => document.getElementById(i).value = "");
    document.getElementById("sf-gender").value = "";
    document.getElementById("sf-class").value  = "";
    document.getElementById("sf-status").value = "Active";
  }

  // Clear validation errors
  ["sf-fname-e","sf-lname-e","sf-dob-e","sf-class-e"]
    .forEach(i => document.getElementById(i).textContent = "");

  openModal("modal-student");
}

/* ── SAVE STUDENT ── */
function saveStudent() {
  const fname = document.getElementById("sf-fname").value.trim();
  const lname = document.getElementById("sf-lname").value.trim();
  const dob   = document.getElementById("sf-dob").value;
  const cls   = document.getElementById("sf-class").value;

  // Validate required fields
  let valid = true;
  if (!fname) { document.getElementById("sf-fname-e").textContent = "Required"; valid = false; }
  if (!lname) { document.getElementById("sf-lname-e").textContent = "Required"; valid = false; }
  if (!dob)   { document.getElementById("sf-dob-e").textContent   = "Required (used as login password)"; valid = false; }
  if (!cls)   { document.getElementById("sf-class-e").textContent = "Required"; valid = false; }
  if (!valid) return;

  const db   = getDB();
  const data = {
    firstName:     fname,
    lastName:      lname,
    dob,
    class:         cls,
    gender:        document.getElementById("sf-gender").value,
    parentName:    document.getElementById("sf-parent").value,
    phone:         document.getElementById("sf-phone").value,
    feeAmount:     document.getElementById("sf-fee").value,
    status:        document.getElementById("sf-status").value,
    admissionDate: document.getElementById("sf-admission").value
  };

  if (editStudentId) {
    // Update existing student
    const idx = db.students.findIndex(s => s.id === editStudentId);
    if (idx > -1) db.students[idx] = { ...db.students[idx], ...data };

    // Update password in user account if DOB changed
    const sid  = db.students[idx]?.studentId;
    const uIdx = db.users.findIndex(u => u.studentId === sid && u.role === "student");
    if (uIdx > -1) db.users[uIdx].password = dob;

    logActivity(`Student ${fname} ${lname} updated`, "#4f7cff");
    toast("Student updated successfully", "success");
  } else {
    // Create new student
    const sid   = `S${String(db.students.length + 1).padStart(4, "0")}`;
    const email = `${fname.toLowerCase()}.${lname.toLowerCase()}${sid.toLowerCase()}@radiantschool.school`;
    db.students.push({ id: uid(), studentId: sid, email, ...data });

    // Create login account — password is their DOB
    db.users.push({
      id: uid(), name: `${fname} ${lname}`, email,
      password: dob, role: "student", studentId: sid, class: cls
    });

    logActivity(`New student ${fname} ${lname} enrolled`, "#22c55e");
    toast(`Student added! Login: ${email} / ${dob}`, "success");
  }

  saveDB(db);
  closeModal();
  renderStudents();
}
