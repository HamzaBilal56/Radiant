/* =====================================================
   db.js — Database, Seed Data, uid()
   All data is stored in localStorage as JSON.
   ===================================================== */

const DB_KEY = "radiant_db";

/* Get database from localStorage. If empty, seed it first. */
function getDB() {
  const data = localStorage.getItem(DB_KEY);
  return data ? JSON.parse(data) : seedDB();
}

/* Save database back to localStorage. */
function saveDB(db) {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
  } catch (e) {
    toast("Storage full! Delete some records.", "error");
  }
}

/* Generate a short unique ID for new records. */
function uid() {
  return Math.random().toString(36).slice(2, 9);
}

/* ── SEED DATA (runs only on first load) ── */
function seedDB() {
  const classes = [
    "Class 1-A","Class 2-A","Class 3-A","Class 4-A","Class 5-A",
    "Class 6-A","Class 7-A","Class 8-A","Class 9-A","Class 10-A",
    "Class 11-A","Class 12-A"
  ];

  const firstNames = ["Ali","Hamza","Usman","Ahmed","Sara","Fatima","Ayesha","Omar","Hassan","Zara"];
  const lastNames  = ["Khan","Ahmed","Malik","Raza","Sheikh","Qureshi","Siddiqui","Mirza","Butt","Awan"];
  const subjects   = ["Mathematics","Physics","Chemistry","Biology","English","Urdu","Computer Science","History"];
  const months     = ["January","February","March","April","May","June"];

  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  const rnd  = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;

  const db = {
    users: [
      {
        id: "u1",
        name: "Principal Admin",
        email: "admin@radiantschool.school",
        password: "admin123",
        role: "admin"
      }
    ],
    classes,
    students:   [],
    teachers:   [],
    fees:       [],
    attendance: [],
    activities: [
      { text: "Welcome to Radiant School Management System", time: "Just now", color: "#4f7cff" }
    ]
  };

  /* Create 20 sample students */
  for (let i = 0; i < 20; i++) {
    const fn  = pick(firstNames);
    const ln  = pick(lastNames);
    const cls = pick(classes);
    const sid = `S${String(i + 1).padStart(4, "0")}`;
    const dob = `${rnd(2005,2012)}-${String(rnd(1,12)).padStart(2,"0")}-${String(rnd(1,28)).padStart(2,"0")}`;
    const email = `${fn.toLowerCase()}.${ln.toLowerCase()}${sid.toLowerCase()}@radiantschool.school`;

    db.students.push({
      id: uid(), studentId: sid,
      firstName: fn, lastName: ln, dob,
      gender: pick(["Male","Female"]),
      class: cls,
      parentName: `${pick(firstNames)} ${ln}`,
      phone: `+92 3${rnd(10,59)} ${rnd(1000000,9999999)}`,
      email, feeAmount: rnd(400, 700),
      status: "Active",
      admissionDate: `${rnd(2020,2023)}-08-01`
    });

    /* Student login account — email + DOB as password */
    db.users.push({
      id: uid(), name: `${fn} ${ln}`, email,
      password: dob, role: "student",
      studentId: sid, class: cls
    });
  }

  /* Create 8 sample teachers */
  for (let i = 0; i < 8; i++) {
    const fn  = pick(firstNames);
    const ln  = pick(lastNames);
    const sub = subjects[i % subjects.length];
    const tid = `T${String(i + 1).padStart(3, "0")}`;
    const dob = `${rnd(1975,1992)}-${String(rnd(1,12)).padStart(2,"0")}-${String(rnd(1,28)).padStart(2,"0")}`;
    const email = `${fn.toLowerCase()}.${ln.toLowerCase()}${tid.toLowerCase()}@radiantschool.school`;

    db.teachers.push({
      id: uid(), teacherId: tid,
      firstName: fn, lastName: ln, dob,
      subject: sub,
      phone: `+92 3${rnd(10,59)} ${rnd(1000000,9999999)}`,
      salary: rnd(35000, 70000),
      status: "Active",
      joinDate: `${rnd(2015,2022)}-01-01`,
      email
    });

    /* Teacher login account — email + DOB as password */
    db.users.push({
      id: uid(), name: `${fn} ${ln}`, email,
      password: dob, role: "teacher",
      teacherId: tid, subject: sub
    });
  }

  /* Create sample fee records for each student */
  db.students.forEach(s => {
    months.forEach((month, mi) => {
      const paid = Math.random() > 0.25;
      db.fees.push({
        id: uid(), studentId: s.id,
        amount: s.feeAmount, month,
        dueDate: `2025-${String(mi + 1).padStart(2,"0")}-10`,
        status: paid ? "Paid" : (Math.random() > 0.5 ? "Pending" : "Overdue"),
        paidDate: paid ? `2025-${String(mi + 1).padStart(2,"0")}-${rnd(1,10)}` : "",
        receiptNo: `RCP${rnd(10000,99999)}`
      });
    });
  });

  saveDB(db);
  return db;
}
