/* eslint-disable no-console */
/**
 * Seed script — drops & reseeds a demo database.
 * Usage: npm run seed
 * All data is fake. Demo credentials are printed at the end.
 */
const { connectDB, disconnectDB } = require('./config/db');
const User = require('./models/user.model');
const Patient = require('./models/patient.model');
const Doctor = require('./models/doctor.model');
const Department = require('./models/department.model');
const Staff = require('./models/staff.model');
const Schedule = require('./models/schedule.model');
const Appointment = require('./models/appointment.model');
const Queue = require('./models/queue.model');
const MedicalRecord = require('./models/medicalRecord.model');
const Prescription = require('./models/prescription.model');
const Medicine = require('./models/medicine.model');
const Payment = require('./models/payment.model');
const Notification = require('./models/notification.model');
const Review = require('./models/review.model');
const AuditLog = require('./models/auditLog.model');

const DEPARTMENTS = [
  { name: 'Cardiology', description: 'Heart and cardiovascular care' },
  { name: 'Neurology', description: 'Brain and nervous system care' },
  { name: 'Pediatrics', description: 'Medical care of infants, children, adolescents' },
  { name: 'Orthopedics', description: 'Bones, joints, and muscles' },
  { name: 'Dermatology', description: 'Skin, hair, and nails' },
  { name: 'General Medicine', description: 'Primary care and internal medicine' },
];

const DOCTOR_FIRST = ['Dr. Farhan', 'Dr. Nusrat', 'Dr. Imran', 'Dr. Sadia', 'Dr. Tanvir', 'Dr. Rafia', 'Dr. Zubair', 'Dr. Meher', 'Dr. Ayesha', 'Dr. Shafiq', 'Dr. Nadia', 'Dr. Kamal'];
const DOCTOR_LAST = ['Ahmed', 'Islam', 'Rahman', 'Hossain', 'Chowdhury', 'Sultana', 'Khan', 'Begum', 'Karim', 'Uddin', 'Akter', 'Mahmud'];
const SPECIALIZATIONS = {
  Cardiology: ['Interventional Cardiology', 'Cardiac Electrophysiology', 'Heart Failure'],
  Neurology: ['Stroke Neurology', 'Epilepsy', 'Movement Disorders'],
  Pediatrics: ['Neonatology', 'General Pediatrics', 'Pediatric Cardiology'],
  Orthopedics: ['Joint Replacement', 'Sports Medicine', 'Spine Surgery'],
  Dermatology: ['Cosmetic Dermatology', 'Pediatric Dermatology'],
  'General Medicine': ['Internal Medicine', 'Preventive Medicine', 'Diabetic Care'],
};

