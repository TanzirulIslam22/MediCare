const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../src/app');
const User = require('../src/models/user.model');
const Patient = require('../src/models/patient.model');
const Doctor = require('../src/models/doctor.model');
const Department = require('../src/models/department.model');
const Schedule = require('../src/models/schedule.model');
const Appointment = require('../src/models/appointment.model');
const { signAccessToken } = require('../src/utils/tokenUtils');
const request = require('supertest');

let mongo;
let server;
let baseUrl;
let doctorId;
let scheduleId;
let patientUserId;
let patientId;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  server = app.listen(0);
  baseUrl = `http://127.0.0.1:${server.address().port}`;

  const dept = await Department.create({ name: 'Cardiology' });
  const du = await User.create({
    fullName: 'Dr Client',
    email: 'clientdoc@test.dev',
    phone: '01770000001',
    passwordHash: 'password123',
    role: 'DOCTOR',
  });
  const doctor = await Doctor.create({
    userId: du._id,
    departmentId: dept._id,
    specialization: 'Cardiologist',
    consultationFee: 500,
  });
  doctorId = doctor._id;

  const pu = await User.create({
    fullName: 'Patient Client',
    email: 'clientpatient@test.dev',
    phone: '01770000002',
    passwordHash: 'password123',
    role: 'PATIENT',
  });
  patientUserId = pu._id;
  patientId = (await Patient.create({ userId: pu._id }))._id;

  const schedule = new Schedule({
    doctorId,
    date: new Date(),
    startTime: '09:00',
    endTime: '10:00',
    slotDurationMinutes: 30,
  });
  await schedule.save();
  scheduleId = schedule._id;
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
  server.close();
});

describe('client-facing auth contract', () => {
  it('login returns user with profileId', async () => {
    const res = await request(baseUrl).post('/api/v1/auth/login').send({
      email: 'clientpatient@test.dev',
      password: 'password123',
    });
    expect(res.status).toBe(200);
    expect(res.body.data.user.fullName).toBe('Patient Client');
    expect(res.body.data.user.profileId).toBe(patientId.toString());
    expect(res.body.data.accessToken).toBeTruthy();
  });

  it('GET /auth/me returns profileId', async () => {
    const token = signAccessToken({ sub: patientUserId.toString(), role: 'PATIENT' });
    const res = await request(baseUrl).get('/api/v1/auth/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.user.profileId).toBe(patientId.toString());
  });

  it('patient registration creates user + patient and returns profileId', async () => {
    const res = await request(baseUrl).post('/api/v1/auth/register').send({
      fullName: 'New Patient',
      email: 'newpatient@test.dev',
      phone: '01770000003',
      password: 'password123',
      dateOfBirth: '1990-01-01',
    });
    expect(res.status).toBe(201);
    expect(res.body.data.user.role).toBe('PATIENT');
    expect(res.body.data.user.profileId).toBeTruthy();
    expect(res.body.data.accessToken).toBeTruthy();
  });
});

describe('client-facing appointment list contract', () => {
  let adminToken;

  beforeAll(async () => {
    const admin = await User.create({
      fullName: 'Admin Client',
      email: 'clientadmin@test.dev',
      phone: '01770000004',
      passwordHash: 'password123',
      role: 'ADMIN',
    });
    adminToken = signAccessToken({ sub: admin._id.toString(), role: 'ADMIN' });
    await Appointment.create({
      patientId,
      doctorId,
      scheduleId,
      slotTime: '09:00',
      appointmentDate: new Date(),
      doctorSnapshot: { name: 'Dr Client', department: 'Cardiology', fee: 500 },
    });
  });

  it('GET /appointments (reception/admin list) resolves patient names', async () => {
    const res = await request(baseUrl)
      .get('/api/v1/appointments')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(1);
    expect(res.body.data.items[0].patientId.userId.fullName).toBe('Patient Client');
  });

  it('GET /appointments/mine for a doctor resolves patient names', async () => {
    const doctor = await User.findOne({ email: 'clientdoc@test.dev' });
    const token = signAccessToken({ sub: doctor._id.toString(), role: 'DOCTOR' });
    const res = await request(baseUrl)
      .get('/api/v1/appointments/mine')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.items[0].patientId.userId.fullName).toBe('Patient Client');
  });

  it('receptionist can list appointments', async () => {
    const reception = await User.create({
      fullName: 'Reception Client',
      email: 'clientreception@test.dev',
      phone: '01770000005',
      passwordHash: 'password123',
      role: 'RECEPTIONIST',
    });
    const token = signAccessToken({ sub: reception._id.toString(), role: 'RECEPTIONIST' });
    const res = await request(baseUrl)
      .get('/api/v1/appointments')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.items.length).toBeGreaterThanOrEqual(1);
  });
});
