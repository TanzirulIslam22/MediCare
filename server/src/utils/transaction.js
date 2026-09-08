const mongoose = require('mongoose');
const ApiError = require('./ApiError');

/**
 * Runs `fn(session)` inside a MongoDB multi-document transaction when the
 * deployment is a replica set (e.g. Atlas). On a standalone mongod —
 * where transactions are unsupported — it falls back to executing the
 * callback without a session. Correctness in the fallback path is preserved
 * by the atomic conditional updates (slot claim, $inc stock) in the services.
 */
async function supportsTransactions() {
  try {
    const topology = mongoose.connection.db?.client?.topology;
    if (!topology || !topology.description) return false;
    const type = topology.description.type || '';
    return type.includes('ReplicaSet') || type.includes('LoadBalanced');
  } catch (err) {
    return false;
  }
}

async function runInTransaction(fn, fallback = null) {
  const canTx = await supportsTransactions();
  if (!canTx) {
    const result = await fn(null);
    return result;
  }
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      result = await fn(session);
    });
    return result;
  } catch (err) {
    if (fallback) return fallback(err);
    if (err && /WriteConflict|TransientTransactionError|UnknownTransactionCommitResult/i.test(err.message || '')) {
      throw ApiError.conflict('Concurrent modification, please retry', 'CONCURRENT_MODIFICATION');
    }
    throw err;
  } finally {
    await session.endSession();
  }
}

module.exports = { runInTransaction, supportsTransactions };
