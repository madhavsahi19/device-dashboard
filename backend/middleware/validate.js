const DEVICE_TYPES = [
  "Server", "Network Switch", "Firewall", "Storage", "Database",
  "Service", "Access Point", "Router", "Other",
];
const STATUSES = ["online", "offline", "warning"];
const LIMITS = { name: 100, type: 50, address: 255, location: 100, remarks: 500 };

// "5" -> 5, but "1abc", "0", "-3", "1.5", "" and arrays -> null
function parseId(value) {
  if (typeof value !== "string" || !/^[1-9]\d*$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) ? id : null;
}

function parsePositiveInt(value) {
  if (typeof value !== "string" || !/^[1-9]\d*$/.test(value)) return null;
  const n = Number(value);
  return Number.isSafeInteger(n) ? n : null;
}

// Returns { page, limit } or { error }
function parsePagination(query) {
  const page = query.page === undefined ? 1 : parsePositiveInt(query.page);
  const limit = query.limit === undefined ? 50 : parsePositiveInt(query.limit);
  if (page === null) return { error: "page must be a positive whole number" };
  if (limit === null) return { error: "limit must be a positive whole number" };
  if (limit > 100) return { error: "limit cannot be more than 100" };
  return { page, limit };
}

// Returns { errors: [...], value: {...cleaned fields} }
function validateDevice(body) {
  const errors = [];
  const value = {};

  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return { errors: ["Request body must be a JSON object"], value };
  }

  // Check the type BEFORE trimming, so numbers/objects can't crash .trim()
  for (const field of ["name", "type", "address", "location"]) {
    const raw = body[field];
    if (typeof raw !== "string") {
      errors.push(`${field} is required and must be text`);
      continue;
    }
    const trimmed = raw.trim();
    if (trimmed.length === 0) {
      errors.push(`${field} cannot be empty`);
    } else if (trimmed.length > LIMITS[field]) {
      errors.push(`${field} must be at most ${LIMITS[field]} characters`);
    } else {
      value[field] = trimmed;
    }
  }

  if (value.type && !DEVICE_TYPES.includes(value.type)) {
    errors.push(`type must be one of: ${DEVICE_TYPES.join(", ")}`);
  }

  if (body.status === undefined) {
    value.status = "online";
  } else if (typeof body.status !== "string" || !STATUSES.includes(body.status)) {
    errors.push(`status must be one of: ${STATUSES.join(", ")}`);
  } else {
    value.status = body.status;
  }

  if (body.remarks === undefined || body.remarks === null) {
    value.remarks = null;
  } else if (typeof body.remarks !== "string") {
    errors.push("remarks must be text");
  } else {
    const r = body.remarks.trim();
    if (r.length > LIMITS.remarks) {
      errors.push(`remarks must be at most ${LIMITS.remarks} characters`);
    } else {
      value.remarks = r === "" ? null : r;
    }
  }

  return { errors, value };
}

module.exports = { parseId, parsePagination, validateDevice, DEVICE_TYPES, STATUSES };