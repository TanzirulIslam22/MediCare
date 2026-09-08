const asyncHandler = require('../../utils/asyncHandler');
const { ok } = require('../../utils/ApiResponse');
const authService = require('./auth.service');
const { auditLog } = require('../../services/audit.service');
const { getClientIp } = require('../../utils/helpers');

const register = asyncHandler(async (req, res) => {
  const user = await authService.registerPatient(req.body);
  const { accessToken } = await authService.login(user.email, req.body.password, res);
  await auditLog({
    req,
    actorId: user._id,
    actorRole: 'PATIENT',
    action: 'USER_REGISTERED',
    targetType: 'User',
    targetId: user._id,
  });
  return ok(res, { user: await authService.attachProfileId(user.toSafeJSON()), accessToken }, 'Registration successful', 201);
});

const login = asyncHandler(async (req, res) => {
  const { email, phone, password } = req.body;
  const identifier = email || phone;
  const { user, accessToken } = await authService.login(identifier, password, res);
  await auditLog({
    req,
    actorId: user._id,
    actorRole: user.role,
    action: 'LOGIN_SUCCESS',
    targetType: 'User',
    targetId: user._id,
  });
  return ok(res, { user, accessToken }, 'Login successful');
});

const refresh = asyncHandler(async (req, res) => {
  const cookieName = process.env.REFRESH_COOKIE_NAME || 'refreshToken';
  const { user, accessToken } = await authService.refreshAccessToken(req.cookies[cookieName], res);
  return ok(res, { user, accessToken }, 'Token refreshed');
});

const logout = asyncHandler(async (req, res) => {
  const cookieName = process.env.REFRESH_COOKIE_NAME || 'refreshToken';
  await authService.logout(req.user.id, req.cookies[cookieName]);
  res.clearCookie(cookieName);
  return ok(res, null, 'Logged out');
});

const forgotPassword = asyncHandler(async (req, res) => {
  const result = await authService.forgotPassword(req.body.email);
  if (!result) return ok(res, null, 'If that email exists, a reset link has been sent');
  // Dev convenience: return token only when NODE_ENV !== production.
  const payload =
    process.env.NODE_ENV === 'production'
      ? { sent: true }
      : { sent: true, devResetToken: result.token };
  return ok(res, payload, 'If that email exists, a reset link has been sent');
});

const resetPassword = asyncHandler(async (req, res) => {
  const user = await authService.resetPassword(req.body.token, req.body.newPassword);
  await auditLog({
    req,
    actorId: user._id,
    actorRole: user.role,
    action: 'PASSWORD_RESET',
    targetType: 'User',
    targetId: user._id,
  });
  return ok(res, null, 'Password updated successfully');
});

module.exports = {
  register,
  login,
  refresh,
  logout,
  forgotPassword,
  resetPassword,
  me: asyncHandler(async (req, res) => {
    const User = require('../../models/user.model');
    const user = await User.findById(req.user.id);
    const { attachProfileId } = require('./auth.service');
    const safe = await attachProfileId(user.toSafeJSON());
    return ok(res, { user: safe });
  }),
};
