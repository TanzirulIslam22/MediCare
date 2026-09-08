const { verifyAccessToken } = require('../utils/tokenUtils');
const ApiError = require('../utils/ApiError');
const User = require('../models/user.model');
const Patient = require('../models/patient.model');
const Doctor = require('../models/doctor.model');
const Staff = require('../models/staff.model');

async function authenticateUser(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) throw ApiError.unauthorized('No access token provided');

    const payload = verifyAccessToken(token);
    const user = await User.findById(payload.sub).select('+passwordHash').lean();
    if (!user || !user.isActive) throw ApiError.unauthorized('Account not found or disabled');

    req.user = {
      id: user._id.toString(),
      role: user.role,
      email: user.email,
      fullName: user.fullName,
    };

    // Attach the role-profile id (patientId/doctorId/staffId) for ownership checks.
    let profile = null;
    if (user.role === 'PATIENT') {
      profile = await Patient.findOne({ userId: user._id }).select('_id').lean();
      if (profile) req.user.patientId = profile._id.toString();
    } else if (user.role === 'DOCTOR') {
      profile = await Doctor.findOne({ userId: user._id }).select('_id').lean();
      if (profile) req.user.doctorId = profile._id.toString();
    } else if (user.role === 'RECEPTIONIST' || user.role === 'PHARMACIST') {
      profile = await Staff.findOne({ userId: user._id }).select('_id').lean();
      if (profile) req.user.staffId = profile._id.toString();
    }

    return next();
  } catch (err) {
    return next(err);
  }
}

function authorizeRoles(...roles) {
  return (req, res, next) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (!roles.includes(req.user.role)) {
      return next(ApiError.forbidden('You do not have permission to perform this action'));
    }
    return next();
  };
}

function authorizeOwnership(loader) {
  return async (req, res, next) => {
    try {
      if (!req.user) return next(ApiError.unauthorized());
      const resource = await loader(req);
      if (!resource) return next(ApiError.notFound('Resource not found'));
      const granted = await resource.canAccess(req.user);
      if (!granted) return next(ApiError.forbidden('You cannot access this resource'));
      req.resource = resource;
      return next();
    } catch (err) {
      return next(err);
    }
  };
}

module.exports = { authenticateUser, authorizeRoles, authorizeOwnership };
