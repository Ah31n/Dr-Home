/*
 * preview/shim/liquid.js — a small Liquid subset engine for the LOCAL
 * DESIGN PREVIEW ONLY. It renders the real theme files with clearly-labelled
 * demo data. It is not a Shopify runtime and is never deployed with the
 * theme. Production rendering is Shopify's own Liquid engine.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const NIL = null;

/* ------------------------------------------------------------------ *
 * Tokenizer
 * ------------------------------------------------------------------ */
function tokenize(src) {
  const tokens = [];
  const re = /\{%-?([\s\S]*?)-?%\}|\{\{-?([\s\S]*?)-?\}\}/g;
  let last = 0;
  let m;
  while ((m = re.exec(src)) !== null) {
    let text = src.slice(last, m.index);
    const lTag = m[0].startsWith('{%') && m[0].includes('-%}');
    const lOut = m[0].startsWith('{{') && m[0].includes('-}}');
    if (lTag || lOut) text = text.replace(/\s+$/, '');
    if (lTag || lOut) { /* leading trim handled below on next text */ }
    tokens.push({ type: 'text', value: text });
    if (m[1] !== undefined) tokens.push({ type: 'tag', value: m[1].trim(), trimLeft: m[0].includes('-%}') });
    else tokens.push({ type: 'out', value: m[2].trim(), trimLeft: m[0].includes('-}}') });
    last = re.lastIndex;
  }
  tokens.push({ type: 'text', value: src.slice(last) });

  // apply left-trim
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if ((t.type === 'tag' || t.type === 'out') && t.trimLeft) {
      for (let j = i + 1; j < tokens.length; j++) {
        if (tokens[j].type === 'text') { tokens[j].value = tokens[j].value.replace(/^\s+/, ''); break; }
        break;
      }
    }
  }
  return tokens.filter(t => t.type !== 'text' || t.value !== '');
}

/* ------------------------------------------------------------------ *
 * Parser
 * ------------------------------------------------------------------ */
const BLOCK_TAGS = new Set(['if', 'unless', 'case', 'for', 'form', 'paginate', 'comment', 'schema', 'raw', 'liquid']);

