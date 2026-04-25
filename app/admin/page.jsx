'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import ThemeToggle from '@/components/theme-toggle';
import {
  calculateExpectedMonthlyMinutes,
  calculateWorkedHours,
  formatBusinessDate,
  formatBusinessDateTime,
  formatBusinessTime,
  getBusinessDateKey,
} from '@/lib/timekeeping';

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

async function readJson(response, fallback) {
  try {
    const data = await response.json();
    return response.ok ? data : fallback;
  } catch {
    return fallback;
  }
}

export default function AdminPage() {
  const [token, setToken] = useState(null);
  const [tab, setTab] = useState('records');
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  useEffect(() => {
    const saved = sessionStorage.getItem('admin_token');
    if (saved) setToken(saved);
  }, []);

  function handleLogin(t) { sessionStorage.setItem('admin_token', t); setToken(t); }
  function handleLogout() { sessionStorage.removeItem('admin_token'); setToken(null); }

  function handleTabChange(id) {
    setTab(id);
    setSelectedEmployee(null); // limpa detalhe ao trocar de aba
  }

  if (!token) return <LoginScreen onLogin={handleLogin} />;

  const TABS = [
    { id: 'records',     label: 'Registros',     icon: <IconList /> },
    { id: 'report',      label: 'Relatório',     icon: <IconDoc /> },
    { id: 'employees',   label: 'Colaboradores', icon: <IconUsers /> },
    { id: 'settings',   label: 'Configurações', icon: <IconGear /> },
  ];
  const activeTab = TABS.find((t) => t.id === tab);

  return (
    <div className="relative flex min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(15,118,110,0.12),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(182,137,71,0.12),_transparent_24%)]" />
      {/* ── Sidebar ── */}
      <aside className="surface-card hidden h-screen w-72 shrink-0 flex-col rounded-none border-y-0 border-l-0 lg:flex">
        <div className="soft-divider flex items-center gap-3 border-b px-6 py-6 shrink-0">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-700 via-teal-600 to-emerald-500 text-sm font-bold text-white shadow-[0_18px_40px_rgba(15,118,110,0.25)]">PP</div>
          <div>
            <p className="font-display text-lg font-semibold text-slate-900">Pet Patas</p>
            <p className="text-xs uppercase tracking-[0.26em] text-slate-400">Painel Admin</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-5">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => handleTabChange(t.id)} className={`group flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition-all ${
              tab === t.id
                ? 'bg-slate-900 text-white shadow-[0_18px_35px_rgba(15,23,42,0.18)]'
                : 'text-slate-500 hover:bg-white/80 hover:text-slate-900'
            }`}>
              <span className={tab === t.id ? 'text-amber-300' : 'text-slate-400 group-hover:text-teal-600'}>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </nav>
        <div className="soft-divider space-y-2 border-t px-4 py-4 shrink-0">
          <div className="px-1 pb-1">
            <ThemeToggle />
          </div>
          <Link href="/" className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-500 transition hover:bg-white/80 hover:text-slate-900">
            <IconBack /> Voltar ao ponto
          </Link>
          <button onClick={handleLogout} className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-400 transition hover:bg-red-50 hover:text-red-600">
            <IconLogout /> Sair
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="relative z-10 flex h-screen min-w-0 flex-1 flex-col">
        {/* Mobile header */}
        <header className="surface-card soft-divider mx-3 mt-3 flex items-center justify-between rounded-[26px] border px-4 py-3 lg:hidden shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-700 to-emerald-500 text-xs font-bold text-white">PP</div>
            <div>
              <p className="font-display text-lg leading-none text-slate-900">Pet Patas</p>
              <span className="text-[10px] uppercase tracking-[0.24em] text-slate-400">Admin</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle subtle />
            <Link href="/" className="text-xs font-semibold text-slate-400 hover:text-teal-700">Ponto</Link>
            <button onClick={handleLogout} className="text-xs text-slate-400 hover:text-red-600">Sair</button>
          </div>
        </header>

        {/* Mobile tabs */}
        <div className="mx-3 mt-3 grid grid-cols-4 gap-2 lg:hidden shrink-0">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => handleTabChange(t.id)} className={`rounded-2xl px-2 py-3 text-center text-[11px] font-bold transition ${
              tab === t.id
                ? 'bg-slate-900 text-white shadow-[0_14px_30px_rgba(15,23,42,0.16)]'
                : 'surface-card text-slate-500'
            }`}>{t.label}</button>
          ))}
        </div>

        {/* Content */}
        <main className="flex-1 overflow-y-auto px-4 pb-8 pt-4 sm:px-6 sm:pt-6 lg:px-8 lg:pt-8">
          <div className="mx-auto max-w-5xl">
            <section className="surface-card-strong mb-6 rounded-[24px] px-5 py-4 sm:px-6">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="section-kicker">Painel admin</p>
                  <h2 className="mt-2 text-2xl font-extrabold leading-tight text-slate-900 sm:text-3xl">
                    {tab === 'employees' && selectedEmployee ? selectedEmployee.name : activeTab?.label}
                  </h2>
                </div>
                <p className="text-sm font-semibold capitalize text-slate-500">
                  {formatBusinessDate(new Date(), { weekday: 'long', day: '2-digit', month: 'long' })}
                </p>
              </div>
            </section>
            {tab === 'records'   && <RecordsTab token={token} />}
            {tab === 'report'    && <ReportTab token={token} />}
            {tab === 'employees' && (
              selectedEmployee
                ? <EmployeeDetailView token={token} employee={selectedEmployee} onBack={() => setSelectedEmployee(null)} />
                : <EmployeesTab token={token} onSelectEmployee={setSelectedEmployee} />
            )}
            {tab === 'settings'  && <SettingsTab token={token} />}
          </div>
        </main>
      </div>
    </div>
  );
}

/* ═══════════ LOGIN ═══════════ */

function LoginScreen({ onLogin }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) { setError((await res.json()).error || 'Senha incorreta'); return; }
      onLogin((await res.json()).token);
    } catch { setError('Erro de conexão.'); }
    finally { setLoading(false); }
  }

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* Lateral decorativa */}
      <div className="relative hidden overflow-hidden lg:flex lg:w-[54%] items-center justify-center bg-[linear-gradient(145deg,#0f766e_0%,#0f4c5c_48%,#102a43_100%)] p-12">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.12),_transparent_26%),radial-gradient(circle_at_bottom_left,_rgba(182,137,71,0.28),_transparent_28%)]" />
        <div className="relative z-10 max-w-xl text-white">
          <p className="section-kicker !text-white/65">Pet Patas</p>
          <h2 className="font-display mt-5 text-6xl leading-[1.02]">
            Ponto Digital
          </h2>
          <p className="mt-5 max-w-lg text-lg leading-8 text-white/78">
            Painel administrativo para registros, colaboradores, relatórios e configurações da loja.
          </p>
        </div>
      </div>

      {/* Formulário */}
      <div className="flex flex-1 items-center justify-center px-6 py-10">
        <form onSubmit={handleSubmit} className="surface-card-strong w-full max-w-md rounded-[32px] p-7 sm:p-9 space-y-6">
          <div className="flex justify-end">
            <ThemeToggle />
          </div>
          <div className="lg:hidden text-center mb-2">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-[22px] bg-gradient-to-br from-teal-700 to-emerald-500 text-xl font-bold text-white shadow-[0_18px_40px_rgba(15,118,110,0.22)]">
              PP
            </div>
          </div>
          <div>
            <p className="section-kicker">Acesso restrito</p>
            <h1 className="font-display mt-3 text-4xl leading-tight text-slate-900">Painel administrativo</h1>
            <p className="mt-3 text-sm leading-6 text-slate-500">Digite a senha do administrador para abrir o centro de controle da loja.</p>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Senha</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus placeholder="••••••••"
              className="input-style" />
          </div>
          {error && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600 ring-1 ring-red-100">{error}</p>}
          <button type="submit" disabled={loading} className="w-full rounded-2xl bg-[linear-gradient(135deg,#0f766e_0%,#0f4c5c_100%)] py-3.5 text-sm font-bold text-white shadow-[0_24px_40px_rgba(15,118,110,0.22)] transition hover:shadow-[0_28px_50px_rgba(15,118,110,0.28)] disabled:opacity-50">
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
          <Link href="/" className="block text-center text-sm font-semibold text-slate-400 hover:text-teal-700 transition">← Voltar ao ponto</Link>
        </form>
      </div>
    </div>
  );
}

function formatMinutes(totalMinutes) {
  const sign = totalMinutes < 0 ? '-' : '';
  const abs = Math.abs(Math.round(totalMinutes));
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `${sign}${h}h${String(m).padStart(2, '0')}`;
}

const MONTH_NAMES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

function getCurrentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function normalizeMonthKey(monthKey) {
  return /^\d{4}-\d{2}$/.test(monthKey || '') ? monthKey : getCurrentMonthKey();
}

function getMonthLabel(monthKey) {
  const safeMonth = normalizeMonthKey(monthKey);
  const [year, month] = safeMonth.split('-').map(Number);
  return `${MONTH_NAMES[month - 1]} de ${year}`;
}

function formatCpf(cpf) {
  const digits = String(cpf || '').replace(/\D/g, '');
  if (digits.length !== 11) return cpf || 'Não informado';
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

function formatDateOnly(date) {
  if (!date) return 'Não informado';
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}/.test(date)) {
    const [year, month, day] = date.slice(0, 10).split('-');
    return `${day}/${month}/${year}`;
  }
  return formatBusinessDate(date, { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function nullableText(value) {
  return value ? String(value) : 'Não informado';
}

async function loadPdfLibraries() {
  const [{ jsPDF }, autoTableModule] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);

  return {
    jsPDF,
    autoTable: autoTableModule.default || autoTableModule.autoTable,
  };
}

function getEmployeeInfo(name, records = []) {
  const first = records.find((r) => r.employee_name === name) || {};
  return {
    name,
    cpf: first.employee_cpf || '',
    role: first.employee_role || '',
    admissionDate: first.employee_admission_date || '',
  };
}

/* ═══════════ TAB: REGISTROS (painel do dia) ═══════════ */

function RecordsTab({ token }) {
  const [employees, setEmployees] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const todayKey = getBusinessDateKey();
      const [empsRes, recsRes] = await Promise.all([
        fetch('/api/employees'),
        fetch(`/api/records?date=${todayKey}`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const [emps, recs] = await Promise.all([
        readJson(empsRes, []),
        readJson(recsRes, []),
      ]);
      setEmployees(safeArray(emps));
      // records vêm desc; invertemos para timeline crescente
      setRecords([...safeArray(recs)].reverse());
      setLastUpdated(new Date());
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [token]);

  // Carrega ao montar e atualiza a cada 30s
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Último registro de cada funcionário hoje
  const lastByEmployee = useMemo(() => {
    const map = {};
    records.forEach((r) => { map[r.employee_id] = r; }); // records já estão em ordem crescente → último ganha
    return map;
  }, [records]);

  const presentes = employees.filter((e) => lastByEmployee[e.id]?.type === 'entrada');
  const ausentes  = employees.filter((e) => !lastByEmployee[e.id] || lastByEmployee[e.id].type === 'saida');

  const todayLabel = formatBusinessDate(new Date(), {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-emerald-500" />
    </div>
  );

  return (
    <div className="space-y-6">

      {/* ── Cabeçalho do dia ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-medium text-slate-500 capitalize">{todayLabel}</p>
        <button
          onClick={fetchData}
          className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-500 shadow-sm transition hover:bg-slate-50 hover:text-slate-700"
        >
          <IconRefresh /> Atualizar
          {lastUpdated && (
            <span className="ml-1 text-slate-300">
              · {formatBusinessTime(lastUpdated)}
            </span>
          )}
        </button>
      </div>

      {/* ── Cards de resumo ── */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl bg-emerald-50 p-4 text-center ring-1 ring-emerald-100">
          <p className="text-2xl font-extrabold text-emerald-700">{presentes.length}</p>
          <p className="mt-0.5 text-xs font-semibold text-emerald-600">Presentes</p>
        </div>
        <div className="rounded-2xl bg-slate-100 p-4 text-center ring-1 ring-slate-200">
          <p className="text-2xl font-extrabold text-slate-600">{ausentes.length}</p>
          <p className="mt-0.5 text-xs font-semibold text-slate-500">Ausentes</p>
        </div>
        <div className="rounded-2xl bg-white p-4 text-center ring-1 ring-black/[0.04]">
          <p className="text-2xl font-extrabold text-slate-700">{records.length}</p>
          <p className="mt-0.5 text-xs font-semibold text-slate-400">Batidas hoje</p>
        </div>
      </div>

      {/* ── Status de cada funcionário ── */}
      {employees.length > 0 && (
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/[0.04]">
          <div className="border-b border-slate-100 bg-slate-50/50 px-5 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Situação dos colaboradores</p>
          </div>
          <ul className="divide-y divide-slate-50">
            {employees.map((emp) => {
              const last = lastByEmployee[emp.id];
              const presente = last?.type === 'entrada';
              return (
                <li key={emp.id} className="flex items-center justify-between px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-xs font-bold text-white">
                      {initials(emp.name)}
                    </div>
                    <span className="font-semibold text-slate-700">{emp.name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-right">
                    {last && (
                      <span className="text-xs text-slate-400">
                        {formatBusinessTime(last.timestamp)}
                      </span>
                    )}
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
                      presente
                        ? 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-500/20'
                        : 'bg-slate-100 text-slate-500 ring-1 ring-inset ring-slate-200'
                    }`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${presente ? 'bg-emerald-400 animate-pulse' : 'bg-slate-300'}`} />
                      {presente ? 'Presente' : 'Ausente'}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* ── Timeline de hoje ── */}
      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
          Atividade de hoje
        </p>
        {records.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white p-12 text-center">
            <p className="text-4xl mb-2">☀️</p>
            <p className="font-medium text-slate-400">Nenhuma batida ainda hoje</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/[0.04]">
            <ul className="divide-y divide-slate-50">
              {[...records].reverse().map((r) => (
                <li key={r.id} className="flex items-center gap-4 px-5 py-3 transition-colors hover:bg-slate-50/50">
                  {/* Horário */}
                  <span className="w-12 shrink-0 text-sm font-bold tabular-nums text-slate-700">
                    {formatBusinessTime(r.timestamp)}
                  </span>
                  {/* Indicador */}
                  <span className={`h-2 w-2 shrink-0 rounded-full ${r.type === 'entrada' ? 'bg-emerald-400' : 'bg-red-400'}`} />
                  {/* Nome */}
                  <span className="flex-1 text-sm font-medium text-slate-600">{r.employee_name}</span>
                  {/* Badge */}
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${
                    r.type === 'entrada'
                      ? 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-500/20'
                      : 'bg-red-50 text-red-600 ring-1 ring-inset ring-red-500/20'
                  }`}>
                    {r.type === 'entrada' ? 'Entrada' : 'Saída'}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Agrupa registros por dia e retorna uma linha por dia para o PDF.
 * Formato: [ data, entradas, saídas, duração, observações ]
 */
