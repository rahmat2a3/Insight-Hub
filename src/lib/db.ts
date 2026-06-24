import { Pool } from 'pg';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Inisialisasi pool koneksi ke database Supabase PostgreSQL secara lazy
let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.SUPABASE_DB_URL,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
      ssl: { rejectUnauthorized: false }
    });
  }
  return pool;
}

function translateDateFormatString(mysqlFormat: string): string {
  let pgFormat = mysqlFormat;
  const mappings: Record<string, string> = {
    '%Y': 'YYYY',
    '%y': 'YY',
    '%m': 'MM',
    '%d': 'DD',
    '%H': 'HH24',
    '%h': 'HH12',
    '%i': 'MI',
    '%s': 'SS',
    '%b': 'Mon',
    '%M': 'Month',
    '%a': 'Dy',
    '%W': 'Day',
    '%c': 'FMMM',
    '%e': 'FMDD',
  };

  for (const [mysql, pg] of Object.entries(mappings)) {
    pgFormat = pgFormat.replace(new RegExp(mysql, 'g'), pg);
  }
  return pgFormat;
}

// Helper untuk mentranslasikan kueri MySQL ke PostgreSQL
export function convertQuery(sql: string): string {
  // Pre-process MySQL functions to PostgreSQL equivalents
  let processedSql = sql;

  // 1. DATE_FORMAT(expr, format) -> TO_CHAR(expr, format)
  processedSql = processedSql.replace(
    /DATE_FORMAT\(([^,]+?),\s*['"](.+?)['"]\)/gi,
    (match, expr, format) => {
      return `TO_CHAR(${expr}, '${translateDateFormatString(format)}')`;
    }
  );

  // 2. DATE_SUB(expr, INTERVAL interval_expr) -> (expr - INTERVAL interval_expr)
  processedSql = processedSql.replace(
    /DATE_SUB\((.+?),\s*(INTERVAL\s+.+?)\)/gi,
    '($1 - $2)'
  );

  // 3. DATE_ADD(expr, INTERVAL interval_expr) -> (expr + INTERVAL interval_expr)
  processedSql = processedSql.replace(
    /DATE_ADD\((.+?),\s*(INTERVAL\s+.+?)\)/gi,
    '($1 + $2)'
  );

  // 4. DATE(expr) -> CAST(expr AS date)
  processedSql = processedSql.replace(/DATE\(([^)]+?)\)/gi, 'CAST($1 AS date)');

  // 5. CURDATE() -> CURRENT_DATE
  processedSql = processedSql.replace(/CURDATE\(\)/gi, 'CURRENT_DATE');

  // Translate MySQL unquoted INTERVAL syntax: INTERVAL 30 DAY -> INTERVAL '30 DAY'
  const translatedSql = processedSql.replace(
    /INTERVAL\s+(\d+)\s+(DAY|WEEK|MONTH|YEAR|HOUR|MINUTE|SECOND|days|weeks|months|years|hours|minutes|seconds)/gi,
    "INTERVAL '$1 $2'"
  );

  let paramIndex = 1;
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let result = '';

  for (let i = 0; i < translatedSql.length; i++) {
    const char = translatedSql[i];

    // Tangani escape backslash
    if (char === '\\') {
      result += char;
      if (i + 1 < sql.length) {
        result += sql[i + 1];
        i++;
      }
      continue;
    }

    if (char === "'") {
      inSingleQuote = !inSingleQuote;
      result += char;
    } else if (char === '"') {
      // Ubah tanda kutip ganda (literal string MySQL) menjadi tanda kutip tunggal (PostgreSQL)
      if (!inSingleQuote) {
        inDoubleQuote = !inDoubleQuote;
        result += "'";
      } else {
        result += char;
      }
    } else if (char === '`') {
      // Ubah backtick MySQL menjadi tanda kutip ganda PostgreSQL untuk identifier
      result += '"';
    } else if (char === '?' && !inSingleQuote && !inDoubleQuote) {
      result += `$${paramIndex++}`;
    } else {
      result += char;
    }
  }
  return result;
}

export function normalizeKeys(row: any) {
  if (!row || typeof row !== 'object') return row;
  
  const mapping: Record<string, string> = {
    planid: 'planId',
    startsat: 'startsAt',
    endsat: 'endsAt',
    cancelatperiodend: 'cancelAtPeriodEnd',
    istrial: 'isTrial',
    fullname: 'fullName',
    avatarurl: 'avatarUrl',
    joineddate: 'joinedDate',
    actiontype: 'actionType',
    targetemail: 'targetEmail',
    targetnickname: 'targetNickname',
    roleid: 'roleId',
    permissionid: 'permissionId',
    orderid: 'orderId',
    paymentmethod: 'paymentMethod',
    paymentchannel: 'paymentChannel',
    createdat: 'createdAt',
    updatedat: 'updatedAt',
    errorid: 'errorId',
    errormessage: 'errorMessage',
    stacktrace: 'stackTrace'
  };

  const normalized = { ...row };
  for (const key of Object.keys(row)) {
    const lowercaseKey = key.toLowerCase();
    if (mapping[lowercaseKey]) {
      normalized[mapping[lowercaseKey]] = row[key];
    }
  }
  return normalized;
}

export async function dbQuery<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const convertedSql = convertQuery(sql);
  const currentPool = getPool();
  
  try {
    const result = await currentPool.query(convertedSql, params);
    return result.rows.map(normalizeKeys) as T[];
  } catch (error) {
    console.error('Database Query Error (PostgreSQL):', error);
    console.error('Original SQL:', sql);
    console.error('Converted SQL:', convertedSql);
    console.error('Parameters:', params);

    // Catat log error ke table error_logs secara asynchronous
    const logSql = convertQuery('INSERT INTO error_logs (error_message, stack_trace, path) VALUES (?, ?, ?)');
    currentPool.query(logSql, [
      error instanceof Error ? error.message : String(error),
      error instanceof Error ? (error.stack || null) : null,
      sql.substring(0, 255)
    ]).catch(err => console.error('Failed to log error to database:', err));

    throw error;
  }
}

export default getPool;