function parse(tokens) {
  let i = 0;
  function parseUntil(stopTags) {
    const nodes = [];
    while (i < tokens.length) {
      const t = tokens[i];
      if (t.type === 'text') { nodes.push({ type: 'text', value: t.value }); i++; continue; }
      if (t.type === 'out') { nodes.push({ type: 'out', expr: parseExpression(t.value) }); i++; continue; }

      // tag
      const name = (t.value.match(/^(\w+)/) || [])[1] || '';
      if (stopTags && stopTags.includes(name)) return nodes; // caller consumes
      i++;
      const body = t.value.slice(name.length).trim();
      switch (name) {
        case 'if': {
          const node = { type: 'if', branches: [{ cond: parseCondition(body), body: parseUntil(['elsif', 'else', 'endif']) }] };
          while (true) {
            const tt = tokens[i];
            if (!tt || tt.type !== 'tag') break;
            const n = (tt.value.match(/^(\w+)/) || [])[1];
            if (n === 'elsif') { i++; node.branches.push({ cond: parseCondition(tt.value.slice(5).trim()), body: parseUntil(['elsif', 'else', 'endif']) }); }
            else if (n === 'else') { i++; node.branches.push({ cond: null, body: parseUntil(['endif']) }); i++; break; }
            else if (n === 'endif') { i++; break; }
            else break;
          }
          nodes.push(node); break;
        }
        case 'unless': {
          const node = { type: 'unless', cond: parseCondition(body), body: parseUntil(['else', 'endunless']) };
          const tt = tokens[i];
          if (tt && tt.type === 'tag' && tt.value.startsWith('else')) { i++; node.elseBody = parseUntil(['endunless']); }
          else node.elseBody = [];
          i++; // endunless
          nodes.push(node); break;
        }
        case 'case': {
          const node = { type: 'case', subject: parseOperand(body), whens: [], elseBody: null };
          // next token must be a when
          while (true) {
            const tt = tokens[i];
            if (!tt || tt.type !== 'tag') break;
            const n = (tt.value.match(/^(\w+)/) || [])[1];
            if (n === 'when') {
              i++;
              const vals = tt.value.slice(4).trim().split(/\s+or\s+|\s*,\s*/).map(s => parseOperand(s));
              const body = parseUntil(['when', 'else', 'endcase']);
              node.whens.push({ values: vals, body });
            } else if (n === 'else') { i++; node.elseBody = parseUntil(['endcase']); i++; break; }
            else if (n === 'endcase') { i++; break; }
            else break;
          }
          nodes.push(node); break;
        }
        case 'for': {
          // for x in expr [limit: n] [offset: m]
          const mm = body.match(/^(\w+)\s+in\s+([\s\S]+?)$/);
          /* Extract inline `limit:` / `offset:` clauses before comma-splitting. */
          const inlineParams = {};
          const rest = mm[2].replace(/\s+(limit|offset)\s*:\s*([\w.]+)\s*/g, (_, k, v) => {
            inlineParams[k] = v;
            return ' ';
          });
          const restParts = splitTopLevel(rest.trim());
          const node = {
            type: 'for',
            varName: mm[1],
            coll: null,
            limit: null, offset: null,
            body: parseUntil(['else', 'endfor']),
          };
          const rangeMatch = restParts[0].match(/^\((.+)\)$/);
          node.coll = rangeMatch ? { range: rangeMatch[1] } : parseOperand(restParts[0].trim());
          for (const p of restParts.slice(1)) {
            const kv = p.split(':');
            if (kv[0].trim() === 'limit') node.limit = parseOperand(kv[1].trim());
            if (kv[0].trim() === 'offset') node.offset = parseOperand(kv[1].trim());
          }
          if (inlineParams.limit) node.limit = parseOperand(inlineParams.limit);
          if (inlineParams.offset) node.offset = parseOperand(inlineParams.offset);
          const tt = tokens[i];
          if (tt && tt.type === 'tag' && tt.value.startsWith('else')) { i++; node.elseBody = parseUntil(['endfor']); }
          else node.elseBody = [];
          i++;
          nodes.push(node); break;
        }
        case 'comment': parseUntil(['endcomment']); i++; nodes.push({ type: 'text', value: '' }); break;
        case 'schema': parseUntil(['endschema']); i++; nodes.push({ type: 'text', value: '' }); break;
        case 'raw': {
          // collect text until endraw
          let raw = '';
          while (i < tokens.length) {
            const tt = tokens[i];
            if (tt.type === 'tag' && tt.value.startsWith('endraw')) { i++; break; }
            raw += tt.type === 'text' ? tt.value : (tt.type === 'out' ? '{{' + tt.value + '}}' : '{%' + tt.value + '%}');
            i++;
          }
          nodes.push({ type: 'text', value: raw }); break;
        }
        case 'liquid': {
          const lines = body.split('\n').map(l => l.trim()).filter(Boolean);
          const sub = [];
          for (const line of lines) sub.push({ type: 'tag', value: line });
          const inner = parse(sub);
          nodes.push({ type: 'group', nodes: inner });
          break;
        }
        case 'assign': {
          const mm = body.match(/^(\w+)\s*=\s*([\s\S]+)$/);
          nodes.push({ type: 'assign', name: mm[1], expr: parseExpression(mm[2]) });
          break;
        }
        case 'echo': nodes.push({ type: 'out', expr: parseExpression(body) }); break;
        case 'render': nodes.push({ type: 'render', args: parseTagArgs(body) }); break;
        case 'section': nodes.push({ type: 'section', name: parseOperand(body) }); break;
        case 'sections': nodes.push({ type: 'sections', name: parseOperand(body) }); break;
        case 'form': nodes.push({ type: 'form', args: parseTagArgs(body), body: parseUntil(['endform']) }); i++; break;
        case 'paginate': {
          const mm = body.match(/^([\s\S]+?)\s+by\s+(\w+)$/);
          nodes.push({ type: 'paginate', coll: parseOperand(mm[1]), by: parseOperand(mm[2]), body: parseUntil(['endpaginate']) }); i++;
          break;
        }
        default:
          nodes.push({ type: 'unknown-tag', name, body });
      }
    }
    return nodes;
  }
  const nodes = parseUntil(null);
  return nodes;
}

/* ------------------------------------------------------------------ *
 * Expression parsing
 * ------------------------------------------------------------------ */
