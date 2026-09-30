// Reviewed schema contracts from QWaveLabs/confidant, MIT, copyright 2026 QWave Labs.
// Independent read-only readers. Never read a second source to enrich the first.
import { DatabaseSync } from 'node:sqlite';
import { existsSync, readdirSync, lstatSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { AdapterError, normalizeRecord } from './adapters.mjs';

export const LOCAL_SOURCES = ['messages', 'whatsapp', 'calls', 'notes', 'calendar', 'contacts'];
const epoch = 978307200;
const digest = value => createHash('sha256').update(value).digest('hex');
const clean = value => value instanceof Uint8Array ? Buffer.from(value).toString('utf8').replace(/\u0000/g, '').trim() : value == null ? null : String(value).trim();
const apple = value => Number.isFinite(Number(value)) && value != null ? new Date((Number(value) + epoch) * 1000).toISOString() : null;
const fold = value => String(value ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
function databaseVersions(files) {
  return files.map(path => [path, ...['', '-wal'].map(suffix => {
    try { const stat = statSync(path + suffix, { bigint: true }); return [String(stat.ino), String(stat.size), String(stat.mtimeNs), String(stat.ctimeNs)]; }
    catch (error) { if (error.code === 'ENOENT' && suffix) return null; throw new AdapterError('permission_denied', 'Source metadata is unavailable; no read checkpoint advanced.'); }
  })]);
}

export function sourcePaths(home, requestedSource = 'contacts') {
  const library = join(resolve(home), 'Library');
  const books = join(library, 'Application Support/AddressBook');
  const contacts = [join(books, 'AddressBook-v22.abcddb')];
  if (requestedSource === 'contacts') try { for (const name of readdirSync(join(books, 'Sources')).sort()) contacts.push(join(books, 'Sources', name, 'AddressBook-v22.abcddb')); } catch { /* Permission is checked on the actual approved read. */ }
  return {
    messages: [join(library, 'Messages/chat.db')],
    whatsapp: [join(library, 'Group Containers/group.net.whatsapp.WhatsApp.shared/ChatStorage.sqlite')],
    calls: [join(library, 'Application Support/CallHistoryDB/CallHistory.storedata')],
    notes: [join(library, 'Group Containers/group.com.apple.notes/NoteStore.sqlite')],
    calendar: [join(library, 'Group Containers/group.com.apple.calendar/Calendar.sqlitedb'), join(library, 'Calendars/Calendar.sqlitedb')],
    contacts,
  };
}

export function decodeAttributedBody(blob) {
  const buffer = blob instanceof Uint8Array ? Buffer.from(blob) : null;
  if (!buffer || buffer.length > 2_000_000) return null;
  for (const name of ['NSString', 'NSMutableString']) {
    const marker = buffer.indexOf(name, 0, 'latin1'); if (marker < 0) continue;
    for (let i = marker + name.length; i < Math.min(buffer.length, marker + name.length + 12); i++) {
      if (buffer[i] !== 0x2b) continue;
      const p = i + 1; if (p >= buffer.length) break;
      const width = buffer[p] === 0x81 ? 2 : buffer[p] === 0x82 ? 4 : 0;
      if (p + 1 + width > buffer.length) break;
      const length = width === 2 ? buffer.readUInt16LE(p + 1) : width === 4 ? buffer.readUInt32LE(p + 1) : buffer[p];
      const start = p + 1 + width;
      if (length > 0 && start + length <= buffer.length) return buffer.toString('utf8', start, start + length);
    }
  }
  return null;
}

function schema(db, table, required) {
  const columns = new Set(db.prepare(`PRAGMA table_info("${table}")`).all().map(row => row.name.toLowerCase()));
  if (required.some(name => !columns.has(name.toLowerCase()))) throw new AdapterError('unsupported_schema', 'This source schema is not supported. No cursor was advanced.');
  return { has: name => columns.has(name.toLowerCase()), pick: (name, alias = name, prefix = '') => `${columns.has(name.toLowerCase()) ? `${prefix}${name}` : 'NULL'} AS ${alias}` };
}
function tables(db) { return new Set(db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(row => row.name.toLowerCase())); }
function base(source, row, values) {
  const id = String(values.id ?? row.pk);
  return normalizeRecord(source, { id, timestamp: row.timestamp, participants: [], content: null, direction: null,
    sourceRef: `confidant://source/${source}/${encodeURIComponent(id)}`, metadata: { fixture: false, ...values.metadata }, ...values });
}

function contract(db, source) {
  const present = tables(db);
  if (source === 'messages') {
    const c = schema(db, 'message', ['guid', 'date', 'is_from_me', 'handle_id']); schema(db, 'handle', ['id']);
    const expression = '(CASE WHEN m.date > 100000000000 THEN m.date / 1000000000.0 ELSE m.date END)';
    return { table: 'message', pk: 'm.ROWID', expression, from: 'message m', fields: `m.guid, m.is_from_me, m.handle_id, ${c.pick('text', 'text', 'm.')}, ${c.pick('attributedBody', 'body', 'm.')}, ${c.pick('associated_message_type', 'assoc', 'm.')}, ${c.pick('item_type', 'item', 'm.')}, ${c.pick('date_retracted', 'retracted', 'm.')}`,
      convert(row) {
        if (Number(row.assoc) >= 1000 || Number(row.item) > 0 || Number(row.retracted) > 0) return null;
        const people = [db.prepare('SELECT id FROM handle WHERE ROWID=?').get(row.handle_id)?.id].filter(Boolean);
        let chatId = null; let chatTitle = null;
        if (present.has('chat_message_join') && present.has('chat')) {
          const cc = schema(db, 'chat', ['guid']);
          const chat = db.prepare(`SELECT c.ROWID AS pk,c.guid,${cc.pick('display_name', 'title', 'c.')} FROM chat c JOIN chat_message_join j ON j.chat_id=c.ROWID WHERE j.message_id=? ORDER BY c.ROWID LIMIT 1`).get(row.pk);
          chatId = chat?.guid ?? null;
          chatTitle = chat?.title ?? null;
          if (chat && present.has('chat_handle_join')) for (const h of db.prepare('SELECT h.id FROM handle h JOIN chat_handle_join j ON j.handle_id=h.ROWID WHERE j.chat_id=?').all(chat.pk)) people.push(h.id);
        }
        const content = clean(row.text) || decodeAttributedBody(row.body);
        return base(source, row, { id: row.guid, participants: [...new Set(people)], direction: row.is_from_me ? 'outgoing' : 'incoming', content,
          metadata: { fixture: false, chatId, chatTitle, contentAvailable: Boolean(content), bodyGap: content ? null : 'No supported text body. Attachments and audio are not opened.' } });
      }, gaps: [] };
  }
  if (source === 'calls') {
    const c = schema(db, 'ZCALLRECORD', ['ZDATE', 'ZADDRESS', 'ZORIGINATED', 'Z_PK']);
    return { table: 'ZCALLRECORD', pk: 'm.Z_PK', expression: 'm.ZDATE', from: 'ZCALLRECORD m', fields: ['ZADDRESS', 'ZNAME', 'ZORIGINATED', 'ZDURATION', 'ZCALLTYPE', 'ZANSWERED', 'ZUNIQUE_ID'].map(name => c.pick(name, name, 'm.')).join(','),
      convert: row => base(source, row, { id: clean(row.ZUNIQUE_ID) ?? String(row.pk), participants: [clean(row.ZADDRESS), clean(row.ZNAME)].filter(Boolean), direction: row.ZORIGINATED ? 'outgoing' : 'incoming',
        metadata: { fixture: false, durationSeconds: Number(row.ZDURATION ?? 0), service: Number(row.ZCALLTYPE) === 8 ? 'FaceTime video' : Number(row.ZCALLTYPE) === 16 ? 'FaceTime audio' : 'phone or app', answered: Boolean(row.ZANSWERED), contentAvailable: false } }),
      gaps: [{ code: 'metadata_only', reason: 'Call metadata does not contain call content. Apple transcripts are a separate source.' }] };
  }
  if (source === 'whatsapp') {
    const c = schema(db, 'ZWAMESSAGE', ['Z_PK', 'ZMESSAGEDATE', 'ZCHATSESSION', 'ZISFROMME']);
    const s = schema(db, 'ZWACHATSESSION', ['Z_PK', 'ZCONTACTJID']);
    return { table: 'ZWAMESSAGE', pk: 'm.Z_PK', expression: 'm.ZMESSAGEDATE', from: 'ZWAMESSAGE m', fields: ['ZTEXT', 'ZCHATSESSION', 'ZISFROMME', 'ZFROMJID', 'ZSTANZAID', 'ZMESSAGETYPE'].map(name => c.pick(name, name, 'm.')).join(','),
      convert(row) {
        const chat = db.prepare(`SELECT ZCONTACTJID,${s.pick('ZPARTNERNAME')},${s.pick('ZSESSIONTYPE')} FROM ZWACHATSESSION WHERE Z_PK=?`).get(row.ZCHATSESSION);
        if (!chat || [2, 3, 4].includes(Number(chat.ZSESSIONTYPE))) return null;
        if (row.ZMESSAGETYPE != null && ![0, 1, 2, 3, 4, 5, 7, 8, 11, 27, 38, 39, 46, 53, 54].includes(Number(row.ZMESSAGETYPE))) return null;
        const participants = [chat.ZCONTACTJID, chat.ZPARTNERNAME, row.ZFROMJID].map(clean).filter(Boolean);
        if (present.has('zwagroupmember')) {
          const g = schema(db, 'ZWAGROUPMEMBER', ['ZMEMBERJID']);
          if (g.has('ZCHATSESSION')) for (const person of db.prepare(`SELECT ZMEMBERJID,${g.pick('ZCONTACTNAME')} FROM ZWAGROUPMEMBER WHERE ZCHATSESSION=?`).all(row.ZCHATSESSION)) participants.push(...[person.ZMEMBERJID, person.ZCONTACTNAME].filter(Boolean));
        }
        return base(source, row, { id: row.ZSTANZAID ? `${chat.ZCONTACTJID}/${row.ZSTANZAID}` : `row-${row.pk}`, participants: [...new Set(participants)], direction: row.ZISFROMME ? 'outgoing' : 'incoming', content: clean(row.ZTEXT), metadata: { fixture: false, chatId: chat.ZCONTACTJID, messageType: row.ZMESSAGETYPE, localHistoryOnly: true } });
      }, gaps: [{ code: 'local_history_only', reason: 'Only locally synced WhatsApp history is available. Older and unsupported media content are unknown; no manual export fallback.' }] };
  }
  if (source === 'notes') {
    const c = schema(db, 'ZICCLOUDSYNCINGOBJECT', ['Z_PK', 'ZIDENTIFIER', 'ZFOLDER', 'ZTITLE2', 'ZTYPEUTI']);
    const folders = db.prepare('SELECT Z_PK,ZTITLE2 FROM ZICCLOUDSYNCINGOBJECT WHERE ZTITLE2 IS NOT NULL').all().filter(row => ['call recordings', 'grabaciones de llamadas', 'llamadas grabadas', 'enregistrements d appels', 'anrufaufzeichnungen'].includes(fold(row.ZTITLE2))).map(row => row.Z_PK);
    if (!folders.length) throw new AdapterError('transcript_unavailable', 'No recognized Apple Call Recordings folder exists. Other Notes are not read.');
    const dates = ['ZCREATIONDATE3', 'ZCREATIONDATE1', 'ZCREATIONDATE', 'ZMODIFICATIONDATE1'].filter(c.has);
    if (!dates.length) throw new AdapterError('unsupported_schema', 'Apple transcript dates are unavailable.');
    const expression = dates.length > 1 ? `COALESCE(${dates.map(name => 'm.' + name).join(',')})` : 'm.' + dates[0];
    return { table: 'ZICCLOUDSYNCINGOBJECT', pk: 'm.Z_PK', expression, from: 'ZICCLOUDSYNCINGOBJECT m', fields: `m.ZIDENTIFIER,${c.pick('ZTITLE1', 'title', 'm.')}`,
      extra: `m.ZFOLDER IN (${folders.map(Number).join(',')})${c.has('ZMARKEDFORDELETION') ? ' AND COALESCE(m.ZMARKEDFORDELETION,0)=0' : ''}`,
      convert(row) {
        let transcript = null;
        if (c.has('ZNOTE') && c.has('ZADDITIONALINDEXABLETEXT')) transcript = db.prepare("SELECT ZADDITIONALINDEXABLETEXT AS text FROM ZICCLOUDSYNCINGOBJECT WHERE ZNOTE=? AND (ZTYPEUTI LIKE '%audio%' OR ZTYPEUTI LIKE '%m4a%') AND ZADDITIONALINDEXABLETEXT IS NOT NULL LIMIT 1").get(row.pk)?.text;
        return base(source, row, { id: row.ZIDENTIFIER, content: clean(transcript), metadata: { fixture: false, appleTranscriptSupplied: Boolean(clean(transcript)), title: clean(row.title), speakerIdentity: 'unknown', callLink: 'unverified', transcriptGap: transcript ? null : 'missing_apple_transcript' } });
      }, gaps: [{ code: 'partial_transcript_linking', reason: 'Only Apple-supplied text directly linked to audio attachments is read. Protobuf-only attachment links and caller/speaker attribution remain unverified. No audio is opened or transcribed.' }] };
  }
  if (source === 'calendar') {
    const c = schema(db, 'CalendarItem', ['start_date']);
    return { table: 'CalendarItem', pk: 'm.ROWID', expression: 'm.start_date', from: 'CalendarItem m', fields: ['summary', 'description', 'UUID', 'unique_identifier', 'end_date', 'all_day', 'start_tz', 'has_recurrences', 'entity_type', 'hidden', 'status'].map(name => c.pick(name, name, 'm.')).join(','),
      extra: [c.has('entity_type') ? 'm.entity_type=2' : null, c.has('hidden') ? 'COALESCE(m.hidden,0)=0' : null].filter(Boolean).join(' AND '),
      convert(row) {
        if (row.all_day || row.start_tz === '_float') return null; // No fabricated timezone precision.
        const participants = [];
        if (present.has('participant')) {
          const p = schema(db, 'Participant', ['owner_id']);
          if (p.has('email')) for (const person of db.prepare('SELECT email FROM Participant WHERE owner_id=?').all(row.pk)) if (person.email) participants.push(person.email);
        }
        return base(source, row, { id: row.unique_identifier ?? row.UUID ?? String(row.pk), participants, content: [clean(row.summary), clean(row.description)].filter(Boolean).join('\n') || null, metadata: { fixture: false, endAt: apple(row.end_date), recurring: Boolean(row.has_recurrences), status: row.status } });
      }, gaps: [{ code: 'calendar_context_partial', reason: 'Base non-floating event times only. Recurrence expansion, all-day/floating timezone conversion and future event coverage are not established.' }] };
  }
  if (source === 'contacts') {
    const c = schema(db, 'ZABCDRECORD', ['Z_PK']);
    const dates = ['ZMODIFICATIONDATE', 'ZCREATIONDATE'].filter(c.has);
    if (!dates.length) throw new AdapterError('unsupported_schema', 'Contacts have no supported timestamp columns.');
    return { table: 'ZABCDRECORD', pk: 'm.Z_PK', expression: dates.length > 1 ? `COALESCE(${dates.map(name => 'm.' + name).join(',')})` : 'm.' + dates[0], from: 'ZABCDRECORD m', fields: ['ZUNIQUEID', 'ZFIRSTNAME', 'ZMIDDLENAME', 'ZLASTNAME', 'ZNICKNAME', 'ZORGANIZATION', 'ZNAME'].map(name => c.pick(name, name, 'm.')).join(','),
      convert(row) {
        if (row.ZNAME && !row.ZFIRSTNAME && !row.ZLASTNAME && !row.ZORGANIZATION) return null;
        const name = [row.ZFIRSTNAME, row.ZMIDDLENAME, row.ZLASTNAME].map(clean).filter(Boolean).join(' ') || clean(row.ZORGANIZATION) || clean(row.ZNICKNAME);
        const people = [name].filter(Boolean);
        if (present.has('zabcdphonenumber')) for (const person of db.prepare('SELECT ZFULLNUMBER AS value FROM ZABCDPHONENUMBER WHERE ZOWNER=?').all(row.pk)) if (person.value) people.push(person.value);
        if (present.has('zabcdemailaddress')) for (const person of db.prepare('SELECT ZADDRESS AS value FROM ZABCDEMAILADDRESS WHERE ZOWNER=?').all(row.pk)) if (person.value) people.push(person.value);
        return base(source, row, { id: row.ZUNIQUEID ?? String(row.pk), participants: [...new Set(people)], content: name, metadata: { fixture: false, identityMerge: 'not inferred', company: clean(row.ZORGANIZATION) } });
      }, gaps: [{ code: 'contacts_date_scope', reason: 'Only timestamped cards within the requested rolling window are considered; older unchanged cards and cross-account identity merging are not established.' }] };
  }
  throw new AdapterError('unsupported_source', 'Unknown local source.');
}

export function makeMacAdapters({ paths, authorized = () => false } = {}) {
  return Object.fromEntries(LOCAL_SOURCES.map(source => [source, {
    id: source, kind: 'local', fixture: false,
    async readPage({ cursor = null, from, to, limit = 20 } = {}) {
      if (!authorized(source)) throw new AdapterError('permission_denied', 'Explicit source approval is required before opening its database.');
      if (!Number.isInteger(limit) || limit < 1 || limit > 100 || !Number.isFinite(Date.parse(from)) || !Number.isFinite(Date.parse(to))) throw new AdapterError('invalid_page_request', 'Provide a bounded date range and page size.');
      const configured = typeof paths === 'function' ? paths(source) : paths?.[source];
      if (!Array.isArray(configured) || !configured.length) throw new AdapterError('source_unavailable', 'No approved database path is configured.');
      const candidates = configured.map(path => resolve(path));
      const available = candidates.filter(path => existsSync(path));
      const files = source === 'calendar' ? available.slice(0, 1) : available;
      if (!files.length) throw new AdapterError('permission_denied', 'The database is unavailable or permission is denied. Grant the source permission and retry; it is not connected.');
      const versions = databaseVersions(files);
      const signature = digest(JSON.stringify({ source, versions, from, to }));
      let state = { source, signature, index: 0, before: null, beforeDate: null, high: null };
      if (cursor) {
        try { const parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')); if (typeof cursor !== 'string' || cursor.length > 2048 || parsed.signature !== signature || parsed.source !== source || !Number.isInteger(parsed.index) || parsed.index < 0 || parsed.index >= files.length || (parsed.high !== null && !Number.isSafeInteger(parsed.high)) || (parsed.before !== null && !Number.isSafeInteger(parsed.before)) || (parsed.beforeDate !== null && !Number.isFinite(parsed.beforeDate))) throw new Error(); state = parsed; }
        catch { throw new AdapterError('stale_cursor', 'The source path set or date range changed. Restart the saved window safely.'); }
      }
      const path = files[state.index]; let db;
      try {
        if (lstatSync(path).isSymbolicLink()) throw new AdapterError('unsupported_schema', 'A source database symlink needs operator review.');
        db = new DatabaseSync(path, { readOnly: true }); db.exec('PRAGMA query_only=ON; PRAGMA busy_timeout=3000; BEGIN;');
        const spec = contract(db, source);
        const maximum = db.prepare(`SELECT MAX(${spec.pk}) AS pk FROM ${spec.from}`).get().pk ?? 0;
        const high = state.high ?? Number(maximum);
        const before = state.before ?? high + 1; const beforeDate = state.beforeDate ?? Date.parse(to) / 1000 - epoch + 1;
        const rows = db.prepare(`SELECT ${spec.pk} AS pk, ${spec.expression} AS seconds, ${spec.fields} FROM ${spec.from} WHERE ${spec.pk}<=? AND (${spec.expression}<? OR (${spec.expression}=? AND ${spec.pk}<?)) AND ${spec.expression}>=? AND ${spec.expression}<=? ${spec.extra ? 'AND ' + spec.extra : ''} ORDER BY ${spec.expression} DESC, ${spec.pk} DESC LIMIT ?`).all(high, beforeDate, beforeDate, before, Date.parse(from) / 1000 - epoch, Date.parse(to) / 1000 - epoch, limit);
        const key = digest(path).slice(0, 12); const items = [];
        let unsupported = 0;
        for (const row of rows) {
          row.timestamp = apple(row.seconds); const item = spec.convert(row);
          if (item) { if (source === 'contacts') { item.id = `${key}:${item.id}`; item.sourceRef = `confidant://source/contacts/${encodeURIComponent(item.id)}`; } items.push(item); } else unsupported++;
        }
        let next = { source, signature, index: state.index, high, before: rows.at(-1)?.pk ?? before, beforeDate: rows.at(-1)?.seconds ?? beforeDate };
        if (rows.length < limit) next = { ...next, index: state.index + 1, high: null, before: null, beforeDate: null };
        const exhausted = next.index >= files.length;
        const gaps = [...spec.gaps, ...(unsupported ? [{ code: 'unsupported_rows', reason: `${unsupported} rows on this page contain excluded system events or unsupported time/content shapes.` }] : [])];
        if (['messages', 'whatsapp'].includes(source) && items.some(item => !item.content)) gaps.push({ code: 'missing_message_text', reason: 'Some available messages have no supported text body. Attachments/audio are not opened or transcribed.' });
        if (source === 'contacts' && available.length < candidates.length) gaps.push({ code: 'account_database_unavailable', reason: 'Some configured Contacts databases are unavailable; the connected account set is partial.' });
        db.exec('COMMIT');
        if (digest(JSON.stringify(databaseVersions(files))) !== digest(JSON.stringify(versions))) throw new AdapterError('stale_cursor', 'Source data changed while reading this page. Retry from a reconciled stable window; no page checkpoint advanced.');
        return { items, nextCursor: exhausted ? null : Buffer.from(JSON.stringify(next)).toString('base64url'), exhausted, gaps, scanned: rows.length, order: 'newest timestamp first within each approved database; separate account databases reconciled in stable order' };
      } catch (error) {
        if (error instanceof AdapterError) throw error;
        throw new AdapterError(['EACCES', 'EPERM'].includes(error.code) ? 'permission_denied' : 'read_failed', 'Read-only source access failed. Check permission, schema and sync state; no durable cursor advanced.');
      } finally { db?.close(); }
    },
  }]));
}
