/**
 * فلوسي | Flosy - Google Apps Script backend
 * Data stays in the owner's private Google Spreadsheet.
 * Deploy as: Execute as Me | Who has access: Only myself.
 */
const CONFIG = {
  spreadsheetId: '1cB5FB-fqn8GMdXRE-wRrS0Fk5jt4FQk2J18UlNU6_No',
  sheets: { transactions: 'المعاملات', settings: 'الإعدادات', plan: 'الخطة الشهرية', goals: 'الأهداف', bills: 'الفواتير المتكررة', valuations: 'تقييمات الاستثمار' },
  types: ['مصروف', 'دخل', 'طوارئ', 'استثمار', 'احتياطي', 'سحب طوارئ', 'سحب استثمار', 'سحب احتياطي'],
  maxAmount: 100000000
};
const HEADERS = {
  goals: ['id', 'title', 'target', 'initial', 'deadline', 'note', 'createdAt'],
  bills: ['id', 'title', 'amount', 'dueDay', 'category', 'active', 'note'],
  valuations: ['date', 'value', 'note']
};

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('فلوسي | لوحة إدارة أموالك')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}
function book_() { return SpreadsheetApp.openById(CONFIG.spreadsheetId); }
function amount_(v) {
  if (typeof v === 'number') return v;
  const cleaned = String(v == null ? '' : v).replace(/[,،\s]/g, '').replace(/[٠-٩]/g, c => '٠١٢٣٤٥٦٧٨٩'.indexOf(c));
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}
function validateAmount_(v, allowZero) {
  const n = Number(v);
  if (!Number.isFinite(n) || n < (allowZero ? 0 : 0.01) || n > CONFIG.maxAmount) throw Error('المبلغ غير صالح');
  return Math.round(n * 100) / 100;
}
function text_(x, max) {
  const str = String(x == null ? '' : x).trim().slice(0, max || 160);
  return /^[=+@\-]/.test(str) ? "'" + str : str;
}
function date_(v, tz) {
  if (v instanceof Date) return Utilities.formatDate(v, tz, 'yyyy-MM-dd');
  const text = String(v || '').slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : '';
}
function parsedDate_(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value))) throw Error('التاريخ غير صحيح');
  const [y, m, d] = value.split('-').map(Number), dt = new Date(y, m-1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) throw Error('التاريخ غير صحيح');
  return dt;
}
function uid_() { return Utilities.getUuid(); }
function lock_(fn) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try { return fn(); } finally { lock.releaseLock(); }
}
function sheet_(ss, key) { return ss.getSheetByName(CONFIG.sheets[key]); }
function ensureSheets_(ss) {
  const transactions = sheet_(ss, 'transactions');
  const settings = sheet_(ss, 'settings');
  if (!transactions || !settings) throw Error('لم أجد تبويب المعاملات أو الإعدادات في ملف Google Sheets');
  if (transactions.getRange('G1').getValue() !== 'id') transactions.getRange('G1').setValue('id');
  // Give existing transactions stable identifiers only once.
  const last = transactions.getLastRow();
  if (last > 1) {
    const existing = transactions.getRange(2, 7, last - 1, 1).getValues();
    if (existing.some(row => !row[0])) {
      const next = existing.map(row => [row[0] || uid_()]);
      transactions.getRange(2, 7, next.length, 1).setValues(next);
    }
  }
  ['goals', 'bills', 'valuations'].forEach(key => {
    let sh = sheet_(ss, key);
    if (!sh) { sh = ss.insertSheet(CONFIG.sheets[key]); sh.appendRow(HEADERS[key]); sh.setFrozenRows(1); }
  });
}
function getData() {
  const ss = book_();
  ensureSheets_(ss);
  const tz = ss.getSpreadsheetTimeZone();
  const settings = {};
  const s = sheet_(ss, 'settings'), n = s.getLastRow();
  if (n > 1) s.getRange(2, 1, n-1, 2).getValues().forEach(r => { if (r[0]) settings[String(r[0])] = amount_(r[1]); });
  const t = sheet_(ss, 'transactions'), last = t.getLastRow();
  const transactions = last > 1 ? t.getRange(2, 1, last-1, 7).getValues().map((r, i) => ({
    id:String(r[6] || ''), row:i+2, date:date_(r[0],tz), type:String(r[1]||''), category:String(r[2]||''),
    description:String(r[3]||''), amount:amount_(r[4]), notes:String(r[5]||'')
  })).filter(r => r.date && r.amount > 0) : [];
  const goals = rows_(sheet_(ss, 'goals'), 7).map(r => ({id:String(r[0]),title:String(r[1]),target:amount_(r[2]),initial:amount_(r[3]),deadline:date_(r[4],tz),note:String(r[5]||'')}));
  const bills = rows_(sheet_(ss, 'bills'), 7).map(r => ({id:String(r[0]),title:String(r[1]),amount:amount_(r[2]),dueDay:amount_(r[3]),category:String(r[4]||''),active:r[5] === true || String(r[5]).toLowerCase() === 'true',note:String(r[6]||'')}));
  const valuations = rows_(sheet_(ss, 'valuations'), 3).map(r => ({date:date_(r[0],tz),value:amount_(r[1]),note:String(r[2]||'')})).filter(x => x.date);
  const planSheet = sheet_(ss,'plan');
  const plan = planSheet ? rows_(planSheet, 7).slice(0, 24).map(r=>({month:String(r[0]||''),income:amount_(r[1]),expenses:amount_(r[2]),emergency:amount_(r[3]),investments:amount_(r[4]),reserve:amount_(r[5])})) : [];
  return {settings,transactions,goals,bills,valuations,plan,serverDate:Utilities.formatDate(new Date(),tz,'yyyy-MM-dd'),connected:true};
}
function rows_(sh, columns) { const n=sh.getLastRow(); return n > 1 ? sh.getRange(2,1,n-1,columns).getValues().filter(r=>r[0]!==''&&r[0]!==null):[]; }
function addTransaction(p) { return lock_(() => {
  if (!p || !CONFIG.types.includes(String(p.type))) throw Error('نوع العملية غير صالح');
  const when = parsedDate_(p.date), amount = validateAmount_(p.amount, false);
  const ss=book_(); ensureSheets_(ss); const sh=sheet_(ss,'transactions');
  sh.appendRow([when, String(p.type), text_(p.category,70), text_(p.description,180), amount, text_(p.notes,300), uid_()]);
  sh.getRange(sh.getLastRow(),1).setNumberFormat('yyyy-mm-dd');
  return getData();
}); }
function deleteTransaction(id) { return lock_(() => {
  if (!id || typeof id !== 'string') throw Error('معرّف العملية غير صحيح');
  const ss=book_(); ensureSheets_(ss); const sh=sheet_(ss,'transactions'), last=sh.getLastRow();
  if (last<2) throw Error('العملية غير موجودة');
  const ids=sh.getRange(2,7,last-1,1).getValues(); const index=ids.findIndex(r=>String(r[0])===id);
  if(index<0) throw Error('لم أجد العملية المطلوبة');
  sh.deleteRow(index+2); return getData();
}); }
function saveSettings(p) { return lock_(() => {
  if (!p || typeof p !== 'object') throw Error('الإعدادات غير صحيحة');
  const keys=['المرتب الشهري','الإيجار','الفواتير','المعيشة','الطوارئ المستهدفة','مصاريف غير منتظمة','رصيد الطوارئ الافتتاحي','رصيد الاستثمار الافتتاحي','رصيد الاحتياطي الافتتاحي'];
  const ss=book_(); ensureSheets_(ss); const sh=sheet_(ss,'settings');
  const vals=sh.getRange(2,1,Math.max(1,sh.getLastRow()-1),2).getValues();
  for (const key of keys) {
    if (!Object.prototype.hasOwnProperty.call(p,key)) continue;
    const value=validateAmount_(p[key],true), ix=vals.findIndex(r=>String(r[0])===key);
    if (ix>=0) sh.getRange(ix+2,2).setValue(value);
    else sh.appendRow([key,value,'تحديث من تطبيق فلوسي']);
  }
  return getData();
}); }
function saveGoal(p) { return lock_(() => {
  if (!p) throw Error('بيانات الهدف ناقصة');
  const title=text_(p.title,100); if(!title) throw Error('اكتب اسم الهدف');
  const target=validateAmount_(p.target), initial=validateAmount_(p.initial||0,true);
  const deadline=p.deadline?date_(p.deadline,'Africa/Cairo'):''; if(p.deadline&&!deadline) throw Error('التاريخ غير صحيح');
  const ss=book_();ensureSheets_(ss);const sh=sheet_(ss,'goals');const data=rows_(sh,7);
  const ix=data.findIndex(r=>String(r[0])===String(p.id));
  const record=[ix<0?uid_():String(p.id),title,target,initial,deadline,text_(p.note,240),new Date()];
  if(ix>=0) sh.getRange(ix+2,1,1,7).setValues([record]); else sh.appendRow(record);
  return getData();
}); }
function deleteGoal(id) { return deleteById_('goals',id); }
function saveBill(p) { return lock_(() => {
  if(!p) throw Error('بيانات الفاتورة ناقصة');
  const title=text_(p.title,100);if(!title)throw Error('اسم الفاتورة مطلوب');
  const amount=validateAmount_(p.amount),dueDay=Number(p.dueDay);
  if(!Number.isInteger(dueDay)||dueDay<1||dueDay>31)throw Error('يوم الاستحقاق يجب أن يكون بين 1 و31');
  const ss=book_();ensureSheets_(ss);const sh=sheet_(ss,'bills');const rows=rows_(sh,7);
  const ix=rows.findIndex(r=>String(r[0])===String(p.id));
  const record=[ix<0?uid_():String(p.id),title,amount,dueDay,text_(p.category,70),p.active!==false,text_(p.note,240)];
  if(ix>=0)sh.getRange(ix+2,1,1,7).setValues([record]);else sh.appendRow(record);
  return getData();
}); }
function deleteBill(id) { return deleteById_('bills',id); }
function deleteById_(key,id){return lock_(()=>{
  if (!id) throw Error('المعرف مطلوب');
  const ss=book_(); ensureSheets_(ss); const sh=sheet_(ss,key),rows=rows_(sh,7);
  const ix=rows.findIndex(r=>String(r[0])===String(id));if(ix<0)throw Error('العنصر غير موجود');
  sh.deleteRow(ix+2);return getData();
});}
function saveValuation(p){return lock_(()=>{
  if(!p)throw Error('البيانات ناقصة');
  const dt=parsedDate_(p.date),value=validateAmount_(p.value,true);
  const ss=book_();ensureSheets_(ss);const sh=sheet_(ss,'valuations');
  sh.appendRow([dt,value,text_(p.note,240)]);sh.getRange(sh.getLastRow(),1).setNumberFormat('yyyy-mm-dd');
  return getData();
});}