function splitTopLevel(str, sep = ',') {
  const out = [];
  let depth = 0, cur = '', inStr = null;
  for (let c = 0; c < str.length; c++) {
    const ch = str[c];
    if (inStr) { cur += ch; if (ch === inStr) inStr = null; continue; }
    if (ch === "'" || ch === '"') { inStr = ch; cur += ch; continue; }
    if (ch === '[' || ch === '(') depth++;
    if (ch === ']' || ch === ')') depth--;
    if (ch === sep && depth === 0) { out.push(cur.trim()); cur = ''; continue; }
    cur += ch;
  }
  if (cur.trim() !== '') out.push(cur.trim());
  return out;
}

function parseExpression(str) {
  const parts = splitTopLevel(str, '|');
  const operand = parseOperand(parts[0].trim());
  const filters = parts.slice(1).map(f => {
    const all = splitTopLevel(f, ',');
    /* first chunk is `name` or `name: firstArg` */
    const head = all[0].trim();
    const headSplit = head.match(/^([\w-]+)\s*:\s*([\s\S]+)$/);
    let name, restArgs;
    if (headSplit && !/^['"]/.test(head)) {
      name = headSplit[1];
      restArgs = [headSplit[2], ...all.slice(1)];
    } else {
      name = head;
      restArgs = all.slice(1);
    }
    let named = null; const positional = [];
    for (const r of restArgs) {
      const kv = r.match(/^([\w-]+)\s*:\s*([\s\S]+)$/);
      if (kv) {
        if (!named) named = {};
        named[kv[1]] = parseOperand(kv[2].trim());
      } else positional.push(parseOperand(r.trim()));
    }
    return { name, positional, named };
  });
  return { operand, filters };
}

function parseOperand(str) {
  str = str.trim();
  // literals
  if (/^'.*'$/.test(str) || /^".*"$/.test(str)) return { kind: 'lit', value: str.slice(1, -1) };
  if (/^-?\d+(\.\d+)?$/.test(str)) return { kind: 'lit', value: parseFloat(str) };
  if (str === 'true') return { kind: 'lit', value: true };
  if (str === 'false') return { kind: 'lit', value: false };
  if (str === 'nil' || str === 'null' || str === 'blank' || str === 'empty') return { kind: 'kw', value: str };
  if (/^\(\s*-?\d+\s*\.\.\s*-?\d+\s*\)$/.test(str)) return { kind: 'range', value: str };
  // path with segments
  const segs = [];
  const re = /([a-zA-Z_][\w-]*)|\[\s*([^\]]+?)\s*\]|\.([a-zA-Z_][\w-]*)/g;
  let m, first = true;
  while ((m = re.exec(str)) !== null) {
    if (m[1] !== undefined) { if (first) segs.push({ type: 'prop', value: m[1] }); }
    else if (m[2] !== undefined) segs.push({ type: 'index', expr: m[2].trim() });
    else if (m[3] !== undefined) segs.push({ type: 'prop', value: m[3] });
    first = false;
  }
  return { kind: 'path', segments: segs };
}

function parseCondition(str) {
  // split on and/or at top level
  const tokens = [];
  const re = /\s+(and|or)\s+/gi;
  let last = 0, m;
  while ((m = re.exec(str)) !== null) {
    tokens.push({ op: null, expr: str.slice(last, m.index) });
    tokens.push({ op: m[1].toLowerCase(), expr: null });
    last = re.lastIndex;
  }
  tokens.push({ op: null, expr: str.slice(last) });
  const cond = { items: [] };
  for (const t of tokens) {
    if (t.op) cond.items.push({ op: t.op });
    else cond.items.push({ cmp: parseComparison(t.expr) });
  }
  return cond;
}

function parseComparison(str) {
  str = str.trim();
  const mm = str.match(/^(.+?)\s*(==|!=|<>|>=|<=|>|<)\s*(.+)$/) || str.match(/^(.+?)\s+(contains)\s+(.+)$/);
  if (!mm) return { left: parseExpression(str), op: null };
  if (mm[2] === 'contains') return { left: parseExpression(mm[1]), op: 'contains', right: parseExpression(mm[3]) };
  return { left: parseExpression(mm[1]), op: mm[2], right: parseExpression(mm[3]) };
}

/* ------------------------------------------------------------------ *
 * Evaluation
 * ------------------------------------------------------------------ */