function buildDayTable(records) {
  const sorted = [...records].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  const byDay = {};
  for (const r of sorted) {
    const d = new Date(r.timestamp);
    const key = formatBusinessDate(d, { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' });
    if (!byDay[key]) byDay[key] = { entradas: [], saidas: [] };
    const time = formatBusinessTime(d);
    if (r.type === 'entrada') byDay[key].entradas.push(time);
    else byDay[key].saidas.push(time);
  }

  return Object.entries(byDay).map(([day, { entradas, saidas }]) => {
    const dayRecords = sorted.filter((r) => {
      const d = new Date(r.timestamp);
      return formatBusinessDate(d, { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' }) === day;
    });
    const { totalMinutes, openEntry, pairs } = calculateWorkedHours(dayRecords);
    const observations = [];
    if (openEntry) observations.push('Entrada sem saída');
    if (entradas.length !== saidas.length) observations.push('Marcações ímpares');
    if (pairs.length === 0 && dayRecords.length > 0) observations.push('Sem par válido');

    return [
      day,
      entradas.join(' / ') || '—',
      saidas.join(' / ') || '—',
      totalMinutes > 0 ? formatMinutes(totalMinutes) : '—',
      observations.join('; ') || '—',
    ];
  });
}

/* ═══════════ TAB: RELATÓRIO ═══════════ */

function ReportTab({ token }) {
  const [employees, setEmployees] = useState([]);
  const [pdfEmp, setPdfEmp] = useState('');
  const [pdfMonth, setPdfMonth] = useState(getCurrentMonthKey);
  const [generating, setGenerating] = useState(false);
  const [storeName, setStoreName] = useState('Pet Patas');
  const [weeklyHours, setWeeklyHours] = useState(44);
  const [employerDocument, setEmployerDocument] = useState('');
  const [employerRegistration, setEmployerRegistration] = useState('');
  const [contractualSchedule, setContractualSchedule] = useState('');

  useEffect(() => {
    fetch('/api/employees?include_inactive=true', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => readJson(r, []))
      .then((data) => setEmployees(safeArray(data).filter((e) => e.active)));
    fetch('/api/settings', { headers: { Authorization: `Bearer ${token}` } }).then((r) => readJson(r, {})).then((s) => {
      setStoreName(s.store_name || 'Pet Patas');
      setWeeklyHours(s.weekly_hours || 44);
      setEmployerDocument(s.employer_document || '');
      setEmployerRegistration(s.employer_registration || '');
      setContractualSchedule(s.contractual_schedule || '');
    });
  }, [token]);

  function drawReportHeader(doc, monthKey) {
    const pageWidth = doc.internal.pageSize.getWidth();
    const safeMonth = normalizeMonthKey(monthKey);
    const [year, month] = safeMonth.split('-').map(Number);
    const lastDay = new Date(year, month, 0).toLocaleDateString('pt-BR');

    doc.setFillColor(15, 76, 92);
    doc.rect(0, 0, pageWidth, 36, 'F');
    doc.setTextColor(255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('Espelho de Ponto Eletrônico', 14, 16);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`${getMonthLabel(safeMonth)} · Emitido em ${formatBusinessDateTime(new Date(), { second: '2-digit' })}`, 14, 25);

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Empregador', 14, 47);
    doc.setFont('helvetica', 'normal');
    doc.text(`Nome/Razão social: ${storeName}`, 14, 54);
    doc.text(`CNPJ/CPF: ${nullableText(employerDocument)}`, 14, 60);
    doc.text(`CEI/CAEPF/CNO: ${nullableText(employerRegistration)}`, 110, 60);
    doc.text(`Período: 01/${safeMonth.slice(5)}/${safeMonth.slice(0, 4)} a ${lastDay}`, 14, 66);
    doc.text(`Jornada contratual: ${contractualSchedule || `${weeklyHours}h semanais`}`, 110, 66);
    doc.setDrawColor(220);
    doc.line(14, 72, pageWidth - 14, 72);
  }

  function drawEmployeeBlock(doc, y, employeeInfo, summary) {
    const balance = summary.totalMinutes - summary.expectedMinutes;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 118, 110);
    doc.text(employeeInfo.name, 14, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(80);
    doc.text(`CPF: ${formatCpf(employeeInfo.cpf)}`, 14, y + 7);
    doc.text(`Admissão: ${formatDateOnly(employeeInfo.admissionDate)}`, 70, y + 7);
    doc.text(`Cargo/Função: ${nullableText(employeeInfo.role)}`, 126, y + 7);

    doc.setFillColor(248, 250, 252);
    doc.roundedRect(14, y + 12, 182, 15, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30);
    doc.text(`Trabalhadas: ${formatMinutes(summary.totalMinutes)}`, 18, y + 22);
    doc.text(`Esperadas: ${formatMinutes(summary.expectedMinutes)}`, 76, y + 22);
    doc.setTextColor(balance >= 0 ? 15 : 185, balance >= 0 ? 118 : 28, balance >= 0 ? 110 : 28);
    doc.text(`Saldo: ${balance >= 0 ? '+' : ''}${formatMinutes(balance)}`, 136, y + 22);
    doc.setTextColor(80);

    return y + 34;
  }

  function drawPdfFooter(doc, filenameContext) {
    const pages = doc.internal.getNumberOfPages();
    const pageHeight = doc.internal.pageSize.getHeight();
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(130);
      doc.text(`${storeName} · ${filenameContext}`, 14, pageHeight - 8);
      doc.text(`Página ${i}/${pages}`, doc.internal.pageSize.getWidth() - 14, pageHeight - 8, { align: 'right' });
    }
  }

  async function handleGeneratePDF() {
    const safeMonth = normalizeMonthKey(pdfMonth);
    if (safeMonth !== pdfMonth) setPdfMonth(safeMonth);

    setGenerating(true);
    try {
      const p = new URLSearchParams({ month: safeMonth });
      if (pdfEmp) p.set('employee_id', pdfEmp);
      const records = safeArray(await readJson(
        await fetch(`/api/records?${p}`, { headers: { Authorization: `Bearer ${token}` } }),
        [],
      ));
      if (!records.length) { alert('Nenhum registro no período.'); return; }

      const { jsPDF, autoTable } = await loadPdfLibraries();
      const doc = new jsPDF();
      const expectedMinutes = calculateExpectedMonthlyMinutes(safeMonth, weeklyHours);

      drawReportHeader(doc, safeMonth);

      const byEmp = {};
      records.forEach((r) => { (byEmp[r.employee_name] = byEmp[r.employee_name] || []).push(r); });
      let y = 82;
      const summaryData = [];

      Object.entries(byEmp).forEach(([name, recs]) => {
        if (y > 218) {
          doc.addPage();
          drawReportHeader(doc, safeMonth);
          y = 82;
        }

        const { totalMinutes } = calculateWorkedHours(recs);
        const employeeInfo = getEmployeeInfo(name, recs);
        summaryData.push({
          ...employeeInfo,
          totalMinutes,
          expectedMinutes,
          balance: totalMinutes - expectedMinutes,
        });
        y = drawEmployeeBlock(doc, y, employeeInfo, { totalMinutes, expectedMinutes });

        autoTable(doc, {
          startY: y,
          head: [['Data', 'Entradas', 'Saídas', 'Duração', 'Observações']],
          body: buildDayTable(recs),
          theme: 'grid',
          headStyles: { fillColor: [15, 76, 92], textColor: 255, fontSize: 8.5, fontStyle: 'bold' },
          bodyStyles: { fontSize: 8.5, textColor: [55, 65, 81], cellPadding: 2.4 },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          columnStyles: {
            0: { cellWidth: 39 },
            1: { cellWidth: 38 },
            2: { cellWidth: 38 },
            3: { cellWidth: 24, halign: 'center', fontStyle: 'bold' },
            4: { cellWidth: 43 },
          },
          margin: { left: 14, right: 14 },
        });
        y = doc.lastAutoTable.finalY + 12;
      });

      if (Object.keys(byEmp).length > 1) {
        if (y > 210) {
          doc.addPage();
          drawReportHeader(doc, safeMonth);
          y = 82;
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(15, 118, 110);
        doc.text('Resumo geral do período', 14, y);
        y += 6;

        autoTable(doc, {
          startY: y,
          head: [['Funcionário', 'CPF', 'Cargo/Função', 'Trabalhadas', 'Esperadas', 'Saldo']],
          body: summaryData.map((s) => [
            s.name,
            formatCpf(s.cpf),
            nullableText(s.role),
            formatMinutes(s.totalMinutes),
            formatMinutes(s.expectedMinutes),
            `${s.balance >= 0 ? '+' : ''}${formatMinutes(s.balance)}`,
          ]),
          theme: 'grid',
          headStyles: { fillColor: [15, 76, 92], textColor: 255, fontSize: 8.5 },
          bodyStyles: { fontSize: 8.5 },
          columnStyles: {
            3: { halign: 'center' },
            4: { halign: 'center' },
            5: { halign: 'center', fontStyle: 'bold' },
          },
          margin: { left: 14, right: 14 },
        });
        y = doc.lastAutoTable.finalY + 14;
      }

      if (y > 235) {
        doc.addPage();
        drawReportHeader(doc, safeMonth);
        y = 86;
      }

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(110);
      doc.text(
        'Documento gerado para conferência mensal das marcações de ponto. Campos não cadastrados aparecem como "Não informado".',
        14,
        y,
        { maxWidth: 182 },
      );

      const sigY = y + 12;
      doc.setDrawColor(150);
      doc.setLineWidth(0.3);
      doc.line(24, sigY + 16, 90, sigY + 16);
      doc.line(120, sigY + 16, 186, sigY + 16);
      doc.setFontSize(9); doc.setTextColor(100);
      doc.text('Assinatura do trabalhador', 57, sigY + 22, { align: 'center' });
      doc.text('Responsável da empresa', 153, sigY + 22, { align: 'center' });

      drawPdfFooter(doc, `Espelho de ponto ${getMonthLabel(safeMonth)}`);
      doc.save(`espelho_ponto_${safeMonth}${pdfEmp ? `_funcionario_${pdfEmp}` : ''}.pdf`);
    } catch (err) {
      console.error(err);
      alert(`Erro ao gerar PDF: ${err.message || 'verifique os dados do relatório.'}`);
    } finally {
      setGenerating(false);
    }
  }

  async function handleExportJSON() {
    const safeMonth = normalizeMonthKey(pdfMonth);
    const p = new URLSearchParams({ month: safeMonth });
    if (pdfEmp) p.set('employee_id', pdfEmp);

    const records = safeArray(await readJson(
      await fetch(`/api/records?${p.toString()}`, { headers: { Authorization: `Bearer ${token}` } }),
      [],
    ));
    const todayKey = getBusinessDateKey();
    const blob = new Blob([JSON.stringify({ storeName, exportDate: todayKey, month: safeMonth, employee_id: pdfEmp || null, records }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `backup_ponto_${todayKey}.json`;
    a.click();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
      <Card title="Espelho de Ponto" icon={<IconDoc />}>
        <div className="space-y-5">
          <div className="rounded-[26px] bg-slate-900 p-5 text-white shadow-[0_22px_50px_rgba(15,23,42,0.16)]">
            <p className="text-xs font-bold uppercase tracking-[0.26em] text-teal-200">Relatório mensal</p>
            <h3 className="mt-3 text-2xl font-black">PDF para conferência e assinatura</h3>
            <p className="mt-2 text-sm leading-6 text-white/60">
              Inclui identificação do empregador e trabalhador, período, jornada contratual, marcações, duração diária, saldo e campos de assinatura.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Funcionário">
              <select value={pdfEmp} onChange={(e) => setPdfEmp(e.target.value)} className="input-style">
                <option value="">Todos os colaboradores</option>
                {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </Field>
            <Field label="Mês">
              <input type="month" value={pdfMonth} onChange={(e) => setPdfMonth(e.target.value)} className="input-style" />
            </Field>
          </div>

          <button onClick={handleGeneratePDF} disabled={generating}
            className="w-full rounded-[22px] bg-[linear-gradient(135deg,#0f766e_0%,#0f4c5c_100%)] py-4 text-sm font-extrabold text-white shadow-[0_22px_40px_rgba(15,118,110,0.22)] transition hover:-translate-y-0.5 hover:shadow-xl disabled:opacity-50">
            {generating ? 'Gerando relatório...' : 'Gerar espelho de ponto em PDF'}
          </button>
        </div>
      </Card>

      <Card title="Dados do Relatório" icon={<IconSave />}>
        <div className="space-y-4">
          <div className="rounded-2xl bg-amber-50 p-4 text-sm leading-6 text-amber-800 ring-1 ring-amber-100">
            Para ficar completo, cadastre em Configurações o CNPJ/CPF, CEI/CAEPF/CNO quando houver, jornada contratual e os dados do colaborador.
          </div>
          <div className="grid gap-3 text-sm">
            <div className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 px-4 py-3">
              <span className="font-semibold text-slate-500">Loja</span>
              <span className="text-right font-bold text-slate-800">{storeName}</span>
            </div>
            <div className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 px-4 py-3">
              <span className="font-semibold text-slate-500">CNPJ/CPF</span>
              <span className="text-right font-bold text-slate-800">{nullableText(employerDocument)}</span>
            </div>
            <div className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 px-4 py-3">
              <span className="font-semibold text-slate-500">Jornada</span>
              <span className="text-right font-bold text-slate-800">{contractualSchedule || `${weeklyHours}h/semana`}</span>
            </div>
          </div>
          <button onClick={handleExportJSON} className="w-full rounded-[20px] bg-slate-100 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-200">
            Exportar backup JSON
          </button>
        </div>
      </Card>
    </div>
  );
}

/* ═══════════ TAB: SETTINGS ═══════════ */

function SettingsTab({ token }) {
  const [employees, setEmployees] = useState([]);
  const [newEmpName, setNewEmpName] = useState('');
  const [newEmpPin, setNewEmpPin] = useState('');
  const [newEmpCpf, setNewEmpCpf] = useState('');
  const [newEmpRole, setNewEmpRole] = useState('');
  const [newEmpAdmissionDate, setNewEmpAdmissionDate] = useState('');
  const [storeName, setStoreName] = useState('');
  const [employerDocument, setEmployerDocument] = useState('');
  const [employerRegistration, setEmployerRegistration] = useState('');
  const [contractualSchedule, setContractualSchedule] = useState('');
  const [storeMsg, setStoreMsg] = useState('');
  const [weeklyHours, setWeeklyHours] = useState(44);
  const [hoursMsg, setHoursMsg] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [passMsg, setPassMsg] = useState({ type: '', text: '' });

  const authFetch = useCallback((url, opts = {}) =>
    fetch(url, { ...opts, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...opts.headers } }), [token]);

  const loadEmployees = useCallback(() => {
    authFetch('/api/employees?include_inactive=true')
      .then((r) => readJson(r, []))
      .then((data) => setEmployees(safeArray(data)));
  }, [authFetch]);

  useEffect(() => {
    loadEmployees();
    fetch('/api/settings', { headers: { Authorization: `Bearer ${token}` } }).then((r) => readJson(r, {})).then((s) => {
      setStoreName(s.store_name || 'Pet Patas');
      setWeeklyHours(s.weekly_hours || 44);
      setEmployerDocument(s.employer_document || '');
      setEmployerRegistration(s.employer_registration || '');
      setContractualSchedule(s.contractual_schedule || '');
    });
  }, [loadEmployees]);

  async function handleAddEmployee(e) {
    e.preventDefault();
    if (!newEmpName.trim()) return;
    if (!newEmpPin || newEmpPin.length < 4 || newEmpPin.length > 8) {
      alert('PIN deve ter entre 4 e 8 dígitos.');
      return;
    }
    const res = await authFetch('/api/employees', {
      method: 'POST',
      body: JSON.stringify({
        name: newEmpName.trim(),
        pin: newEmpPin,
        cpf: newEmpCpf,
        role: newEmpRole,
        admission_date: newEmpAdmissionDate || null,
      }),
    });
    if (!res.ok) { alert((await res.json()).error); return; }
    setNewEmpName('');
    setNewEmpPin('');
    setNewEmpCpf('');
    setNewEmpRole('');
    setNewEmpAdmissionDate('');
    loadEmployees();
  }

  const [pinModal, setPinModal] = useState({ open: false, employee: null, pin: '', loading: false, error: '', success: false });
  const [editModal, setEditModal] = useState({ open: false, employee: null, name: '', cpf: '', role: '', admission_date: '', loading: false, error: '' });

  function openPinModal(emp) {
    setPinModal({ open: true, employee: emp, pin: '', loading: false, error: '', success: false });
  }

  function closePinModal() {
    setPinModal({ open: false, employee: null, pin: '', loading: false, error: '', success: false });
  }

  function openEditModal(emp) {
    setEditModal({
      open: true,
      employee: emp,
      name: emp.name || '',
      cpf: emp.cpf || '',
      role: emp.role || '',
      admission_date: emp.admission_date ? String(emp.admission_date).slice(0, 10) : '',
      loading: false,
      error: '',
    });
  }

  function closeEditModal() {
    setEditModal({ open: false, employee: null, name: '', cpf: '', role: '', admission_date: '', loading: false, error: '' });
  }

  async function handleUpdateEmployeeDetails() {
    if (!editModal.name.trim()) {
      setEditModal((prev) => ({ ...prev, error: 'Nome é obrigatório.' }));
      return;
    }

    setEditModal((prev) => ({ ...prev, loading: true, error: '' }));
    const res = await authFetch(`/api/employees/${editModal.employee.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        name: editModal.name.trim(),
        cpf: editModal.cpf,
        role: editModal.role,
        admission_date: editModal.admission_date || null,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setEditModal((prev) => ({ ...prev, loading: false, error: data.error || 'Erro ao salvar dados.' }));
      return;
    }
    closeEditModal();
    loadEmployees();
  }

  async function handleUpdatePin() {
    const { pin, employee } = pinModal;
    if (!pin || pin.length < 4 || pin.length > 8) {
      setPinModal((prev) => ({ ...prev, error: 'PIN deve ter entre 4 e 8 dígitos.' }));
      return;
    }
    setPinModal((prev) => ({ ...prev, loading: true, error: '' }));
    const res = await authFetch(`/api/employees/${employee.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ pin }),
    });
    if (!res.ok) {
      const data = await res.json();
      setPinModal((prev) => ({ ...prev, loading: false, error: data.error || 'Erro ao atualizar PIN.' }));
      return;
    }
    setPinModal((prev) => ({ ...prev, loading: false, success: true }));
    loadEmployees();
    setTimeout(closePinModal, 1500);
  }

  async function handleRemoveEmployee(id) {
    if (!confirm('Remover este funcionário?')) return;
    await authFetch(`/api/employees/${id}`, { method: 'DELETE' });
    loadEmployees();
  }

  async function handleReactivateEmployee(id) {
    await authFetch(`/api/employees/${id}`, { method: 'PATCH', body: JSON.stringify({ reactivate: true }) });
    loadEmployees();
  }

  const [deleteModal, setDeleteModal] = useState({ open: false, employee: null, password: '', loading: false, error: '' });

  function openDeleteModal(emp) {
    setDeleteModal({ open: true, employee: emp, password: '', loading: false, error: '' });
  }

  function closeDeleteModal() {
    setDeleteModal({ open: false, employee: null, password: '', loading: false, error: '' });
  }

  async function handlePermanentDelete() {
    if (!deleteModal.password) {
      setDeleteModal((prev) => ({ ...prev, error: 'Digite sua senha para confirmar.' }));
      return;
    }
    setDeleteModal((prev) => ({ ...prev, loading: true, error: '' }));
    const res = await authFetch(`/api/employees/${deleteModal.employee.id}`, {
      method: 'DELETE',
      body: JSON.stringify({ permanent: true, password: deleteModal.password }),
    });
    const data = await res.json();
    if (!res.ok) {
      setDeleteModal((prev) => ({ ...prev, loading: false, error: data.error || 'Erro ao deletar.' }));
      return;
    }
    closeDeleteModal();
    loadEmployees();
  }

  async function handleSaveStoreName() {
    await authFetch('/api/settings', {
      method: 'PUT',
      body: JSON.stringify({
        store_name: storeName,
        employer_document: employerDocument,
        employer_registration: employerRegistration,
        contractual_schedule: contractualSchedule,
      }),
    });
    setStoreMsg('Salvo!');
    setTimeout(() => setStoreMsg(''), 2000);
  }

  async function handleSaveWeeklyHours() {
    const h = parseFloat(weeklyHours);
    if (isNaN(h) || h < 1 || h > 80) { setHoursMsg('Valor inválido (1-80h)'); setTimeout(() => setHoursMsg(''), 3000); return; }
    await authFetch('/api/settings', { method: 'PUT', body: JSON.stringify({ weekly_hours: h }) });
    setHoursMsg('Salvo!');
    setTimeout(() => setHoursMsg(''), 2000);
  }

  async function handleChangePassword() {
    if (newPass.length < 8) { setPassMsg({ type: 'error', text: 'Mínimo 8 caracteres.' }); return; }
    if (newPass !== confirmPass) { setPassMsg({ type: 'error', text: 'As senhas não coincidem.' }); return; }
    await authFetch('/api/settings', { method: 'PUT', body: JSON.stringify({ new_password: newPass }) });
    setNewPass(''); setConfirmPass('');
    setPassMsg({ type: 'success', text: 'Senha alterada!' });
    setTimeout(() => setPassMsg({ type: '', text: '' }), 3000);
  }

  const [clearModal, setClearModal] = useState({ open: false, password: '', loading: false, error: '' });

  async function handleClearRecords() {
    if (!clearModal.password) {
      setClearModal((prev) => ({ ...prev, error: 'Digite sua senha para confirmar.' }));
      return;
    }
    setClearModal((prev) => ({ ...prev, loading: true, error: '' }));
    const res = await authFetch('/api/records/clear', {
      method: 'DELETE',
      body: JSON.stringify({ password: clearModal.password }),
    });
    const data = await res.json();
    if (!res.ok) {
      setClearModal((prev) => ({ ...prev, loading: false, error: data.error || 'Erro ao apagar.' }));
      return;
    }
    setClearModal({ open: false, password: '', loading: false, error: '' });
    alert(`${data.deleted} registro(s) apagado(s). Funcionários mantidos.`);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Funcionários */}
      <Card title="Funcionários" icon={<IconUsers />} className="lg:col-span-2">
        {/* Ativos */}
        {employees.filter((e) => e.active).length === 0 ? (
          <p className="text-sm text-slate-400 py-2">Nenhum funcionário ativo.</p>
        ) : (
          <div className="mb-4 divide-y divide-slate-100 rounded-xl border border-slate-100 bg-slate-50/50">
            {employees.filter((e) => e.active).map((emp) => (
	              <div key={emp.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
	                <div className="flex items-center gap-3">
	                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-xs font-bold text-white">{initials(emp.name)}</div>
	                  <div>
	                    <span className="text-sm font-medium text-slate-700">{emp.name}</span>
	                    <span className={`ml-2 text-xs font-medium ${emp.hasPin ? 'text-emerald-500' : 'text-amber-500'}`}>
	                      {emp.hasPin ? 'PIN ativo' : 'Sem PIN'}
	                    </span>
	                    <p className="mt-0.5 text-xs text-slate-400">
	                      {emp.role || 'Cargo não informado'} · CPF {formatCpf(emp.cpf)}
	                    </p>
	                  </div>
	                </div>
	                <div className="flex flex-wrap gap-2">
	                  <button onClick={() => openEditModal(emp)} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50">
	                    Editar dados
	                  </button>
	                  <button onClick={() => openPinModal(emp)} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-blue-600 transition hover:bg-blue-50">
	                    {emp.hasPin ? 'Alterar PIN' : 'Definir PIN'}
	                  </button>
                  <button onClick={() => handleRemoveEmployee(emp.id)} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-red-500 transition hover:bg-red-50">Remover</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal de exclusão permanente */}
        {deleteModal.open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100">
                  <IconTrash />
                </div>
                <div>
                  <p className="font-bold text-slate-800">Exclusão permanente</p>
                  <p className="text-xs text-slate-400">{deleteModal.employee?.name}</p>
                </div>
              </div>
              <div className="mb-4 rounded-xl bg-red-50 p-3 text-xs text-red-700 ring-1 ring-inset ring-red-200">
                ⚠️ Esta ação é <strong>irreversível</strong>. Todos os registros de ponto deste funcionário serão apagados para sempre.
              </div>
              <div className="mb-4">
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1.5">Confirme sua senha de admin</label>
                <input
                  type="password"
                  value={deleteModal.password}
                  onChange={(e) => setDeleteModal((prev) => ({ ...prev, password: e.target.value }))}
                  onKeyDown={(e) => e.key === 'Enter' && handlePermanentDelete()}
                  placeholder="••••••••"
                  autoFocus
                  className="input-style"
                />
                {deleteModal.error && <p className="mt-2 text-xs font-semibold text-red-600">{deleteModal.error}</p>}
              </div>
              <div className="flex gap-2">
                <button onClick={closeDeleteModal} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50">
                  Cancelar
                </button>
                <button onClick={handlePermanentDelete} disabled={deleteModal.loading} className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-bold text-white transition hover:bg-red-700 disabled:opacity-50">
                  {deleteModal.loading ? 'Deletando...' : 'Deletar tudo'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de alterar PIN */}
        {pinModal.open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100">
                  <IconKey />
                </div>
                <div>
                  <p className="font-bold text-slate-800">{pinModal.employee?.hasPin ? 'Alterar PIN' : 'Definir PIN'}</p>
                  <p className="text-xs text-slate-400">{pinModal.employee?.name}</p>
                </div>
              </div>
              {pinModal.success ? (
                <div className="rounded-xl bg-emerald-50 p-4 text-center text-sm font-semibold text-emerald-700">
                  PIN atualizado com sucesso!
                </div>
              ) : (
                <>
                  <div className="mb-4">
                    <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1.5">Novo PIN (4-8 dígitos)</label>
                    <input
                      type="password"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={8}
                      value={pinModal.pin}
                      onChange={(e) => setPinModal((prev) => ({ ...prev, pin: e.target.value.replace(/\D/g, ''), error: '' }))}
                      onKeyDown={(e) => e.key === 'Enter' && handleUpdatePin()}
                      placeholder="••••"
                      autoFocus
                      className="input-style text-center tracking-[0.3em]"
                    />
                    {pinModal.error && <p className="mt-2 text-xs font-semibold text-red-600">{pinModal.error}</p>}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={closePinModal} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50">
                      Cancelar
                    </button>
                    <button onClick={handleUpdatePin} disabled={pinModal.loading} className="flex-1 rounded-xl bg-blue-600 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700 disabled:opacity-50">
                      {pinModal.loading ? 'Salvando...' : 'Salvar PIN'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {editModal.open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                  <IconUsers />
                </div>
                <div>
                  <p className="font-bold text-slate-800">Dados do colaborador</p>
                  <p className="text-xs text-slate-400">Usados no espelho de ponto</p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Nome">
                  <input
                    type="text"
                    value={editModal.name}
                    onChange={(e) => setEditModal((prev) => ({ ...prev, name: e.target.value, error: '' }))}
                    className="input-style"
                  />
                </Field>
                <Field label="CPF">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={editModal.cpf}
                    onChange={(e) => setEditModal((prev) => ({ ...prev, cpf: e.target.value.replace(/\D/g, '').slice(0, 11), error: '' }))}
                    placeholder="Somente números"
                    className="input-style"
                  />
                </Field>
                <Field label="Cargo/Função">
                  <input
                    type="text"
                    value={editModal.role}
                    onChange={(e) => setEditModal((prev) => ({ ...prev, role: e.target.value, error: '' }))}
                    placeholder="Ex: Tosador(a)"
                    className="input-style"
                  />
                </Field>
                <Field label="Admissão">
                  <input
                    type="date"
                    value={editModal.admission_date}
                    onChange={(e) => setEditModal((prev) => ({ ...prev, admission_date: e.target.value, error: '' }))}
                    className="input-style"
                  />
                </Field>
              </div>

              {editModal.error && <p className="mt-3 text-xs font-semibold text-red-600">{editModal.error}</p>}

              <div className="mt-5 flex gap-2">
                <button onClick={closeEditModal} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50">
                  Cancelar
                </button>
                <button onClick={handleUpdateEmployeeDetails} disabled={editModal.loading} className="flex-1 rounded-xl bg-teal-700 py-2.5 text-sm font-bold text-white transition hover:bg-teal-800 disabled:opacity-50">
                  {editModal.loading ? 'Salvando...' : 'Salvar dados'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Inativos */}
        {employees.filter((e) => !e.active).length > 0 && (
          <div className="mb-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Inativos</p>
            <div className="divide-y divide-slate-100 rounded-xl border border-slate-100 bg-slate-50/30">
              {employees.filter((e) => !e.active).map((emp) => (
                <div key={emp.id} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-200 text-xs font-bold text-slate-400">{initials(emp.name)}</div>
                    <span className="text-sm font-medium text-slate-400">{emp.name}</span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleReactivateEmployee(emp.id)} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-emerald-600 transition hover:bg-emerald-50">Reativar</button>
                    <button onClick={() => openDeleteModal(emp)} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-red-500 transition hover:bg-red-50">Deletar</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleAddEmployee} className="grid gap-3 md:grid-cols-2">
          <input type="text" value={newEmpName} onChange={(e) => setNewEmpName(e.target.value)} placeholder="Nome do funcionário" className="input-style" />
          <input
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={8}
            value={newEmpPin}
            onChange={(e) => setNewEmpPin(e.target.value.replace(/\D/g, ''))}
            placeholder="PIN (4-8 dígitos)"
            className="input-style"
          />
          <input
            type="text"
            inputMode="numeric"
            value={newEmpCpf}
            onChange={(e) => setNewEmpCpf(e.target.value.replace(/\D/g, '').slice(0, 11))}
            placeholder="CPF (opcional)"
            className="input-style"
          />
          <input type="text" value={newEmpRole} onChange={(e) => setNewEmpRole(e.target.value)} placeholder="Cargo/Função (opcional)" className="input-style" />
          <input type="date" value={newEmpAdmissionDate} onChange={(e) => setNewEmpAdmissionDate(e.target.value)} className="input-style" />
          <button type="submit" className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700">Adicionar colaborador</button>
        </form>
      </Card>

      {/* Dados da empresa */}
      <Card title="Dados da Empresa" icon={<IconStore />}>
        <p className="mb-4 text-xs leading-5 text-slate-400">
          Essas informações entram no cabeçalho do espelho de ponto.
        </p>
        <Field label="Nome">
          <input type="text" value={storeName} onChange={(e) => setStoreName(e.target.value)} className="input-style" />
        </Field>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label="CNPJ/CPF">
            <input
              type="text"
              value={employerDocument}
              onChange={(e) => setEmployerDocument(e.target.value)}
              placeholder="Documento da empresa"
              className="input-style"
            />
          </Field>
          <Field label="CEI/CAEPF/CNO">
            <input
              type="text"
              value={employerRegistration}
              onChange={(e) => setEmployerRegistration(e.target.value)}
              placeholder="Se houver"
              className="input-style"
            />
          </Field>
        </div>
        <Field label="Horário/Jornada contratual">
          <input
            type="text"
            value={contractualSchedule}
            onChange={(e) => setContractualSchedule(e.target.value)}
            placeholder="Ex: Seg a sáb, 08:00-12:00 / 13:00-17:20"
            className="input-style"
          />
        </Field>
        <button onClick={handleSaveStoreName} className="mt-4 rounded-xl bg-slate-100 px-5 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-200">Salvar</button>
        {storeMsg && <span className="ml-3 text-sm font-semibold text-emerald-600">{storeMsg}</span>}
      </Card>

      {/* Carga Horária */}
      <Card title="Carga Horária Semanal" icon={<IconClock />}>
        <p className="text-xs text-slate-400 mb-3">Define o total de horas semanais esperado. Usado no cálculo de saldo de horas dos funcionários.</p>
        <Field label="Horas por semana">
          <input
            type="number"
            min={1}
            max={80}
            step={0.5}
            value={weeklyHours}
            onChange={(e) => setWeeklyHours(e.target.value)}
            className="input-style"
          />
        </Field>
        <button onClick={handleSaveWeeklyHours} className="mt-4 rounded-xl bg-slate-100 px-5 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-200">Salvar</button>
        {hoursMsg && <span className={`ml-3 text-sm font-semibold ${hoursMsg === 'Salvo!' ? 'text-emerald-600' : 'text-red-600'}`}>{hoursMsg}</span>}
      </Card>

      {/* Senha */}
      <Card title="Alterar Senha" icon={<IconKey />}>
        <div className="space-y-3">
          <Field label="Nova senha"><input type="password" value={newPass} onChange={(e) => setNewPass(e.target.value)} placeholder="Mín. 8 caracteres" className="input-style" /></Field>
          <Field label="Confirmar"><input type="password" value={confirmPass} onChange={(e) => setConfirmPass(e.target.value)} placeholder="Repita a senha" className="input-style" /></Field>
        </div>
        <button onClick={handleChangePassword} className="mt-4 rounded-xl bg-slate-100 px-5 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-200">Alterar Senha</button>
        {passMsg.text && <p className={`mt-2 text-sm font-semibold ${passMsg.type === 'error' ? 'text-red-600' : 'text-emerald-600'}`}>{passMsg.text}</p>}
      </Card>

      {/* Danger zone */}
      <Card title="Zona de Perigo" icon={<IconTrash />} danger className="lg:col-span-2">
        {clearModal.open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 text-red-600">
                  <IconTrash />
                </div>
                <div>
                  <p className="font-bold text-slate-800">Zerar todos os registros</p>
                  <p className="text-xs text-slate-400">Funcionários serão mantidos</p>
                </div>
              </div>
              <div className="mb-4 rounded-xl bg-red-50 p-3 text-xs text-red-700 ring-1 ring-inset ring-red-200">
                ⚠️ Todos os registros de ponto de <strong>todos os funcionários</strong> serão apagados permanentemente. Os funcionários cadastrados continuam intactos.
              </div>
              <div className="mb-4">
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1.5">Confirme sua senha de admin</label>
                <input
                  type="password"
                  value={clearModal.password}
                  onChange={(e) => setClearModal((prev) => ({ ...prev, password: e.target.value }))}
                  onKeyDown={(e) => e.key === 'Enter' && handleClearRecords()}
                  placeholder="••••••••"
                  autoFocus
                  className="input-style"
                />
                {clearModal.error && <p className="mt-2 text-xs font-semibold text-red-600">{clearModal.error}</p>}
              </div>
              <div className="flex gap-2">
                <button onClick={() => setClearModal({ open: false, password: '', loading: false, error: '' })} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50">
                  Cancelar
                </button>
                <button onClick={handleClearRecords} disabled={clearModal.loading} className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-bold text-white transition hover:bg-red-700 disabled:opacity-50">
                  {clearModal.loading ? 'Apagando...' : 'Zerar tudo'}
                </button>
              </div>
            </div>
          </div>
        )}
        <p className="text-sm text-slate-400 mb-4">
          Apaga todos os registros de ponto mantendo os funcionários cadastrados. Útil para virada de ano ou limpar dados de teste.
        </p>
        <button onClick={() => setClearModal({ open: true, password: '', loading: false, error: '' })} className="rounded-xl bg-red-50 px-5 py-2.5 text-sm font-bold text-red-600 ring-1 ring-inset ring-red-200 transition hover:bg-red-100">
          Zerar Registros
        </button>
      </Card>
    </div>
  );
}

/* ═══════════ UI COMPONENTS ═══════════ */

function Card({ title, icon, danger, className = '', children }) {
  return (
    <div className={`surface-card-strong mesh-panel rounded-[30px] p-6 ${className}`}>
      <div className="relative z-10 mb-5 flex items-center gap-3">
        <span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${danger ? 'bg-red-50 text-red-500 ring-1 ring-red-100' : 'bg-teal-50 text-teal-700 ring-1 ring-teal-100'}`}>{icon}</span>
        <div>
          <p className="section-kicker">{danger ? 'Atenção' : 'Gestão'}</p>
          <h3 className={`mt-1 text-base font-extrabold ${danger ? 'text-red-600' : 'text-slate-800'}`}>{title}</h3>
        </div>
      </div>
      <div className="relative z-10">{children}</div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">{label}</label>
      {children}
    </div>
  );
}

/* ═══════════ ICONS (Heroicons outline) ═══════════ */

function IconList() { return <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 12h.007v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-.375 5.25h.007v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" /></svg>; }
function IconDoc() { return <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>; }
function IconGear() { return <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>; }
function IconBack() { return <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" /></svg>; }
function IconLogout() { return <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" /></svg>; }
function IconUsers() { return <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" /></svg>; }
function IconStore() { return <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349M3.75 21V9.349m0 0a3.001 3.001 0 0 0 3.75-.615A2.993 2.993 0 0 0 9.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 0 0 2.25 1.016c.896 0 1.7-.393 2.25-1.015a3.001 3.001 0 0 0 3.75.614m-16.5 0a3.004 3.004 0 0 1-.621-4.72l1.189-1.19A1.5 1.5 0 0 1 5.378 3h13.243a1.5 1.5 0 0 1 1.06.44l1.19 1.189a3 3 0 0 1-.621 4.72M6.75 18h3.75a.75.75 0 0 0 .75-.75V13.5a.75.75 0 0 0-.75-.75H6.75a.75.75 0 0 0-.75.75v3.75c0 .414.336.75.75.75Z" /></svg>; }
function IconKey() { return <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25Z" /></svg>; }
function IconClock() { return <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>; }
function IconSave() { return <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0-3-3m3 3 3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" /></svg>; }
function IconTrash() { return <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>; }
function IconRefresh() { return <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" /></svg>; }
function IconChevronRight() { return <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" /></svg>; }
function IconPhoto() { return <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" /></svg>; }

function initials(name) { return name.trim().split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase(); }

/* ═══════════ TAB: COLABORADORES ═══════════ */

function EmployeesTab({ token, onSelectEmployee }) {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/employees?include_inactive=true', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => readJson(r, []))
      .then((data) => { setEmployees(safeArray(data).filter((e) => e.active)); setLoading(false); });
  }, [token]);

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-emerald-500" />
    </div>
  );

  if (employees.length === 0) return (
    <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white p-16 text-center">
      <p className="text-4xl mb-3">👥</p>
      <p className="font-medium text-slate-400">Nenhum colaborador cadastrado</p>
      <p className="text-sm text-slate-400 mt-1">Adicione funcionários em Configurações</p>
    </div>
  );

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {employees.map((emp) => (
        <button
          key={emp.id}
          onClick={() => onSelectEmployee(emp)}
          className="surface-card-strong mesh-panel flex w-full items-center justify-between rounded-[28px] p-5 text-left transition hover:-translate-y-1 hover:shadow-[0_24px_50px_rgba(15,23,42,0.12)] group"
        >
          <div className="relative z-10 flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-[22px] bg-gradient-to-br from-teal-700 to-emerald-500 text-sm font-bold text-white shadow-[0_18px_38px_rgba(15,118,110,0.22)]">
              {initials(emp.name)}
            </div>
            <div>
              <p className="text-lg font-extrabold text-slate-900">{emp.name}</p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">Ativo · Ver registros</p>
            </div>
          </div>
          <span className="relative z-10 text-slate-300 transition group-hover:translate-x-1 group-hover:text-teal-600">
            <IconChevronRight />
          </span>
        </button>
      ))}
    </div>
  );
}

/* ═══════════ EMPLOYEE DETAIL VIEW ═══════════ */

function EmployeeDetailView({ token, employee, onBack }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterMonth, setFilterMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [photoModal, setPhotoModal] = useState({ open: false, loading: false, src: null });
  const [generating, setGenerating] = useState(false);
  const [storeName, setStoreName] = useState('Pet Patas');
  const [weeklyHours, setWeeklyHours] = useState(44);
  const [employerDocument, setEmployerDocument] = useState('');
  const [employerRegistration, setEmployerRegistration] = useState('');
  const [contractualSchedule, setContractualSchedule] = useState('');

  const authFetch = useCallback((url) =>
    fetch(url, { headers: { Authorization: `Bearer ${token}` } }), [token]);

  useEffect(() => {
    fetch('/api/settings', { headers: { Authorization: `Bearer ${token}` } }).then((r) => readJson(r, {})).then((s) => {
      setStoreName(s.store_name || 'Pet Patas');
      setWeeklyHours(s.weekly_hours || 44);
      setEmployerDocument(s.employer_document || '');
      setEmployerRegistration(s.employer_registration || '');
      setContractualSchedule(s.contractual_schedule || '');
    });
  }, []);

  useEffect(() => {
    setLoading(true);
    const p = new URLSearchParams({ employee_id: employee.id });
    if (filterMonth) p.set('month', filterMonth);
    authFetch(`/api/records?${p}`)
      .then((r) => readJson(r, []))
      .then((data) => { setRecords(safeArray(data)); setLoading(false); });
  }, [employee.id, filterMonth, authFetch]);

  function closePhoto() { setPhotoModal({ open: false, loading: false, src: null }); }

  async function openPhoto(recordId) {
    setPhotoModal({ open: true, loading: true, src: null });
    try {
      const res = await authFetch(`/api/records/${recordId}`);
      const data = await res.json();
      setPhotoModal({ open: true, loading: false, src: data.photo });
    } catch {
      setPhotoModal({ open: true, loading: false, src: null });
    }
  }

  async function handleExportPDF() {
    if (!records.length) { alert('Nenhum registro no período.'); return; }
    setGenerating(true);
    try {
      const { jsPDF, autoTable } = await loadPdfLibraries();
      const doc = new jsPDF();
      const safeMonth = normalizeMonthKey(filterMonth);
      const [year, month] = safeMonth.split('-').map(Number);
      const pw = doc.internal.pageSize.getWidth();

      // Header
      doc.setFillColor(15, 76, 92);
      doc.rect(0, 0, pw, 34, 'F');
      doc.setFontSize(17); doc.setTextColor(255); doc.setFont(undefined, 'bold'); doc.text('Espelho de Ponto Eletrônico', 14, 15);
      doc.setFont(undefined, 'normal'); doc.setFontSize(10); doc.text(`${MONTH_NAMES[month - 1]} de ${year} · ${employee.name}`, 14, 24);

      doc.setFontSize(8.5); doc.setTextColor(80);
      doc.text(`Empregador: ${storeName}`, 14, 44);
      doc.text(`CNPJ/CPF: ${nullableText(employerDocument)}`, 14, 50);
      doc.text(`CEI/CAEPF/CNO: ${nullableText(employerRegistration)}`, 90, 50);
      doc.text(`Trabalhador: ${employee.name}`, 14, 58);
      doc.text(`CPF: ${formatCpf(employee.cpf)}`, 14, 64);
      doc.text(`Admissão: ${formatDateOnly(employee.admission_date)}`, 70, 64);
      doc.text(`Cargo/Função: ${nullableText(employee.role)}`, 126, 64);
      doc.text(`Jornada contratual: ${contractualSchedule || `${weeklyHours}h semanais`}`, 14, 72);
      doc.text(`Emitido em: ${formatBusinessDateTime(new Date(), { second: '2-digit' })}`, 126, 72);

      autoTable(doc, {
        startY: 80,
        head: [['Data', 'Entradas', 'Saídas', 'Duração', 'Observações']],
        body: buildDayTable(records),
        theme: 'grid',
        headStyles: { fillColor: [15, 76, 92], textColor: 255, fontSize: 8.5 },
        bodyStyles: { fontSize: 8.5 },
        columnStyles: { 3: { halign: 'center', fontStyle: 'bold' } },
        margin: { left: 14, right: 14 },
      });

      // Resumo de horas
      let y = doc.lastAutoTable.finalY + 10;
      if (y > 240) { doc.addPage(); y = 20; }

      const worked = hoursData.totalMinutes;
      const expected = expectedMinutes;
      const balance = worked - expected;

      doc.setFontSize(11); doc.setTextColor(46, 125, 50); doc.text('Resumo de Horas', 14, y); y += 8;

      doc.setFontSize(10); doc.setTextColor(60);
      doc.text(`Horas trabalhadas:`, 14, y);
      doc.setFont(undefined, 'bold'); doc.text(formatMinutes(worked), 80, y); doc.setFont(undefined, 'normal'); y += 6;

      doc.text(`Horas esperadas (${weeklyHours}h/semana):`, 14, y);
      doc.setFont(undefined, 'bold'); doc.text(formatMinutes(expected), 80, y); doc.setFont(undefined, 'normal'); y += 6;

      const balColor = balance >= 0 ? [46, 125, 50] : [220, 80, 20];
      doc.text(`Saldo:`, 14, y);
      doc.setFont(undefined, 'bold'); doc.setTextColor(...balColor);
      doc.text(`${balance >= 0 ? '+' : ''}${formatMinutes(balance)}`, 80, y);
      doc.setFont(undefined, 'normal'); y += 16;

      // Assinatura — apenas funcionário, centralizada
      if (y > 250) { doc.addPage(); y = 30; }
      const sigY = y + 12;
      const sigMid = pw / 2;
      doc.setDrawColor(160); doc.setLineWidth(0.3);
      doc.line(sigMid - 50, sigY, sigMid + 50, sigY);
      doc.setFontSize(9); doc.setTextColor(100);
      doc.text('Funcionário', sigMid, sigY + 5, { align: 'center' });
      doc.setFontSize(8); doc.setTextColor(150);
      doc.text(employee.name, sigMid, sigY + 10, { align: 'center' });

      // Rodapé com paginação
      const pages = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pages; i++) {
        doc.setPage(i); doc.setFontSize(8); doc.setTextColor(160);
        doc.text(`${storeName} — ${employee.name} — Pág. ${i}/${pages}`, 14, 288);
      }
      doc.save(`ponto_${employee.name.replace(/\s+/g, '_')}_${filterMonth}.pdf`);
    } catch (err) { console.error(err); alert('Erro ao gerar PDF.'); }
    finally { setGenerating(false); }
  }

  function handleExportJSON() {
    const blob = new Blob(
      [JSON.stringify({ storeName, employee: employee.name, month: filterMonth, exportDate: getBusinessDateKey(), records }, null, 2)],
      { type: 'application/json' },
    );
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `ponto_${employee.name.replace(/\s+/g, '_')}_${filterMonth}.json`;
    a.click();
  }

  const entradas = records.filter((r) => r.type === 'entrada').length;
  const saidas = records.filter((r) => r.type === 'saida').length;
  const hoursData = useMemo(() => calculateWorkedHours(records), [records]);
  const expectedMinutes = useMemo(() => calculateExpectedMonthlyMinutes(filterMonth, weeklyHours), [filterMonth, weeklyHours]);
  const balanceMinutes = hoursData.totalMinutes - expectedMinutes;

  return (
    <>
      {/* ── Photo Modal ── */}
      {photoModal.open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={closePhoto}
        >
          <div
            className="relative w-full max-w-sm rounded-2xl bg-white p-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-bold text-slate-700">Foto do registro</p>
              <button onClick={closePhoto} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 text-lg leading-none">×</button>
            </div>
            {photoModal.loading ? (
              <div className="flex h-64 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-emerald-500" />
              </div>
            ) : photoModal.src ? (
              <img src={photoModal.src} alt="Foto do ponto" className="w-full rounded-xl object-cover" />
            ) : (
              <div className="flex h-64 items-center justify-center rounded-xl bg-slate-100">
                <div className="text-center">
                  <p className="text-3xl mb-2">📷</p>
                  <p className="text-sm text-slate-400">Foto não disponível</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Actions bar ── */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50"
        >
          <IconBack /> Voltar
        </button>
        <div className="flex gap-2">
          <button
            onClick={handleExportJSON}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 shadow-sm transition hover:bg-slate-50"
          >
            <IconSave /> JSON
          </button>
          <button
            onClick={handleExportPDF}
            disabled={generating}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-emerald-500/20 transition hover:shadow-xl disabled:opacity-50"
          >
            <IconDoc /> {generating ? 'Gerando...' : 'Exportar PDF'}
          </button>
        </div>
      </div>

      {/* ── Month filter ── */}
      <div className="mb-6">
        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Mês</label>
        <input
          type="month"
          value={filterMonth}
          onChange={(e) => setFilterMonth(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 focus:border-emerald-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/10"
        />
      </div>

      {/* ── Stats ── */}
      {!loading && (
        <div className="mb-5 flex flex-wrap gap-3">
          <div className="rounded-xl bg-emerald-50 px-5 py-3 text-center">
            <p className="text-xl font-extrabold text-emerald-700">{entradas}</p>
            <p className="text-xs font-semibold text-emerald-600">Entradas</p>
          </div>
          <div className="rounded-xl bg-red-50 px-5 py-3 text-center">
            <p className="text-xl font-extrabold text-red-600">{saidas}</p>
            <p className="text-xs font-semibold text-red-500">Saídas</p>
          </div>
          <div className="rounded-xl bg-blue-50 px-5 py-3 text-center">
            <p className="text-xl font-extrabold text-blue-700">{formatMinutes(hoursData.totalMinutes)}</p>
            <p className="text-xs font-semibold text-blue-600">Trabalhadas</p>
          </div>
          <div className="rounded-xl bg-slate-100 px-5 py-3 text-center">
            <p className="text-xl font-extrabold text-slate-700">{formatMinutes(expectedMinutes)}</p>
            <p className="text-xs font-semibold text-slate-500">Esperado</p>
          </div>
          <div className={`rounded-xl px-5 py-3 text-center ${balanceMinutes >= 0 ? 'bg-emerald-50' : 'bg-amber-50'}`}>
            <p className={`text-xl font-extrabold ${balanceMinutes >= 0 ? 'text-emerald-700' : 'text-amber-700'}`}>
              {balanceMinutes >= 0 ? '+' : ''}{formatMinutes(balanceMinutes)}
            </p>
            <p className={`text-xs font-semibold ${balanceMinutes >= 0 ? 'text-emerald-600' : 'text-amber-600'}`}>Saldo</p>
          </div>
          {hoursData.openEntry && (
            <div className="rounded-xl bg-yellow-50 px-5 py-3 text-center ring-1 ring-inset ring-yellow-200">
              <p className="text-xl font-extrabold text-yellow-700">⚠️</p>
              <p className="text-xs font-semibold text-yellow-600">Entrada aberta</p>
            </div>
          )}
        </div>
      )}

      {/* ── Records table ── */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-emerald-500" />
        </div>
      ) : records.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white p-16 text-center">
          <p className="text-4xl mb-3">📋</p>
          <p className="font-medium text-slate-400">Nenhum registro no período</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/[0.04]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Data / Hora</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Tipo</th>
                <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-400">Foto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {records.map((r) => (
                <tr key={r.id} className="transition-colors hover:bg-slate-50/50">
                  <td className="px-5 py-3.5 font-medium text-slate-600">
                    {formatBusinessDateTime(r.timestamp, {
                      weekday: 'short',
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
                      r.type === 'entrada'
                        ? 'bg-emerald-50 text-emerald-600 ring-1 ring-inset ring-emerald-500/20'
                        : 'bg-red-50 text-red-600 ring-1 ring-inset ring-red-500/20'
                    }`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${r.type === 'entrada' ? 'bg-emerald-400' : 'bg-red-400'}`} />
                      {r.type === 'entrada' ? 'Entrada' : 'Saída'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <button
                      onClick={() => openPhoto(r.id)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-emerald-50 hover:text-emerald-700"
                    >
                      <IconPhoto /> Ver
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
