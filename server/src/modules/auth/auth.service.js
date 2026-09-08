const User = require('../../models/user.model');
const Patient = require('../../models/patient.model');
const Doctor = require('../../models/doctor.model');
const Staff = require('../../models/staff.model');
const ApiError = require('../../utils/ApiError');
const { runInTransaction } = require('../../utils/transaction');
const {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  hashToken,
  generateRandomToken,
} = require('../../utils/tokenUtils');

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: process.env.COOKIE_SAME_SITE || 'lax',
  secure: process.env.NODE_ENV === 'production',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

async function attachProfileId(userDoc) {
  const user = userDoc.toObject ? userDoc.toObject() : userDoc;
  let profileId = null;
  if (user.role === 'PATIENT') {
    const p = await Patient.findOne({ userId: user._id }).select('_id').lean();
    profileId = p ? p._id.toString() : null;
  } else if (user.role === 'DOCTOR') {
    const d = await Doctor.findOne({ userId: user._id }).select('_id').lean();
    profileId = d ? d._id.toString() : null;
  } else if (user.role === 'RECEPTIONIST' || user.role === 'PHARMACIST') {
    const s = await Staff.findOne({ userId: user._id }).select('_id').lean();
    profileId = s ? s._id.toString() : null;
  }
  return { ...user, profileId };
}

async function registerPatient(payload) {
  const { fullName, email, phone, password, ...patientData } = payload;

  const existing = await User.findOne({ $or: [{ email }, { phone }] }).lean();
  if (existing) {
    if (existing.email === email) throw ApiError.conflict('Email already registered', 'DUPLICATE_EMAIL');
    throw ApiError.conflict('Phone number already registered', 'DUPLICATE_PHONE');
  }

  let user;
  await runInTransaction(async (session) => {
    user = await User.create([{ fullName, email, phone, passwordHash: password, role: 'PATIENT' }], {
      session,
    });
    user = user[0];
    await Patient.create([{ userId: user._id, ...patientData }], { session });
  });
  return user;
}
async function login(identifier, password, res) {
  let user;
  if (identifier.includes('@')) {
    user = await User.findOne({ email: identifier.toLowerCase() }).select('+passwordHash');
  } else {
    user = await User.findOne({ phone: identifier }).select('+passwordHash');
  }
  if (!user) throw ApiError.unauthorized('Invalid credentials');
  if (!user.isActive) throw ApiError.unauthorized('Account is disabled');

  const ok = await user.comparePassword(password);
  if (!ok) throw ApiError.unauthorized('Invalid credentials');

  user.lastLoginAt = new Date();
  const accessToken = signAccessToken({ sub: user._id.toString(), role: user.role });
  const refreshToken = signRefreshToken({ sub: user._id.toString(), type: 'refresh' });
  user.refreshTokenHash = hashToken(refreshToken);
  await user.save();

  res.cookie(process.env.REFRESH_COOKIE_NAME || 'refreshToken', refreshToken, REFRESH_COOKIE_OPTIONS);
  return { user: await attachProfileId(user.toSafeJSON()), accessToken };
}

async function refreshAccessToken(refreshToken, res) {
  if (!refreshToken) throw ApiError.unauthorized('No refresh token');
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch (err) {
    throw ApiError.unauthorized('Invalid refresh token');
  }
  const user = await User.findById(payload.sub).select('+passwordHash +refreshTokenHash');
  if (!user || !user.isActive) throw ApiError.unauthorized('Account not found or disabled');
  if (!user.refreshTokenHash || user.refreshTokenHash !== hashToken(refreshToken)) {
    throw ApiError.unauthorized('Refresh token revoked');
  }

  const newRefresh = signRefreshToken({ sub: user._id.toString(), type: 'refresh' });
  user.refreshTokenHash = hashToken(newRefresh);
  await user.save();
  res.cookie(process.env.REFRESH_COOKIE_NAME || 'refreshToken', newRefresh, REFRESH_COOKIE_OPTIONS);

  return {
    accessToken: signAccessToken({ sub: user._id.toString(), role: user.role }),
    user: await attachProfileId(user.toSafeJSON()),
  };
}

async function logout(userId, refreshToken) {
  if (!userId || !refreshToken) return;
  const user = await User.findById(userId).select('+refreshTokenHash');
  if (user && user.refreshTokenHash === hashToken(refreshToken)) {
    user.refreshTokenHash = null;
    await user.save();
  }
}

async function forgotPassword(email) {
  const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordResetToken +passwordResetExpires');
  if (!user) return null; // Do not leak whether the email exists.
  const token = generateRandomToken();
  user.passwordResetToken = hashToken(token);
  user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000);
  await user.save();
  return { user, token };
}

async function resetPassword(token, newPassword) {
  const hashed = hashToken(token);
  const user = await User.findOne({
    passwordResetToken: hashed,
    passwordResetExpires: { $gt: new Date() },
  }).select('+passwordResetToken +passwordResetExpires +refreshTokenHash');
  if (!user) throw ApiError.badRequest('Invalid or expired reset token', 'INVALID_RESET_TOKEN');
  user.passwordHash = newPassword;
  user.passwordResetToken = null;
  user.passwordResetExpires = null;
  user.refreshTokenHash = null; // invalidate all refresh tokens
  await user.save();
  return user;
}

module.exports = {
  registerPatient,
  login,
  refreshAccessToken,
  logout,
  forgotPassword,
  resetPassword,
  attachProfileId,
  REFRESH_COOKIE_OPTIONS,
};
