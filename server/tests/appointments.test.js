/* eslint-disable no-console */
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

let patientToken;
let patientId;
let doctorId;
let scheduleId;
let schedule;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());

  const dept = await Department.create({ name: 'Test Dept' });
  const pUser = await User.create({
    fullName: 'Test Patient',
    email: 'tpatient@test.dev',
    phone: '01711111111',
    passwordHash: 'password123',
    role: 'PATIENT',
  });
  const patient = await Patient.create({ userId: pUser._id });
  patientId = patient._id;

  const dUser = await User.create({
    fullName: 'Dr Test',
    email: 'tdoctor@test.dev',
    phone: '01722222222',
    passwordHash: 'password123',
    role: 'DOCTOR',
  });
  const doctor = await Doctor.create({
    userId: dUser._id,
    departmentId: dept._id,
    specialization: 'General',
    consultationFee: 500,
  });
  doctorId = doctor._id;

  schedule = new Schedule({
    doctorId,
    date: new Date(new Date().setDate(new Date().getDate() + 1)),
    startTime: '09:00',
    endTime: '10:00',
    slotDurationMinutes: 15,
  });
  schedule.generateSlots();
  await schedule.save();
  scheduleId = schedule._id;

  patientToken = signAccessToken({ sub: pUser._id.toString(), role: 'PATIENT' });
  const doctorToken = signAccessToken({ sub: dUser._id.toString(), role: 'DOCTOR' });

  server = app.listen(0);
  baseUrl = `http://127.0.0.1:${server.address().port}`;
  global.__DOCTOR_TOKEN__ = doctorToken;
});

afterAll(async () => {
  await server?.close();
  await mongoose.disconnect();
  await mongo?.stop();
});

describe('Appointment double-booking race', () => {
  test('exactly one of two concurrent bookings for the same slot succeeds', async () => {
    const payload = {
      doctorId: doctorId.toString(),
      scheduleId: scheduleId.toString(),
      slotTime: '09:00',
      appointmentDate: schedule.date.toISOString(),
    };
    const results = await Promise.all([
      request(baseUrl).post('/api/v1/appointments').set('Authorization', `Bearer ${patientToken}`).send(payload),
      request(baseUrl).post('/api/v1/appointments').set('Authorization', `Bearer ${patientToken}`).send(payload),
    ]);
    const successes = results.filter((r) => r.status === 201);
    const conflicts = results.filter((r) => r.status === 409);
    expect(successes).toHaveLength(1);
    expect(conflicts.length).toBeGreaterThanOrEqual(1);
    expect(successes[0].body.data).toHaveProperty('_id');
  });

  test('booking a slot that is outside working hours is rejected', async () => {
    const payload = {
      doctorId: doctorId.toString(),
      scheduleId: scheduleId.toString(),
      slotTime: '14:00',
      appointmentDate: schedule.date.toISOString(),
    };
    const res = await request(baseUrl)
      .post('/api/v1/appointments')
      .set('Authorization', `Bearer ${patientToken}`)
      .send(payload);
    expect(res.status).toBe(400);
  });

  test('stress: 8 concurrent bookings for the same slot yield exactly one appointment', async () => {
    const payload = {
      doctorId: doctorId.toString(),
      scheduleId: scheduleId.toString(),
      slotTime: '09:30',
      appointmentDate: schedule.date.toISOString(),
    };
    const results = await Promise.all(
      Array.from({ length: 8 }, () =>
        request(baseUrl).post('/api/v1/appointments').set('Authorization', `Bearer ${patientToken}`).send(payload)
      )
    );
    const successes = results.filter((r) => r.status === 201);
    const conflicts = results.filter((r) => r.status === 409);
    expect(successes).toHaveLength(1);
    expect(conflicts.length).toBe(7);

    const count = await Appointment.countDocuments({
      scheduleId,
      slotTime: '09:30',
      status: { $ne: 'CANCELLED' },
    });
    expect(count).toBe(1);
  });
});

describe('Cancellation frees the slot for rebooking', () => {
  test('cancelling an appointment returns the slot to AVAILABLE', async () => {
    const payload = {
      doctorId: doctorId.toString(),
      scheduleId: scheduleId.toString(),
      slotTime: '09:15',
      appointmentDate: schedule.date.toISOString(),
    };
    const booked = await request(baseUrl)
      .post('/api/v1/appointments')
      .set('Authorization', `Bearer ${patientToken}`)
      .send(payload);
    expect(booked.status).toBe(201);
    const apptId = booked.body.data._id;

    const cancelled = await request(baseUrl)
      .patch(`/api/v1/appointments/${apptId}/cancel`)
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ reason: 'changed mind' });
    expect(cancelled.status).toBe(200);

    const again = await request(baseUrl)
      .post('/api/v1/appointments')
      .set('Authorization', `Bearer ${patientToken}`)
      .send(payload);
    expect(again.status).toBe(201);
  });
});

describe('Auth', () => {
  test('patient can login and receives an access token', async () => {
    const res = await request(baseUrl).post('/api/v1/auth/login').send({
      email: 'tpatient@test.dev',
      password: 'password123',
    });
    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeTruthy();
  });

  test('wrong password is rejected with 401', async () => {
    const res = await request(baseUrl).post('/api/v1/auth/login').send({
      email: 'tpatient@test.dev',
      password: 'wrongpassword',
    });
    expect(res.status).toBe(401);
  });

  test('duplicate email registration is rejected with 409', async () => {
    const res = await request(baseUrl).post('/api/v1/auth/register').send({
      fullName: 'Another Patient',
      email: 'tpatient@test.dev',
      phone: '01733333333',
      password: 'password123',
    });
    expect(res.status).toBe(409);
  });
});

describe('RBAC', () => {
  test('patient cannot access doctor-only endpoints', async () => {
    const res = await request(baseUrl)
      .post('/api/v1/medical-records')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({});
    expect(res.status).toBe(403);
  });

  test('unauthenticated requests are rejected with 401', async () => {
    const res = await request(baseUrl).get('/api/v1/appointments/mine');
    expect(res.status).toBe(401);
  });
});
