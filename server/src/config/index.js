const dotenv = require('dotenv');
dotenv.config();

const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT, 10) || 5000,
  MONGODB_URI:
    process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/hospital_management',
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || 'dev_access_secret',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret',
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  REFRESH_COOKIE_NAME: 'refreshToken',
  MEDICAL_RECORD_FINALIZE_HOURS: parseInt(
    process.env.MEDICAL_RECORD_FINALIZE_HOURS,
    10
  ) || 72,
  LOW_STOCK_WINDOW_DAYS: parseInt(process.env.LOW_STOCK_WINDOW_DAYS, 10) || 30,
};

const ROLES = {
  PATIENT: 'PATIENT',
  DOCTOR: 'DOCTOR',
  RECEPTIONIST: 'RECEPTIONIST',
  PHARMACIST: 'PHARMACIST',
  ADMIN: 'ADMIN',
};

const ALL_ROLES = Object.values(ROLES);

const APPOINTMENT_STATUSES = [
  'BOOKED',
  'CHECKED_IN',
  'IN_CONSULTATION',
  'COMPLETED',
  'CANCELLED',
  'NO_SHOW',
];

const QUEUE_STATUSES = [
  'WAITING',
  'CALLED',
  'IN_CONSULTATION',
  'COMPLETED',
  'SKIPPED',
  'CANCELLED',
  'NO_SHOW',
];

const SLOT_STATUSES = ['AVAILABLE', 'BOOKED', 'BLOCKED'];

module.exports = {
  env,
  ROLES,
  ALL_ROLES,
  APPOINTMENT_STATUSES,
  QUEUE_STATUSES,
  SLOT_STATUSES,
};