const MEDICINES = [
  ['Paracetamol 500mg', 'Acetaminophen', 'PAIN_RELIEF', 15, 500, 50],
  ['Napa Extra 500mg', 'Paracetamol', 'PAIN_RELIEF', 20, 300, 40],
  ['Ace Plus 50mg', 'Aceclofenac', 'PAIN_RELIEF', 25, 200, 40],
  ['Montair 10mg', 'Montelukast', 'ALLERGY', 35, 150, 30],
  ['Fexo 120mg', 'Fexofenadine', 'ALLERGY', 30, 180, 30],
  ['Omeprazole 20mg', 'Omeprazole', 'GASTRO', 25, 260, 30],
  ['Pantoprazole 40mg', 'Pantoprazole', 'GASTRO', 28, 220, 30],
  ['Metformin 500mg', 'Metformin', 'DIABETES', 18, 400, 40],
  ['Glibenclamide 5mg', 'Glibenclamide', 'DIABETES', 12, 120, 30],
  ['Amlodipine 5mg', 'Amlodipine', 'CARDIAC', 22, 350, 30],
  ['Losartan 50mg', 'Losartan', 'CARDIAC', 24, 300, 30],
  ['Atorvastatin 10mg', 'Atorvastatin', 'CHOLESTEROL', 32, 280, 30],
  ['Rosuvastatin 10mg', 'Rosuvastatin', 'CHOLESTEROL', 36, 190, 30],
  ['Azithromycin 500mg', 'Azithromycin', 'ANTIBIOTIC', 40, 150, 20],
  ['Amoxicillin 500mg', 'Amoxicillin', 'ANTIBIOTIC', 22, 260, 30],
  ['Ciprofloxacin 500mg', 'Ciprofloxacin', 'ANTIBIOTIC', 28, 140, 20],
  ['Salbutamol Inhaler', 'Salbutamol', 'RESPIRATORY', 180, 80, 15],
  ['Prednisolone 5mg', 'Prednisolone', 'STEROID', 15, 120, 20],
  ['Cetirizine 10mg', 'Cetirizine', 'ALLERGY', 8, 400, 30],
  ['Vitamin C 250mg', 'Ascorbic Acid', 'VITAMIN', 15, 600, 50],
  ['Calcium+D3 Tablet', 'Calcium Carbonate', 'VITAMIN', 25, 320, 40],
  ['Iron+Folic Acid', 'Ferrous Fumarate', 'VITAMIN', 20, 280, 40],
  ['Ibuprofen 400mg', 'Ibuprofen', 'PAIN_RELIEF', 18, 240, 30],
  ['Diclofenac Gel', 'Diclofenac', 'PAIN_RELIEF', 65, 90, 20],
  ['Insulin 100iu/ml', 'Insulin', 'DIABETES', 350, 60, 15],
  ['Diazepam 5mg', 'Diazepam', 'NEURO', 30, 80, 15],
  ['Metoclopramide 10mg', 'Metoclopramide', 'GASTRO', 12, 150, 20],
  ['Digoxin 0.25mg', 'Digoxin', 'CARDIAC', 20, 100, 15],
  ['Sertraline 50mg', 'Sertraline', 'PSYCH', 45, 130, 20],
  ['Augmentin 625mg', 'Amoxicillin+Clavulanate', 'ANTIBIOTIC', 60, 110, 20],
];

const FIRST = ['Rahim', 'Karim', 'Salam', 'Jabbar', 'Rashid', 'Halima', 'Fatema', 'Rokeya', 'Jahanara', 'Mokbul', 'Latif', 'Shirin', 'Nasrin', 'Tania', 'Sonia', 'Bakul', 'Shahin', 'Rafiq', 'Anwar', 'Salma', 'Hasan', 'Shumon', 'Nilufa', 'Ayesha', 'Kabir', 'Sujon', 'Mila', 'Tanjila', 'Arif', 'Sultana'];
const LAST = ['Mia', 'Sarkar', 'Pramanik', 'Sarder', 'Sheikh', 'Mollah', 'Gazi', 'Talukder', 'Bhuiyan', 'Sikder', 'Haque', 'Siddique', 'Choudhury', 'Parvez', 'Manik'];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  d.setHours(0, 0, 0, 0);
  return d;
}

