const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

function parsePagination(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, parseInt(query.pageSize, 10) || DEFAULT_PAGE_SIZE)
  );
  return { page, pageSize, offset: (page - 1) * pageSize };
}

module.exports = { parsePagination };