class Scope {
  constructor(parent) { this.parent = parent; this.vars = {}; }
  get(name) {
    let s = this;
    while (s) { if (name in s.vars) return s.vars[name]; s = s.parent; }
    return undefined;
  }
  set(name, value) { this.vars[name] = value; }
}

function isBlank(v) {
  return v === null || v === undefined || v === false || v === '' ||
    (Array.isArray(v) && v.length === 0) ||
    (typeof v === 'object' && v !== null && !Array.isArray(v) && Object.keys(v).length === 0 && v.isBlank === true);
}

function evalOperand(op, scope, ctx) {
  if (op.kind === 'lit') return op.value;
  if (op.kind === 'kw') {
    if (op.value === 'blank' || op.value === 'empty') return { __blank: true };
    return null;
  }
  if (op.kind === 'range') {
    const mm = op.value.match(/\((\d+)\.\.(\d+)\)/);
    const a = parseInt(mm[1], 10), b = parseInt(mm[2], 10);
    const out = []; for (let x = a; x <= b; x++) out.push(x); return out;
  }
  if (op.kind === 'path') return evalPath(op.segments, scope, ctx);
  return null;
}

function evalPath(segments, scope, ctx) {
  let base;
  const first = segments[0];
  if (first.type === 'prop') {
    base = scope.get(first.value);
    if (base === undefined && ctx.globals && first.value in ctx.globals) base = ctx.globals[first.value];
    if (base === undefined) base = null;
  } else {
    base = null;
  }
  for (let i = 1; i < segments.length; i++) {
    const seg = segments[i];
    if (base === null || base === undefined) return null;
    if (seg.type === 'prop') {
      base = getProperty(base, seg.value, ctx);
    } else {
      const key = evalString(seg.expr, scope, ctx);
      base = getProperty(base, String(key), ctx);
    }
  }
  return base === undefined ? null : base;
}

function getProperty(obj, key, ctx) {
  if (obj === null || obj === undefined) return null;
  if (Array.isArray(obj)) {
    const n = parseInt(key, 10);
    if (!isNaN(n)) return obj[n] ?? null;
    if (key === 'size' || key === 'length') return obj.length;
    if (key === 'first') return obj[0] ?? null;
    if (key === 'last') return obj[obj.length - 1] ?? null;
    return null;
  }
  if (typeof obj === 'object') {
    if (key in obj) {
      const v = obj[key];
      return typeof v === 'function' ? v(ctx) : v;
    }
    return null;
  }
  if (typeof obj === 'string' && key === 'size') return obj.length;
  return null;
}

function evalString(exprSource, scope, ctx) {
  const expr = parseExpression(exprSource);
  return evalExpr(expr, scope, ctx);
}

function evalExpr(expr, scope, ctx) {
  let v = evalOperand(expr.operand, scope, ctx);
  for (const f of expr.filters || []) v = applyFilter(f, v, scope, ctx);
  return v;
}

function looseEq(a, b) {
  const blankA = a !== null && typeof a === 'object' && a.__blank;
  const blankB = b !== null && typeof b === 'object' && b.__blank;
  if (blankA && blankB) return true;
  if (blankA) return isBlank(a2(b));
  if (blankB) return isBlank(a);
  if (a === null || a === undefined) a = null;
  if (b === null || b === undefined) b = null;
  if (a === null || b === null) return a === b;
  if (typeof a === 'boolean' || typeof b === 'boolean') return String(a) === String(b);
  const na = typeof a !== 'object' ? Number(a) : NaN;
  const nb = typeof b !== 'object' ? Number(b) : NaN;
  if (!isNaN(na) && !isNaN(nb) && String(na) === String(a).trim() && String(nb) === String(b).trim()) return na === nb;
  if (typeof a !== 'object' && typeof b !== 'object') return String(a) === String(b);
  return a === b;
}

function a2(v) { return v === undefined ? null : v; }