function toTime(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

async function main() {
  console.log('Connecting to database...');
  await connectDB();

  // Drop all collections
  const models = [User, Patient, Doctor, Department, Staff, Schedule, Appointment, Queue, MedicalRecord, Prescription, Medicine, Payment, Notification, Review, AuditLog];
  await Promise.all(models.map((m) => m.deleteMany({})));

  console.log('Seeding departments...');
  const departments = await Department.insertMany(DEPARTMENTS);
  const deptMap = Object.fromEntries(departments.map((d) => [d.name, d]));

  console.log('Seeding admin + staff...');
  const admin = await User.create({
    fullName: 'System Administrator',
    email: 'admin@hospital.test',
    phone: '01700000000',
    passwordHash: 'admin12345',
    role: 'ADMIN',
  });
  const staffRoles = [];
  for (let i = 0; i < 2; i++) {
    const u = await User.create({
      fullName: `Receptionist ${i + 1}`,
      email: `reception${i + 1}@hospital.test`,
      phone: `0170000000${i + 1}`,
      passwordHash: 'staff12345',
      role: 'RECEPTIONIST',
    });
    staffRoles.push(u);
    await Staff.create({ userId: u._id, staffType: 'RECEPTIONIST', shift: i % 2 ? 'EVENING' : 'DAY' });
  }
  for (let i = 0; i < 2; i++) {
    const u = await User.create({
      fullName: `Pharmacist ${i + 1}`,
      email: `pharmacist${i + 1}@hospital.test`,
      phone: `0170000001${i + 1}`,
      passwordHash: 'staff12345',
      role: 'PHARMACIST',
    });
    staffRoles.push(u);
    await Staff.create({ userId: u._id, staffType: 'PHARMACIST', shift: 'DAY' });
  }

  console.log('Seeding doctors...');
  const doctors = [];
  const allDeptNames = Object.keys(SPECIALIZATIONS);
  for (let i = 0; i < 12; i++) {
    const deptName = allDeptNames[i % allDeptNames.length];
    const firstName = DOCTOR_FIRST[i % DOCTOR_FIRST.length];
    const lastName = DOCTOR_LAST[(i * 3) % DOCTOR_LAST.length];
    const u = await User.create({
      fullName: `${firstName} ${lastName}`,
      email: `doctor${i + 1}@hospital.test`,
      phone: `0180000000${i}`,
      passwordHash: 'doctor12345',
      role: 'DOCTOR',
    });
    const doctor = await Doctor.create({
      userId: u._id,
      departmentId: deptMap[deptName]._id,
      specialization: pick(SPECIALIZATIONS[deptName]),
      qualifications: ['MBBS', pick(['FCPS', 'MD', 'MS', 'FRCS'])],
      experienceYears: 5 + (i % 20),
      consultationFee: 300 + (i % 7) * 150,
      bio: `${firstName} specializes in ${pick(SPECIALIZATIONS[deptName]).toLowerCase()}.`,
    });
    doctors.push(doctor);
  }

  console.log('Seeding patients...');
  const patients = [];
  for (let i = 0; i < 30; i++) {
    const u = await User.create({
      fullName: `${pick(FIRST)} ${pick(LAST)}`,
      email: `patient${i + 1}@hospital.test`,
      phone: `0190000000${String(i).padStart(2, '0')}`,
      passwordHash: 'patient12345',
      role: 'PATIENT',
    });
    const p = await Patient.create({
      userId: u._id,
      dateOfBirth: addDays(new Date(), -Math.floor(Math.random() * 80 * 365)),
      gender: pick(['MALE', 'FEMALE', 'OTHER']),
      bloodGroup: pick(['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-']),
      address: { street: `${i + 1} Street`, city: 'Dhaka', district: pick(['Dhaka', 'Gazipur', 'Narayanganj', 'Tangail']) },
      emergencyContact: { name: `${pick(FIRST)} ${pick(LAST)}`, phone: `019100000${i}`, relation: 'Family' },
      allergies: i % 5 === 0 ? ['Penicillin'] : [],
      chronicConditions: i % 7 === 0 ? ['Hypertension'] : [],
    });
    patients.push(p);
  }

  console.log('Seeding medicines...');
  const medicines = [];
  for (const [name, generic, cat, price, stock, minStock] of MEDICINES) {
    const expiry = addDays(new Date(), Math.floor(Math.random() * 400) - 30);
    const med = await Medicine.create({
      name,
      genericName: generic,
      category: cat,
      manufacturer: pick(['Square Pharma', 'Beximco', 'Incepta', 'ACI', 'Renata', 'Eskayef']),
      price,
      stock,
      minStock,
      batchNumber: `B${Math.floor(1000 + Math.random() * 9000)}`,
      expiryDate: expiry < new Date() ? null : expiry,
      supplier: pick(['Medisales BD', 'Hospitech', 'Pantho']),
    });
    medicines.push(med);
  }

  console.log('Seeding schedules + appointments...');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const allSchedules = [];
  const bookedAppointments = [];

  for (const doctor of doctors) {
    const start = 9 * 60 + (doctors.indexOf(doctor) % 3) * 60;
    const end = start + 4 * 60;
    for (let d = -3; d <= 7; d++) {
      const date = addDays(today, d);
      const day = date.getDay();
      if (day === 0) continue;
      const schedule = new Schedule({
        doctorId: doctor._id,
        date,
        startTime: toTime(start),
        endTime: toTime(end),
        slotDurationMinutes: 15,
        breaks: [],
      });
      schedule.generateSlots();
      try {
        await schedule.save();
      } catch (err) {
        continue;
      }
      allSchedules.push(schedule);
    }
  }

  const patientFor = (i) => patients[i % patients.length];
  let apptCounter = 0;
  for (const schedule of allSchedules) {
    if (apptCounter >= 55) break;
    const dayOffset = Math.round((schedule.date - today) / 86400000);
    const slotCount = schedule.slots.length;
    const toBook = Math.min(2 + Math.floor(Math.random() * 3), slotCount);
    for (let s = 0; s < toBook && apptCounter < 55; s++) {
      const slot = schedule.slots[s];
      if (slot.status !== 'AVAILABLE') continue;
      const patient = patientFor(apptCounter + s);
      const doctor = doctors.find((doc) => doc._id.toString() === schedule.doctorId.toString());
      const dept = departments.find((dep) => dep._id.toString() === doctor.departmentId.toString());
      const isPast = dayOffset < 0;
      const isToday = dayOffset === 0;
      const status = isPast
        ? pick(['COMPLETED', 'COMPLETED', 'COMPLETED', 'NO_SHOW', 'CANCELLED'])
        : isToday
          ? pick(['BOOKED', 'CHECKED_IN', 'IN_CONSULTATION', 'BOOKED'])
          : pick(['BOOKED', 'BOOKED', 'CANCELLED']);

      const appt = await Appointment.create({
        patientId: patient._id,
        doctorId: doctor._id,
        scheduleId: schedule._id,
        slotTime: slot.time,
        appointmentDate: schedule.date,
        reason: pick(['General check-up', 'Fever and headache', 'Routine follow-up', 'Chest pain', 'Skin rash', 'Joint pain']),
        status,
        doctorSnapshot: {
          name: doctor.fullName || doctor.specialization,
          department: dept ? dept.name : '',
          fee: doctor.consultationFee,
        },
      });
      bookedAppointments.push({ appt, doctor, patient, status, schedule });
      apptCounter++;

      await Schedule.updateOne(
        { _id: schedule._id, 'slots.time': slot.time },
        { $set: { 'slots.$.status': 'BOOKED', 'slots.$.appointmentId': appt._id } }
      );
    }
  }

  console.log('Seeding queues for today...');
  const todayAppts = bookedAppointments.filter(({ schedule }) => schedule.date.toISOString().slice(0, 10) === today.toISOString().slice(0, 10));
  for (const { appt, doctor, patient } of todayAppts) {
    if (appt.status === 'CANCELLED') continue;
    const qStatus = appt.status === 'IN_CONSULTATION' ? 'IN_CONSULTATION' : appt.status === 'CHECKED_IN' ? 'WAITING' : null;
    if (!qStatus) continue;
    await Queue.findOneAndUpdate(
      { doctorId: doctor._id, date: today },
      { $setOnInsert: { doctorId: doctor._id, date: today, nextQueueNumber: 1 } },
      { upsert: true }
    );
    const queue = await Queue.findOne({ doctorId: doctor._id, date: today });
    const num = queue.nextQueueNumber;
    await Queue.updateOne(
      { _id: queue._id },
      {
        $push: {
          entries: {
            appointmentId: appt._id,
            patientId: patient._id,
            queueNumber: num,
            status: qStatus,
            calledAt: qStatus === 'IN_CONSULTATION' ? new Date() : null,
          },
        },
        $inc: { nextQueueNumber: 1 },
      }
    );
  }

  console.log('Seeding medical records + prescriptions + payments...');
  const completed = bookedAppointments.filter(({ appt }) => appt.status === 'COMPLETED');
  for (let i = 0; i < completed.length && i < 25; i++) {
    const { appt, doctor, patient } = completed[i];
    const record = await MedicalRecord.create({
      patientId: patient._id,
      doctorId: doctor._id,
      appointmentId: appt._id,
      symptoms: [pick(['Fever', 'Headache', 'Cough', 'Pain', 'Fatigue', 'Rash'])],
      diagnosis: pick(['Viral fever', 'Hypertension', 'Type 2 diabetes', 'Migraine', 'Allergic rhinitis', 'Osteoarthritis']),
      clinicalNotes: 'Patient responded well to treatment.',
      testsRecommended: i % 3 === 0 ? [pick(['CBC', 'Blood Sugar', 'Lipid Profile', 'X-Ray'])] : [],
      treatmentNotes: 'Prescribed medication as per prescription.',
      followUpInstructions: 'Follow up in 2 weeks if symptoms persist.',
      isFinalized: true,
    });
    const numLines = 1 + (i % 3);
    const used = new Set();
    const lines = [];
    for (let l = 0; l < numLines; l++) {
      let idx = Math.floor(Math.random() * medicines.length);
      while (used.has(idx)) idx = (idx + 1) % medicines.length;
      used.add(idx);
      const med = medicines[idx];
      lines.push({
        medicineId: med._id,
        nameSnapshot: med.name,
        dosage: `${50 + l * 50}mg`,
        frequency: pick(['Once daily', 'Twice daily', 'Three times daily']),
        durationDays: 3 + (i % 5),
        instructions: 'After meals',
        dispensed: true,
        dispensedAt: new Date(),
      });
      await Medicine.updateOne({ _id: med._id }, { $inc: { stock: -(3 + (i % 5)) } });
    }
    await Prescription.create({
      patientId: patient._id,
      doctorId: doctor._id,
      appointmentId: appt._id,
      diagnosis: record.diagnosis,
      medicines: lines,
      status: 'DISPENSED',
    });
    const paid = await Payment.create({
      patientId: patient._id,
      appointmentId: appt._id,
      amount: appt.doctorSnapshot.fee,
      method: pick(['CASH', 'MOBILE_BANKING', 'CARD', 'CASH']),
      status: 'PAID',
      paidAt: appt.appointmentDate,
      recordedBy: admin._id,
    });
    if (i % 2 === 0) {
      await Review.create({
        patientId: patient._id,
        doctorId: doctor._id,
        appointmentId: appt._id,
        rating: 3 + (i % 3),
        comment: pick(['Good experience', 'Very helpful doctor', 'Long wait but worth it', '']),
      });
    }
  }

  // Update rating aggregates
  const agg = await Review.aggregate([{ $group: { _id: '$doctorId', avg: { $avg: '$rating' }, count: { $sum: 1 } } }]);
  for (const row of agg) {
    await Doctor.updateOne({ _id: row._id }, { ratingAvg: Math.round(row.avg * 10) / 10, ratingCount: row.count });
  }

  console.log('Seeding notifications...');
  await Notification.create({
    userId: admin._id,
    type: 'INFO',
    message: 'Welcome to the Hospital Management System. Demo data seeded.',
  });

  console.log('\n===== SEED COMPLETE =====');
  console.log('Demo credentials (all passwords are fixed):');
  console.log('  Admin         admin@hospital.test       / admin12345');
  console.log('  Doctor        doctor1@hospital.test      / doctor12345');
  console.log('  Receptionist  reception1@hospital.test   / staff12345');
  console.log('  Pharmacist    pharmacist1@hospital.test  / staff12345');
  console.log('  Patient       patient1@hospital.test     / patient12345');
  console.log(
    `\nStats: ${departments.length} depts, ${doctors.length} doctors, ${patients.length} patients, ${allSchedules.length} schedules, ${apptCounter} appointments, ${medicines.length} medicines.`
  );

  await disconnectDB();
  process.exit(0);
}

main().catch(async (err) => {
  console.error('Seed failed:', err);
  await disconnectDB();
  process.exit(1);
});
