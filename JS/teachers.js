/* =====================================================
   teachers.js — Teacher List, Add, Edit, Delete
   ===================================================== */

let teacherPage   = 1;
let editTeacherId = null;

/* ── RENDER TABLE ── */
function renderTeachers() {
  const db      = getDB();
  const search  = document.getElementById("t-search").value.toLowerCase();
  const isAdmin = currentUser.role === "admin";

  const list  = db.teachers.filter(t =>
    !search || `${t.firstName} ${t.lastName} ${t.subject}`.toLowerCase().includes(search)
  );

  const start = (teacherPage - 1) * PAGE_SIZE;
  const page  = list.slice(start, start + PAGE_SIZE);

  document.getElementById("teachers-body").innerHTML = page.length
    ? page.map(t => `
        <tr>
          <td><strong>${t.firstName} ${t.lastName}</strong></td>
          <td style="color:var(--text2);font-size:12px">${t.teacherId}</td>
          <td><span class="badge badge-purple">${t.subject}</span></td>
          <td>${t.phone || "—"}</td>
          <td><span class="badge ${t.status === "Active" ? "badge-green" : "badge-amber"}">${t.status}</span></td>
          <td style="display:flex;gap:4px;flex-wrap:wrap;">
            ${isAdmin ? `
              <button class="btn btn-sm" onclick="openTeacherForm('${t.id}')">Edit</button>
              <button class="btn btn-sm btn-danger" onclick="deleteRecord('teacher','${t.id}')">Del</button>
            ` : "—"}
          </td>
        </tr>`).join("")
    : `<tr><td colspan="6"><div class="empty"><div class="empty-icon">👩‍🏫</div><p>No teachers found</p></div></td></tr>`;

  renderPages("teachers", list.length, teacherPage, p => {
    teacherPage = p;
    renderTeachers();
  });
}

/* ── OPEN ADD / EDIT FORM ── */
function openTeacherForm(id = null) {
  editTeacherId = id;
  document.getElementById("teacher-modal-title").textContent = id ? "Edit Teacher" : "Add Teacher";

  if (id) {
    // Fill form with existing teacher data
    const t = getDB().teachers.find(x => x.id === id);
    if (!t) return;
    document.getElementById("tf-fname").value   = t.firstName;
    document.getElementById("tf-lname").value   = t.lastName;
    document.getElementById("tf-dob").value     = t.dob;
    document.getElementById("tf-subject").value = t.subject;
    document.getElementById("tf-phone").value   = t.phone   || "";
    document.getElementById("tf-salary").value  = t.salary  || "";
    document.getElementById("tf-status").value  = t.status;
    document.getElementById("tf-join").value    = t.joinDate || "";
  } else {
    // Clear form for new teacher
    ["tf-fname","tf-lname","tf-dob","tf-subject","tf-phone","tf-salary","tf-join"]
      .forEach(i => document.getElementById(i).value = "");
    document.getElementById("tf-status").value = "Active";
  }

  // Clear validation errors
  ["tf-fname-e","tf-lname-e","tf-dob-e","tf-subject-e"]
    .forEach(i => document.getElementById(i).textContent = "");

  openModal("modal-teacher");
}

/* ── SAVE TEACHER ── */
function saveTeacher() {
  const fname   = document.getElementById("tf-fname").value.trim();
  const lname   = document.getElementById("tf-lname").value.trim();
  const dob     = document.getElementById("tf-dob").value;
  const subject = document.getElementById("tf-subject").value.trim();

  // Validate required fields
  let valid = true;
  if (!fname)   { document.getElementById("tf-fname-e").textContent   = "Required"; valid = false; }
  if (!lname)   { document.getElementById("tf-lname-e").textContent   = "Required"; valid = false; }
  if (!dob)     { document.getElementById("tf-dob-e").textContent     = "Required (used as login password)"; valid = false; }
  if (!subject) { document.getElementById("tf-subject-e").textContent = "Required"; valid = false; }
  if (!valid) return;

  const db   = getDB();
  const data = {
    firstName: fname,
    lastName:  lname,
    dob,
    subject,
    phone:    document.getElementById("tf-phone").value,
    salary:   document.getElementById("tf-salary").value,
    status:   document.getElementById("tf-status").value,
    joinDate: document.getElementById("tf-join").value
  };

  if (editTeacherId) {
    // Update existing teacher
    const idx = db.teachers.findIndex(t => t.id === editTeacherId);
    if (idx > -1) db.teachers[idx] = { ...db.teachers[idx], ...data };

    // Update password in user account if DOB changed
    const tid  = db.teachers[idx]?.teacherId;
    const uIdx = db.users.findIndex(u => u.teacherId === tid && u.role === "teacher");
    if (uIdx > -1) db.users[uIdx].password = dob;

    toast("Teacher updated successfully", "success");
  } else {
    // Create new teacher
    const tid   = `T${String(db.teachers.length + 1).padStart(3, "0")}`;
    const email = `${fname.toLowerCase()}.${lname.toLowerCase()}${tid.toLowerCase()}@radiantschool.school`;
    db.teachers.push({ id: uid(), teacherId: tid, email, ...data });

    // Create login account — password is their DOB
    db.users.push({
      id: uid(), name: `${fname} ${lname}`, email,
      password: dob, role: "teacher", teacherId: tid, subject
    });

    logActivity(`New teacher ${fname} ${lname} joined (${subject})`, "#a855f7");
    toast(`Teacher added! Login: ${email} / ${dob}`, "success");
  }

  saveDB(db);
  closeModal();
  renderTeachers();
}