function evalComparison(cmp, scope, ctx) {
  const left = evalExpr(cmp.left, scope, ctx);
  if (!cmp.op) return truthy(left);
  const right = evalExpr(cmp.right, scope, ctx);
  switch (cmp.op) {
    case '==': return looseEq(left, right);
    case '!=':
    case '<>': return !looseEq(left, right);
    case 'contains': {
      if (Array.isArray(left)) return left.some(x => looseEq(x, right));
      if (typeof left === 'string') return left.toLowerCase().includes(String(right ?? '').toLowerCase());
      return false;
    }
    case '>': case '>=': case '<': case '<=': {
      const na = Number(left), nb = Number(right);
      const a = isNaN(na) ? String(left) : na;
      const b = isNaN(nb) ? String(right) : nb;
      if (cmp.op === '>') return a > b;
      if (cmp.op === '>=') return a >= b;
      if (cmp.op === '<') return a < b;
      return a <= b;
    }
  }
  return false;
}

function truthy(v) {
  if (v === false) return false;
  if (v === null || v === undefined) return false;
  if (typeof v === 'object' && v.__blank) return false;
  return true;
}

function evalCondition(cond, scope, ctx) {
  let result = null;
  for (const item of cond.items) {
    const val = item.op ? item.op : evalComparison(item.cmp, scope, ctx);
    if (result === null) result = val;
    else if (item.op === 'and') result = result && val;
    else if (item.op === 'or') result = result || val;
    else result = val;
  }
  return result === true;
}

/* ------------------------------------------------------------------ *
 * Filters
 * ------------------------------------------------------------------ */
function hexToRgb(hex) {
  const m = hex.replace('#', '');
  const v = m.length === 3 ? m.split('').map(c => c + c).join('') : m;
  return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)];
}
function rgbToHex(r, g, b) {
  const c = x => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, '0');
  return '#' + c(r) + c(g) + c(b);
}

