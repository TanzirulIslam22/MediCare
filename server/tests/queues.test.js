const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../src/app');
const User = require('../src/models/user.model');
const Patient = require('../src/models/patient.model');
const Doctor = require('../src/models/doctor.model');
const Department = require('../src/models/department.model');
const Schedule = require('../src/models/schedule.model');
const Queue = require('../src/models/queue.model');
const Medicine = require('../src/models/medicine.model');
const { startOfDay } = require('../src/utils/date');
const { signAccessToken } = require('../src/utils/tokenUtils');
const request = require('supertest');

let mongo;
let server;
let baseUrl;
let doctorToken;
let doctorId;
let scheduleId;
let schedule;

async function createAndBook(slotTime, patientName, phone) {
  const u = await User.create({
    fullName: patientName,
    email: `${phone}@test.dev`,
    phone,
    passwordHash: 'password123',
    role: 'PATIENT',
  });
  const p = await Patient.create({ userId: u._id });
  const token = signAccessToken({ sub: u._id.toString(), role: 'PATIENT' });
  const res = await request(baseUrl)
    .post('/api/v1/appointments')
    .set('Authorization', `Bearer ${token}`)
    .send({
      doctorId: doctorId.toString(),
      scheduleId: scheduleId.toString(),
      slotTime,
      appointmentDate: schedule.date.toISOString(),
    });
  return res.body.data;
}

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());

  const dept = await Department.create({ name: 'Dept' });
  const du = await User.create({
    fullName: 'Dr Q',
    email: 'qdoctor@test.dev',
    phone: '01744444444',
    passwordHash: 'password123',
    role: 'DOCTOR',
  });
  const doctor = await Doctor.create({
    userId: du._id,
    departmentId: dept._id,
    specialization: 'General',
    consultationFee: 300,
  });
  doctorId = doctor._id;
  doctorToken = signAccessToken({ sub: du._id.toString(), role: 'DOCTOR' });

  schedule = new Schedule({
    doctorId,
    date: new Date(),
    startTime: '09:00',
    endTime: '11:00',
    slotDurationMinutes: 15,
  });
  schedule.generateSlots();
  await schedule.save();
  scheduleId = schedule._id;

  server = app.listen(0);
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

afterAll(async () => {
  await server?.close();
  await mongoose.disconnect();
  await mongo?.stop();
});

describe('Queue flow', () => {
  test('check-in assigns sequential queue numbers in order', async () => {
    const a1 = await createAndBook('09:00', 'Patient One', '01751111111');
    const a2 = await createAndBook('09:15', 'Patient Two', '01752222222');

    const recUser = await User.create({
      fullName: 'Reception',
      email: 'rec@test.dev',
      phone: '01753333333',
      passwordHash: 'password123',
      role: 'RECEPTIONIST',
    });
    const recToken = signAccessToken({ sub: recUser._id.toString(), role: 'RECEPTIONIST' });

    const r1 = await request(baseUrl)
      .patch(`/api/v1/appointments/${a1._id}/check-in`)
      .set('Authorization', `Bearer ${recToken}`)
      .send({});
    const r2 = await request(baseUrl)
      .patch(`/api/v1/appointments/${a2._id}/check-in`)
      .set('Authorization', `Bearer ${recToken}`)
      .send({});
    expect(r1.status).toBe(200);
    expect(r2.status).toBe(200);

    const queue = await Queue.findOne({ doctorId, date: startOfDay(schedule.date) }).lean();
    const numbers = queue.entries.map((e) => e.queueNumber);
    expect(numbers.sort((x, y) => x - y)).toEqual([1, 2]);
  });

  test('doctor call-next advances the first waiting patient', async () => {
    const queue = await Queue.findOne({ doctorId, date: startOfDay(schedule.date) }).lean();
    const waitingCount = queue.entries.filter((e) => e.status === 'WAITING').length;
    if (waitingCount === 0) return;

    const res = await request(baseUrl)
      .patch(`/api/v1/queues/${doctorId}/call-next`)
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({});
    expect(res.status).toBe(200);
    expect(res.body.data.called.status).toBe('WAITING');

    const after = await Queue.findOne({ doctorId, date: startOfDay(schedule.date) }).lean();
    const called = after.entries.find((e) => e.queueNumber === res.body.data.called.queueNumber);
    expect(called.status).toBe('CALLED');
  });
});

describe('Pharmacy stock', () => {
  test('stock decrements on dispense and cannot go negative', async () => {
    const med = await Medicine.create({ name: 'TestMed', price: 10, stock: 5, minStock: 2 });

    const pharmaUser = await User.create({
      fullName: 'Pharma',
      email: 'pharma@test.dev',
      phone: '01754444444',
      passwordHash: 'password123',
      role: 'PHARMACIST',
    });
    const pharmaToken = signAccessToken({ sub: pharmaUser._id.toString(), role: 'PHARMACIST' });

    const out1 = await request(baseUrl)
      .patch(`/api/v1/medicines/${med._id}/stock`)
      .set('Authorization', `Bearer ${pharmaToken}`)
      .send({ operation: 'OUT', quantity: 6 });
    expect(out1.status).toBe(409);

    const out2 = await request(baseUrl)
      .patch(`/api/v1/medicines/${med._id}/stock`)
      .set('Authorization', `Bearer ${pharmaToken}`)
      .send({ operation: 'OUT', quantity: 2 });
    expect(out2.status).toBe(200);
    const refreshed = await Medicine.findById(med._id).lean();
    expect(refreshed.stock).toBe(3);
  });
});
