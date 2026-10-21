// Regenerates docs/erd/infra-watch.dbml and docs/erd/infra-watch.mmd
// from the live database named in .env.local.
//
//   node docs/erd/generate-erd.cjs
//
// Read-only: only reads pg_catalog. Overwrites the two output files, so
// copy them first if you have hand-edited them.

const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env.local"), quiet: true });
const postgres = require("postgres");

const sql = postgres(process.env.DATABASE_URL, { max: 1, connect_timeout: 5 });

const DELETE_RULE = { a: "no action", r: "restrict", c: "cascade", n: "set null", d: "set default" };

const DBML_TYPES = {
  "character varying": "varchar",
  "timestamp with time zone": "timestamptz",
  "timestamp without time zone": "timestamp",
  "double precision": "float8",
};

function dbmlType(t) {
  const m = t.match(/^(character varying|timestamp with time zone|timestamp without time zone|double precision)(.*)$/);
  const mapped = m ? DBML_TYPES[m[1]] + m[2] : t;
  return /^[\w]+(\(\d+(,\s*\d+)?\))?(\[\])?$/.test(mapped) ? mapped : `"${mapped}"`;
}

function dbmlDefault(d) {
  if (d == null) return null;
  if (/^-?\d+(\.\d+)?$/.test(d) || d === "true" || d === "false") return d;
  const s = d.match(/^'((?:[^']|'')*)'::[\w\s\[\]"."]+$/);
  if (s) return `'${s[1]}'`;
  return "`" + d.replace(/`/g, "'") + "`";
}

function mmdType(t) {
  return t.replace(/\[\]/g, "_array").replace(/[^\w]+/g, "_").replace(/^_+|_+$/g, "");
}

