function paginateOptions(query) {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 20, 1), 100);
  const skip = (page - 1) * limit;
  const sort = {};
  const sortField = query.sort || 'createdAt';
  const sortDir = query.order === 'asc' ? 1 : -1;
  sort[sortField] = sortDir;
  return { page, limit, skip, sort };
}

function paginateResult(total, docs, page, limit) {
  return {
    items: docs,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

module.exports = { paginateOptions, paginateResult };
