const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const mongoSanitize = require('express-mongo-sanitize');
const { env } = require('./config');
const { notFoundHandler, errorHandler } = require('./middlewares/errorHandler');
const { apiLimiter } = require('./middlewares/rateLimiter');

const app = express();

app.set('trust proxy', 1);

app.use(helmet());
app.use(
  cors({
    origin: env.CLIENT_URL.split(',').map((s) => s.trim()),
    credentials: true,
  })
);
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(mongoSanitize());
app.use('/api/v1', apiLimiter);

app.get('/health', (req, res) => res.json({ success: true, data: { status: 'ok', uptime: process.uptime() } }));

app.use('/api/v1/auth', require('./modules/auth/auth.routes'));
app.use('/api/v1/users', require('./modules/users/users.routes'));
app.use('/api/v1/patients', require('./modules/patients/patients.routes'));
app.use('/api/v1/doctors', require('./modules/doctors/doctors.routes'));
app.use('/api/v1/departments', require('./modules/departments/departments.routes'));
app.use('/api/v1/schedules', require('./modules/schedules/schedules.routes'));
app.use('/api/v1/appointments', require('./modules/appointments/appointments.routes'));
app.use('/api/v1/queues', require('./modules/queues/queues.routes'));
app.use('/api/v1/medical-records', require('./modules/medicalRecords/medicalRecords.routes'));
app.use('/api/v1/prescriptions', require('./modules/prescriptions/prescriptions.routes'));
app.use('/api/v1/medicines', require('./modules/medicines/medicines.routes'));
app.use('/api/v1/payments', require('./modules/payments/payments.routes'));
app.use('/api/v1/notifications', require('./modules/notifications/notifications.routes'));
app.use('/api/v1/reviews', require('./modules/reviews/reviews.routes'));
app.use('/api/v1/admin', require('./modules/admin/admin.routes'));

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