(async () => {
  try {
    const cols = await sql`
      select c.relname tbl, a.attname col, format_type(a.atttypid, a.atttypmod) type,
             a.attnotnull notnull, pg_get_expr(d.adbin, d.adrelid) def,
             col_description(c.oid, a.attnum) note
      from pg_attribute a
      join pg_class c on c.oid = a.attrelid
      join pg_namespace n on n.oid = c.relnamespace
      left join pg_attrdef d on d.adrelid = a.attrelid and d.adnum = a.attnum
      where n.nspname = 'public' and c.relkind in ('r','p')
        and a.attnum > 0 and not a.attisdropped
      order by c.relname, a.attnum`;

    const cons = await sql`
      select con.conname name, con.contype type, c.relname tbl, fc.relname ftbl, con.confdeltype del,
        (select array_agg(a.attname order by k.ord) from unnest(con.conkey) with ordinality k(attnum, ord)
           join pg_attribute a on a.attrelid = con.conrelid and a.attnum = k.attnum) cols,
        (select array_agg(a.attname order by k.ord) from unnest(con.confkey) with ordinality k(attnum, ord)
           join pg_attribute a on a.attrelid = con.confrelid and a.attnum = k.attnum) fcols
      from pg_constraint con
      join pg_class c on c.oid = con.conrelid
      join pg_namespace n on n.oid = c.relnamespace
      left join pg_class fc on fc.oid = con.confrelid
      where n.nspname = 'public' and con.contype in ('p','u','f')
      order by c.relname, con.contype, con.conname`;

    const idx = await sql`
      select t.relname tbl, i.relname name, ix.indisunique uniq,
        (select array_agg(pg_get_indexdef(ix.indexrelid, k.n, false) order by k.n)
           from generate_series(1, ix.indnkeyatts::int) k(n)) cols
      from pg_index ix
      join pg_class i on i.oid = ix.indexrelid
      join pg_class t on t.oid = ix.indrelid
      join pg_namespace n on n.oid = t.relnamespace
      where n.nspname = 'public' and not ix.indisprimary
        and not exists (select 1 from pg_constraint c where c.conindid = ix.indexrelid and c.contype = 'u')
      order by t.relname, i.relname`;

    const tables = new Map();
    for (const c of cols) {
      if (!tables.has(c.tbl)) tables.set(c.tbl, []);
      tables.get(c.tbl).push(c);
    }

    const pk = new Map(), uniq = new Map(), fks = [], seenFk = new Map();
    for (const c of cons) {
      if (c.type === "p") pk.set(c.tbl, c.cols);
      else if (c.type === "u") (uniq.get(c.tbl) || uniq.set(c.tbl, []).get(c.tbl)).push(c.cols);
      else {
        const key = `${c.tbl}(${c.cols})>${c.ftbl}(${c.fcols})`;
        if (seenFk.has(key)) {
          console.warn(`duplicate FK in database, omitted from diagram: ${c.name} (same as ${seenFk.get(key)})`);
          continue;
        }
        seenFk.set(key, c.name);
        fks.push(c);
      }
    }
    const fkCols = new Map();
    for (const f of fks) for (const col of f.cols) fkCols.set(`${f.tbl}.${col}`, true);

    const singleUnique = (tbl, col) =>
      (uniq.get(tbl) || []).some((u) => u.length === 1 && u[0] === col) ||
      (pk.get(tbl) || []).length === 1 && pk.get(tbl)[0] === col;

    // ---------- DBML ----------
    let dbml = `// InfraWatch ERD - generated ${new Date().toISOString().slice(0, 10)} from database "${new URL(process.env.DATABASE_URL).pathname.slice(1)}"\n`;
    dbml += `// Edit freely, or paste into https://dbdiagram.io to render. Regenerate: node docs/erd/generate-erd.cjs\n\n`;
    dbml += `Project infra_watch {\n  database_type: 'PostgreSQL'\n}\n\n`;

    for (const [tbl, cs] of tables) {
      const single = pk.get(tbl) && pk.get(tbl).length === 1 ? pk.get(tbl)[0] : null;
      dbml += `Table "${tbl}" {\n`;
      for (const c of cs) {
        const set = [];
        if (c.col === single) set.push("pk");
        if (c.notnull && c.col !== single) set.push("not null");
        if ((uniq.get(tbl) || []).some((u) => u.length === 1 && u[0] === c.col)) set.push("unique");
        const dd = dbmlDefault(c.def);
        if (dd != null) set.push(`default: ${dd}`);
        if (c.note) set.push(`note: '${c.note.replace(/'/g, "\\'")}'`);
        dbml += `  ${c.col} ${dbmlType(c.type)}${set.length ? ` [${set.join(", ")}]` : ""}\n`;
      }
      const blocks = [];
      if (pk.get(tbl) && pk.get(tbl).length > 1) blocks.push(`    (${pk.get(tbl).join(", ")}) [pk]`);
      for (const u of uniq.get(tbl) || []) if (u.length > 1) blocks.push(`    (${u.join(", ")}) [unique]`);
      for (const i of idx.filter((x) => x.tbl === tbl)) {
        const list = i.cols.length > 1 ? `(${i.cols.map((x) => (/^[\w]+$/.test(x) ? x : "`" + x + "`")).join(", ")})` : /^[\w]+$/.test(i.cols[0]) ? i.cols[0] : "`" + i.cols[0] + "`";
        blocks.push(`    ${list} [name: '${i.name}'${i.uniq ? ", unique" : ""}]`);
      }
      if (blocks.length) dbml += `\n  indexes {\n${blocks.join("\n")}\n  }\n`;
      dbml += `}\n\n`;
    }
    for (const f of fks) {
      const l = f.cols.length > 1 ? `(${f.cols.join(", ")})` : f.cols[0];
      const r = f.fcols.length > 1 ? `(${f.fcols.join(", ")})` : f.fcols[0];
      const rel = f.cols.length === 1 && singleUnique(f.tbl, f.cols[0]) ? "-" : ">";
      const opts = [];
      const del = DELETE_RULE[f.del];
      if (del && del !== "no action") opts.push(`delete: ${del}`);
      dbml += `Ref ${f.name}: "${f.tbl}".${l} ${rel} "${f.ftbl}".${r}${opts.length ? ` [${opts.join(", ")}]` : ""}\n`;
    }

    // ---------- Mermaid ----------
    let mmd = `%% InfraWatch ERD - generated ${new Date().toISOString().slice(0, 10)}\n%% Edit freely; render with any Mermaid viewer (VS Code, GitHub, mermaid.live)\n`;
    mmd += `erDiagram\n`;
    for (const [tbl, cs] of tables) {
      mmd += `  ${tbl} {\n`;
      for (const c of cs) {
        const keys = [];
        if ((pk.get(tbl) || []).includes(c.col)) keys.push("PK");
        if (fkCols.has(`${tbl}.${c.col}`)) keys.push("FK");
        if ((uniq.get(tbl) || []).some((u) => u.length === 1 && u[0] === c.col)) keys.push("UK");
        mmd += `    ${mmdType(c.type)} ${c.col}${keys.length ? " " + keys.join(",") : ""}\n`;
      }
      mmd += `  }\n`;
    }
    mmd += `\n`;
    for (const f of fks) {
      const colsInfo = cols.filter((c) => c.tbl === f.tbl && f.cols.includes(c.col));
      const optional = colsInfo.some((c) => !c.notnull);
      const oneToOne = f.cols.length === 1 && singleUnique(f.tbl, f.cols[0]);
      const left = optional ? "|o" : "||";
      const right = oneToOne ? "o|" : "o{";
      mmd += `  ${f.ftbl} ${left}--${right} ${f.tbl} : "${f.cols.join(",")}"\n`;
    }

    const outDir = __dirname;
    fs.writeFileSync(path.join(outDir, "infra-watch.dbml"), dbml);
    fs.writeFileSync(path.join(outDir, "infra-watch.mmd"), mmd);
    console.log(`tables: ${tables.size}, foreign keys: ${fks.length}, indexes: ${idx.length}`);
  } catch (e) {
    console.error("ERR", e.message);
    process.exitCode = 1;
  } finally {
    await sql.end();
  }
})();