function applyFilter(f, input, scope, ctx) {
  const args = (f.positional || []).map(a => evalOperand(a, scope, ctx));
  const named = {};
  if (f.named) for (const k of Object.keys(f.named)) named[k] = evalOperand(f.named[k], scope, ctx);

  switch (f.name) {
    case 't': {
      const key = String(input ?? '');
      return ctx.translate(key, named);
    }
    case 'json': return JSON.stringify(input ?? null);
    case 'escape': case 'h': return htmlEscape(String(input ?? ''));
    case 'default': return isBlank(input) || input === null || input === undefined || input === '' || input === false ? (args[0] ?? '') : input;
    case 'money': return ctx.formatMoney(input);
    case 'money_with_currency': return ctx.formatMoney(input) + ' ' + (ctx.globals.shop.currency?.iso_code || '');
    case 'image_url': {
      if (!input) return '';
      const url = typeof input === 'string' ? input : (input.url || input.src || '');
      const w = named.width, h = named.height;
      if (!url) return '';
      const qs = [];
      if (w) qs.push('width=' + w);
      if (h) qs.push('height=' + h);
      return url + (qs.length ? '?' + qs.join('&') : '');
    }
    case 'image_tag': {
      const url = typeof input === 'string' ? input : (input?.url || '');
      const attrs = Object.entries(named).map(([k, v]) => `${k}="${htmlEscape(String(v))}"`).join(' ');
      return `<img src="${htmlEscape(url)}" alt="${named.alt ? htmlEscape(String(named.alt)) : ''}" ${attrs}>`;
    }
    case 'asset_url': return '/assets/' + String(input);
    case 'stylesheet_tag': return `<link rel="stylesheet" href="/assets/${String(input)}">`;
    case 'script_tag': return `<script src="/assets/${String(input)}"><\/script>`;
    case 'placeholder_svg_tag': {
      const label = String(args[0] ?? 'placeholder').replace(/-/g, ' ');
      return `<svg class="placeholder-svg" viewBox="0 0 400 400" role="img" aria-label="${htmlEscape(label)} (placeholder)" style="width:100%;height:100%;background:linear-gradient(160deg,#efeae1,#e3dcd0);"><rect x="60" y="60" width="280" height="280" rx="24" fill="none" stroke="#c9c0b0" stroke-width="2" stroke-dasharray="6 6"/><text x="200" y="205" text-anchor="middle" font-family="sans-serif" font-size="16" fill="#a89e8c">${htmlEscape(label)}</text></svg>`;
    }
    case 'date': {
      let d;
      const v = input;
      if (v === 'now' || v === 'today') d = new Date();
      else if (v instanceof Date) d = v;
      else if (typeof v === 'number') d = new Date(v);
      else d = new Date(String(v ?? ''));
      if (isNaN(d)) return String(input ?? '');
      const fmt = String(args[0] ?? '%Y-%m-%d');
      const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      const pad = n => String(n).padStart(2, '0');
      return fmt
        .replace(/%Y/g, d.getFullYear())
        .replace(/%m/g, pad(d.getMonth() + 1))
        .replace(/%d/g, pad(d.getDate()))
        .replace(/%e/g, String(d.getDate()))
        .replace(/%B/g, months[d.getMonth()])
        .replace(/%b/g, months[d.getMonth()].slice(0, 3))
        .replace(/%H/g, pad(d.getHours()))
        .replace(/%M/g, pad(d.getMinutes()));
    }
    case 'default_errors': return 'Please adjust the highlighted fields and try again.';
    case 'format_address': {
      const a = input || {};
      const lines = [a.name, a.address1, a.address2, [a.city, a.province, a.zip].filter(Boolean).join(' '), a.country, a.phone].filter(Boolean);
      return '<p>' + lines.map(l => htmlEscape(String(l))).join('<br>') + '</p>';
    }
    case 'format_code': return String(input ?? '').replace(/(.{4})/g, '$1 ').trim();
    case 'split': return String(input ?? '').split(String(args[0] ?? ' '));
    case 'join': return (input || []).map(x => String(x ?? '')).join(String(args[0] ?? ''));
    case 'first': return Array.isArray(input) ? (input[0] ?? null) : (typeof input === 'string' ? input.charAt(0) : null);
    case 'last': return Array.isArray(input) ? (input[input.length - 1] ?? null) : null;
    case 'map': return (input || []).map(x => getProperty(x, String(args[0]), ctx));
    case 'where': return (input || []).filter(x => { const v = getProperty(x, String(args[0]), ctx); return args.length > 1 ? looseEq(v, args[1]) : truthy(v); });
    case 'uniq': return Array.from(new Set(input || []));
    case 'size': return input == null ? 0 : (Array.isArray(input) || typeof input === 'string' ? input.length : (typeof input === 'object' ? Object.keys(input).length : 0));
    case 'upcase': return String(input ?? '').toUpperCase();
    case 'downcase': return String(input ?? '').toLowerCase();
    case 'capitalize': return String(input ?? '').charAt(0).toUpperCase() + String(input ?? '').slice(1);
    case 'handle': return handleize(String(input ?? ''));
    case 'handleize': return handleize(String(input ?? ''));
    case 'strip_html': return String(input ?? '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    case 'strip_newlines': return String(input ?? '').replace(/\n/g, '');
    case 'truncatewords': {
      const words = String(input ?? '').split(/\s+/);
      const n = args[0] ?? 15;
      if (words.length <= n) return String(input ?? '');
      return words.slice(0, n).join(' ') + (args[1] || '…');
    }
    case 'truncate': {
      const s = String(input ?? '');
      const n = args[0] ?? 50;
      return s.length <= n ? s : s.slice(0, n) + (args[1] || '…');
    }
    case 'append': return String(input ?? '') + String(args[0] ?? '');
    case 'prepend': return String(args[0] ?? '') + String(input ?? '');
    case 'plus': return num(input) + num(args[0]);
    case 'minus': return num(input) - num(args[0]);
    case 'times': return num(input) * num(args[0]);
    case 'divided_by': { const d = num(args[0]); return typeof input === 'number' && String(args[0]).includes('.') ? num(input) / d : Math.floor(num(input) / (d || 1)); }
    case 'modulo': return num(input) % num(args[0]);
    case 'at_least': return Math.max(num(input), num(args[0]));
    case 'at_most': return Math.min(num(input), num(args[0]));
    case 'ceil': return Math.ceil(num(input));
    case 'floor': return Math.floor(num(input));
    case 'round': return Math.round(num(input));
    case 'abs': return Math.abs(num(input));
    case 'color_mix': {
      const [r1, g1, b1] = hexToRgb(String(input ?? '#000000'));
      const [r2, g2, b2] = hexToRgb(String(args[0] ?? '#ffffff'));
      const w = (args[1] ?? 50) / 100;
      return rgbToHex(r1 + (r2 - r1) * w, g1 + (g2 - g1) * w, b1 + (b2 - b1) * w);
    }
    case 'color_lighten': {
      const [r, g, b] = hexToRgb(String(input ?? '#000000'));
      const w = (args[0] ?? 0) / 100;
      return rgbToHex(r + (255 - r) * w, g + (255 - g) * w, b + (255 - b) * w);
    }
    case 'color_darken': {
      const [r, g, b] = hexToRgb(String(input ?? '#000000'));
      const w = (args[0] ?? 0) / 100;
      return rgbToHex(r * (1 - w), g * (1 - w), b * (1 - w));
    }
    case 'font_modify': {
      if (!input || typeof input !== 'object') return null;
      const clone = { ...input };
      if (f.named && 'weight' in {}) { /* noop */ }
      if (args.length >= 1 && f.positional.length >= 1) {
        // font_modify: 'weight', 'bold'
        const kind = args[0], val = args[1];
        if (kind === 'weight') clone.weight = val === 'bold' ? 700 : (val === 'normal' ? 400 : clone.weight);
        if (kind === 'style') clone.style = val;
      }
      return clone;
    }
    case 'newline_to_br': return String(input ?? '').replace(/\n/g, '<br>\n');
    case 'url_encode': return encodeURIComponent(String(input ?? ''));
    case 'url_escape': return encodeURIComponent(String(input ?? ''));
    default:
      if (ctx.unknownFilters && !ctx.unknownFilters.has(f.name)) {
        ctx.unknownFilters.add(f.name);
        console.warn(`[preview-shim] unknown filter: ${f.name}`);
      }
      return input;
  }
}

function num(v) { const n = Number(v); return isNaN(n) ? 0 : n; }
function htmlEscape(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function handleize(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

/* ------------------------------------------------------------------ *
 * Renderer
 * ------------------------------------------------------------------ */
function renderNodes(nodes, scope, ctx, out) {
  for (const node of nodes) {
    switch (node.type) {
      case 'text': out.push(node.value); break;
      case 'out': {
        const v = evalExpr(node.expr, scope, ctx);
        out.push(stringify(v));
        break;
      }
      case 'group': renderNodes(node.nodes, scope, ctx, out); break;
      case 'assign': scope.set(node.name, evalExpr(node.expr, scope, ctx)); break;
      case 'if': {
        for (const branch of node.branches) {
          if (branch.cond === null || evalCondition(branch.cond, scope, ctx)) { renderNodes(branch.body, scope, ctx, out); break; }
        }
        break;
      }
      case 'unless': {
        if (!evalCondition(node.cond, scope, ctx)) renderNodes(node.body, scope, ctx, out);
        else renderNodes(node.elseBody, scope, ctx, out);
        break;
      }
      case 'case': {
        const subject = evalOperand(node.subject, scope, ctx);
        let matched = false;
        for (const w of node.whens) {
          for (const v of w.values) {
            if (looseEq(subject, evalOperand(v, scope, ctx))) { renderNodes(w.body, scope, ctx, out); matched = true; break; }
          }
          if (matched) break;
        }
        if (!matched && node.elseBody) renderNodes(node.elseBody, scope, ctx, out);
        break;
      }
      case 'for': {
        let list;
        if (node.coll && node.coll.range) list = evalOperand({ kind: 'range', value: node.coll.range }, scope, ctx);
        else list = evalOperand(node.coll, scope, ctx);
        if (!Array.isArray(list)) {
          if (list && typeof list === 'object') list = Object.keys(list);
          else if (typeof list === 'number') { const arr = []; for (let x = 1; x <= list; x++) arr.push(x); list = arr; }
          else list = [];
        }
        let arr = list;
        if (node.offset !== null && node.offset !== undefined) { const o = evalOperand(node.offset, scope, ctx); if (typeof o === 'number') arr = arr.slice(o); }
        if (node.limit !== null && node.limit !== undefined) { const l = evalOperand(node.limit, scope, ctx); if (typeof l === 'number') arr = arr.slice(0, l); }
        if (arr.length === 0) { renderNodes(node.elseBody || [], scope, ctx, out); break; }
        const len = arr.length;
        const parentloop = scope.get('forloop') || null;
        for (let idx = 0; idx < len; idx++) {
          const inner = new Scope(scope);
          inner.set(node.varName, arr[idx]);
          inner.set('forloop', {
            index: idx + 1, index0: idx, rindex: len - idx, rindex0: len - idx - 1,
            first: idx === 0, last: idx === len - 1, length: len, parentloop,
          });
          renderNodes(node.body, inner, ctx, out);
        }
        break;
      }
      case 'render': {
        const firstArg = node.args[0];
        const name = evalOperand(firstArg && firstArg.value !== undefined ? firstArg.value : firstArg, scope, ctx);
        const vars = {};
        for (const pair of node.args.slice(1)) {
          if (pair.key !== undefined) vars[pair.key] = evalOperand(pair.value, scope, ctx);
        }
        ctx.renderSnippet(String(name), vars, scope, ctx, out);
        break;
      }
      case 'section': {
        const name = evalOperand(node.name, scope, ctx);
        ctx.renderSectionByName(String(name), {}, scope, ctx, out);
        break;
      }
      case 'sections': {
        const name = evalOperand(node.name, scope, ctx);
        ctx.renderSectionGroup(String(name), scope, ctx, out);
        break;
      }
      case 'form': {
        const kind = evalOperand(node.args[0].value !== undefined ? node.args[0].value : node.args[0], scope, ctx);
        const attrs = {};
        for (const pair of node.args.slice(1)) if (pair.key !== undefined) attrs[pair.key] = evalOperand(pair.value, scope, ctx);
        const action = ctx.formAction(String(kind), node.args[1] ? evalOperand(node.args[1].value, scope, ctx) : null);
        const attrStr = Object.entries(attrs)
          .filter(([k]) => k !== 'id' && k !== 'class')
          .map(([k, v]) => `${k}="${htmlEscape(String(v ?? ''))}"`).join(' ');
        out.push(`<form method="post" action="${htmlEscape(action)}"${attrs.id ? ` id="${htmlEscape(attrs.id)}"` : ''}${attrs.class ? ` class="${htmlEscape(attrs.class)}"` : ''} ${attrStr}>`);
        renderNodes(node.body, scope, ctx, out);
        out.push('</form>');
        break;
      }
      case 'paginate': {
        const coll = evalOperand(node.coll, scope, ctx);
        const by = evalOperand(node.by, scope, ctx) || 12;
        const items = Array.isArray(coll) ? coll : [];
        const pages = Math.max(1, Math.ceil(items.length / by));
        const paginate = {
          pages, current_page: 1, items: items.length,
          previous: null, next: null, parts: [{ is_link: false, title: String(1) }],
          page_size: by,
        };
        const inner = new Scope(scope);
        inner.set('paginate', paginate);
        renderNodes(node.body, inner, ctx, out);
        break;
      }
      case 'unknown-tag':
        // with/stylesheet/javascript/etc not used; ignore silently
        break;
      default: break;
    }
  }
}

function stringify(v) {
  if (v === null || v === undefined) return '';
  if (v === true) return 'true';
  if (v === false) return 'false';
  if (Array.isArray(v)) return v.map(stringify).join('');
  if (typeof v === 'object') {
    if (v.__blank) return '';
    if (v.toHTML) return v.toHTML();
    if (v.url || v.src) return v.url || v.src;
    return JSON.stringify(v);
  }
  return String(v);
}

/* parseTagArgs: 'icon', icon: 'plus'  → [{value: operand}, {key, value}] */
function parseTagArgs(body) {
  const parts = splitTopLevel(body);
  const args = [];
  for (const p of parts) {
    const kv = p.match(/^([\w-]+)\s*:\s*([\s\S]+)$/);
    if (kv && !/^['"]/.test(p)) args.push({ key: kv[1], value: parseOperand(kv[2].trim()) });
    else args.push({ value: parseOperand(p) });
  }
  return args;
}

/* ------------------------------------------------------------------ *
 * Engine facade
 * ------------------------------------------------------------------ */
const cache = new Map();
function loadFile(file) {
  if (!cache.has(file)) cache.set(file, fs.readFileSync(file, 'utf8'));
  return cache.get(file);
}

function renderTemplate(src, scope, ctx) {
  const tokens = tokenize(src);
  const nodes = parse(tokens);
  const out = [];
  renderNodes(nodes, scope, ctx, out);
  return out.join('');
}

module.exports = { tokenize, parse, renderTemplate, renderNodes, Scope, getProperty, evalOperand, truthy, isBlank, looseEq, htmlEscape, handleize, loadFile, NIL };
