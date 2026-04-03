'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';

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

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* ── Sidebar ── */}
      <aside className="hidden lg:flex w-64 flex-col border-r border-slate-200 bg-white h-screen">
        <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-5 shrink-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-sm font-bold text-white shadow-md shadow-emerald-500/20">P</div>
          <div>
            <p className="text-sm font-bold text-slate-800">Ponto Digital</p>
            <p className="text-xs text-slate-400">Painel Admin</p>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => handleTabChange(t.id)} className={`flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
              tab === t.id ? 'bg-emerald-50 text-emerald-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
            }`}>
              <span className={tab === t.id ? 'text-emerald-600' : 'text-slate-400'}>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </nav>
        <div className="border-t border-slate-100 px-3 py-3 space-y-1 shrink-0">
          <Link href="/" className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-700">
            <IconBack /> Voltar ao ponto
          </Link>
          <button onClick={handleLogout} className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-400 hover:bg-red-50 hover:text-red-600">
            <IconLogout /> Sair
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex flex-1 flex-col min-w-0 h-screen">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-xs font-bold text-white">P</div>
            <span className="text-sm font-bold text-slate-800">Admin</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/" className="text-xs text-slate-400 hover:text-emerald-600">Ponto</Link>
            <button onClick={handleLogout} className="text-xs text-slate-400 hover:text-red-600">Sair</button>
          </div>
        </header>

        {/* Mobile tabs */}
        <div className="lg:hidden flex border-b border-slate-200 bg-white px-2 shrink-0">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => handleTabChange(t.id)} className={`flex-1 py-3 text-center text-xs font-semibold transition-colors border-b-2 ${
              tab === t.id ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-slate-400'
            }`}>{t.label}</button>
          ))}
        </div>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-4xl">
            <h2 className="mb-6 text-xl font-extrabold text-slate-800">
              {tab === 'employees' && selectedEmployee
                ? selectedEmployee.name
                : TABS.find((t) => t.id === tab)?.label}
            </h2>
            {tab === 'records'   && <RecordsTab token={token} />}
            {tab === 'report'    && <ReportTab token={token} />}
            {tab === 'employees' && (
              selectedEmployee
                ? <EmployeeDetailView token={token} employee={selectedEmployee} onBack={() => setSelectedEmployee(null)} />
                : <EmployeesTab onSelectEmployee={setSelectedEmployee} />
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
    <div className="flex min-h-screen">
      {/* Lateral decorativa */}
      <div className="hidden lg:flex lg:w-1/2 items-center justify-center bg-gradient-to-br from-emerald-600 via-emerald-600 to-teal-600 p-12">
        <div className="max-w-md text-center text-white">
          <p className="text-7xl mb-6">🐾</p>
          <h2 className="text-3xl font-extrabold tracking-tight">Ponto Digital</h2>
          <p className="mt-3 text-emerald-100/80 text-lg">Controle de ponto simples e seguro para sua equipe</p>
        </div>
      </div>

      {/* Formulário */}
      <div className="flex flex-1 items-center justify-center bg-white px-6">
        <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-6">
          <div className="lg:hidden text-center mb-2">
            <p className="text-5xl mb-3">🐾</p>
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-800">Acesso Admin</h1>
            <p className="mt-1 text-sm text-slate-400">Digite a senha de administrador</p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Senha</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus placeholder="••••••••"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm placeholder:text-slate-300 focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition" />
          </div>
          {error && <p className="rounded-lg bg-red-50 px-4 py-2.5 text-sm font-medium text-red-600">{error}</p>}
          <button type="submit" disabled={loading} className="w-full rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-500/20 transition hover:shadow-xl disabled:opacity-50">
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
          <Link href="/" className="block text-center text-sm text-slate-400 hover:text-emerald-600 transition">← Voltar ao ponto</Link>
        </form>
      </div>
    </div>
  );
}

/* ═══════════ TAB: REGISTROS (painel do dia) ═══════════ */

function RecordsTab({ token }) {
  const [employees, setEmployees] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const fetchData = useCallback(async () => {
    try {
      const [empsRes, recsRes] = await Promise.all([
        fetch('/api/employees'),
        fetch(`/api/records?date=${today}`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const [emps, recs] = await Promise.all([empsRes.json(), recsRes.json()]);
      setEmployees(emps);
      // records vêm desc; invertemos para timeline crescente
      setRecords([...recs].reverse());
      setLastUpdated(new Date());
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [token, today]);

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

  const todayLabel = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
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
              · {lastUpdated.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
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
                        {new Date(last.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
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
                    {new Date(r.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
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

/* ═══════════ TAB: RELATÓRIO ═══════════ */

function ReportTab({ token }) {
  const [employees, setEmployees] = useState([]);
  const [pdfEmp, setPdfEmp] = useState('');
  const [pdfMonth, setPdfMonth] = useState('');
  const [generating, setGenerating] = useState(false);
  const [storeName, setStoreName] = useState('Pet Patas');

  useEffect(() => {
    const now = new Date();
    setPdfMonth(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
    fetch('/api/employees').then((r) => r.json()).then(setEmployees);
    fetch('/api/settings').then((r) => r.json()).then((s) => setStoreName(s.store_name));
  }, []);

  async function handleGeneratePDF() {
    if (!pdfMonth) { alert('Selecione um mês.'); return; }
    setGenerating(true);
    try {
      const p = new URLSearchParams({ month: pdfMonth });
      if (pdfEmp) p.set('employee_id', pdfEmp);
      const records = await (await fetch(`/api/records?${p}`, { headers: { Authorization: `Bearer ${token}` } })).json();
      if (!records.length) { alert('Nenhum registro no período.'); return; }

      const { jsPDF } = await import('jspdf');
      const { autoTable } = await import('jspdf-autotable');
      const doc = new jsPDF();
      const [year, month] = pdfMonth.split('-').map(Number);
      const MN = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

      doc.setFontSize(20); doc.setTextColor(46, 125, 50); doc.text(storeName, 14, 22);
      doc.setFontSize(13); doc.setTextColor(80); doc.text(`Relatório de Ponto — ${MN[month-1]} de ${year}`, 14, 32);
      doc.setFontSize(8); doc.setTextColor(150); doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 39);

      const byEmp = {};
      records.forEach((r) => { (byEmp[r.employee_name] = byEmp[r.employee_name] || []).push(r); });
      let y = 48;

      Object.entries(byEmp).forEach(([name, recs]) => {
        if (y > 240) { doc.addPage(); y = 18; }
        doc.setFontSize(12); doc.setTextColor(46, 125, 50); doc.text(name, 14, y); y += 2;
        autoTable(doc, {
          startY: y,
          head: [['Data', 'Horário', 'Tipo']],
          body: recs.map((r) => {
            const d = new Date(r.timestamp);
            return [
              d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' }),
              d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
              r.type === 'entrada' ? 'Entrada' : 'Saída',
            ];
          }),
          theme: 'striped',
          headStyles: { fillColor: [46, 125, 50], textColor: 255, fontSize: 10 },
          bodyStyles: { fontSize: 10 },
          margin: { left: 14, right: 14 },
        });
        y = doc.lastAutoTable.finalY + 6;
        const e = recs.filter((r) => r.type === 'entrada').length;
        const s = recs.filter((r) => r.type === 'saida').length;
        doc.setFontSize(9); doc.setTextColor(100);
        doc.text(`Total: ${e} entrada${e !== 1 ? 's' : ''}, ${s} saída${s !== 1 ? 's' : ''}`, 14, y);
        y += 14;
      });

      const pages = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pages; i++) { doc.setPage(i); doc.setFontSize(8); doc.setTextColor(160); doc.text(`${storeName} — Pág. ${i}/${pages}`, 14, 288); }
      doc.save(`ponto_${pdfMonth}.pdf`);
    } catch (err) { console.error(err); alert('Erro ao gerar PDF.'); }
    finally { setGenerating(false); }
  }

  async function handleExportJSON() {
    const records = await (await fetch('/api/records?', { headers: { Authorization: `Bearer ${token}` } })).json();
    const blob = new Blob([JSON.stringify({ storeName, exportDate: new Date().toISOString(), records }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `backup_ponto_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card title="Gerar Relatório PDF" icon={<IconDoc />}>
        <div className="space-y-4">
          <Field label="Funcionário">
            <select value={pdfEmp} onChange={(e) => setPdfEmp(e.target.value)} className="input-style">
              <option value="">Todos</option>
              {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </Field>
          <Field label="Mês">
            <input type="month" value={pdfMonth} onChange={(e) => setPdfMonth(e.target.value)} className="input-style" />
          </Field>
          <button onClick={handleGeneratePDF} disabled={generating}
            className="w-full rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-500/20 transition hover:shadow-xl disabled:opacity-50">
            {generating ? 'Gerando...' : 'Gerar e Baixar PDF'}
          </button>
        </div>
      </Card>

      <Card title="Backup de Dados" icon={<IconSave />}>
        <p className="text-sm text-slate-400 mb-4">Exporta todos os registros como JSON para backup mensal.</p>
        <button onClick={handleExportJSON} className="w-full rounded-xl bg-slate-100 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-200">
          Exportar JSON
        </button>
      </Card>
    </div>
  );
}

/* ═══════════ TAB: SETTINGS ═══════════ */

function SettingsTab({ token }) {
  const [employees, setEmployees] = useState([]);
  const [newEmpName, setNewEmpName] = useState('');
  const [newEmpPin, setNewEmpPin] = useState('');
  const [storeName, setStoreName] = useState('');
  const [storeMsg, setStoreMsg] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [passMsg, setPassMsg] = useState({ type: '', text: '' });

  const authFetch = useCallback((url, opts = {}) =>
    fetch(url, { ...opts, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...opts.headers } }), [token]);

  const loadEmployees = useCallback(() => {
    fetch('/api/employees?include_inactive=true').then((r) => r.json()).then(setEmployees);
  }, []);

  useEffect(() => {
    loadEmployees();
    fetch('/api/settings').then((r) => r.json()).then((s) => setStoreName(s.store_name));
  }, [loadEmployees]);

  async function handleAddEmployee(e) {
    e.preventDefault();
    if (!newEmpName.trim()) return;
    if (!newEmpPin || newEmpPin.length < 4 || newEmpPin.length > 8) {
      alert('PIN deve ter entre 4 e 8 dígitos.');
      return;
    }
    const res = await authFetch('/api/employees', { method: 'POST', body: JSON.stringify({ name: newEmpName.trim(), pin: newEmpPin }) });
    if (!res.ok) { alert((await res.json()).error); return; }
    setNewEmpName('');
    setNewEmpPin('');
    loadEmployees();
  }

  const [pinModal, setPinModal] = useState({ open: false, employee: null, pin: '', loading: false, error: '', success: false });

  function openPinModal(emp) {
    setPinModal({ open: true, employee: emp, pin: '', loading: false, error: '', success: false });
  }

  function closePinModal() {
    setPinModal({ open: false, employee: null, pin: '', loading: false, error: '', success: false });
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
    await authFetch('/api/settings', { method: 'PUT', body: JSON.stringify({ store_name: storeName }) });
    setStoreMsg('Salvo!');
    setTimeout(() => setStoreMsg(''), 2000);
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
              <div key={emp.id} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-xs font-bold text-white">{initials(emp.name)}</div>
                  <div>
                    <span className="text-sm font-medium text-slate-700">{emp.name}</span>
                    <span className={`ml-2 text-xs font-medium ${emp.hasPin ? 'text-emerald-500' : 'text-amber-500'}`}>
                      {emp.hasPin ? 'PIN ativo' : 'Sem PIN'}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
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

        <form onSubmit={handleAddEmployee} className="flex flex-wrap gap-2">
          <input type="text" value={newEmpName} onChange={(e) => setNewEmpName(e.target.value)} placeholder="Nome do funcionário" className="input-style flex-1 min-w-[140px]" />
          <input
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={8}
            value={newEmpPin}
            onChange={(e) => setNewEmpPin(e.target.value.replace(/\D/g, ''))}
            placeholder="PIN (4-8 dígitos)"
            className="input-style w-40"
          />
          <button type="submit" className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700">Adicionar</button>
        </form>
      </Card>

      {/* Nome da loja */}
      <Card title="Nome da Loja" icon={<IconStore />}>
        <Field label="Nome">
          <input type="text" value={storeName} onChange={(e) => setStoreName(e.target.value)} className="input-style" />
        </Field>
        <button onClick={handleSaveStoreName} className="mt-4 rounded-xl bg-slate-100 px-5 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-200">Salvar</button>
        {storeMsg && <span className="ml-3 text-sm font-semibold text-emerald-600">{storeMsg}</span>}
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
    <div className={`rounded-2xl bg-white p-6 shadow-sm ring-1 ${danger ? 'ring-red-200' : 'ring-black/[0.04]'} ${className}`}>
      <div className="mb-4 flex items-center gap-2.5">
        <span className={danger ? 'text-red-500' : 'text-emerald-600'}>{icon}</span>
        <h3 className={`text-sm font-bold ${danger ? 'text-red-600' : 'text-slate-700'}`}>{title}</h3>
      </div>
      {children}
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
function IconSave() { return <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0-3-3m3 3 3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" /></svg>; }
function IconTrash() { return <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>; }
function IconRefresh() { return <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" /></svg>; }
function IconChevronRight() { return <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" /></svg>; }
function IconPhoto() { return <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" /></svg>; }

function initials(name) { return name.trim().split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase(); }

/* ═══════════ TAB: COLABORADORES ═══════════ */

function EmployeesTab({ onSelectEmployee }) {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/employees')
      .then((r) => r.json())
      .then((data) => { setEmployees(data); setLoading(false); });
  }, []);

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
          className="flex items-center justify-between rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/[0.04] transition hover:shadow-md hover:ring-emerald-200 text-left w-full group"
        >
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-sm font-bold text-white shadow-md shadow-emerald-500/20">
              {initials(emp.name)}
            </div>
            <div>
              <p className="font-bold text-slate-800">{emp.name}</p>
              <p className="text-xs text-emerald-600 font-medium">Ativo · Ver registros →</p>
            </div>
          </div>
          <span className="text-slate-300 transition group-hover:text-emerald-500">
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

  const authFetch = useCallback((url) =>
    fetch(url, { headers: { Authorization: `Bearer ${token}` } }), [token]);

  useEffect(() => {
    fetch('/api/settings').then((r) => r.json()).then((s) => setStoreName(s.store_name));
  }, []);

  useEffect(() => {
    setLoading(true);
    const p = new URLSearchParams({ employee_id: employee.id });
    if (filterMonth) p.set('month', filterMonth);
    authFetch(`/api/records?${p}`)
      .then((r) => r.json())
      .then((data) => { setRecords(data); setLoading(false); });
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
      const { jsPDF } = await import('jspdf');
      const { autoTable } = await import('jspdf-autotable');
      const doc = new jsPDF();
      const [year, month] = filterMonth.split('-').map(Number);
      const MN = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

      doc.setFontSize(20); doc.setTextColor(46, 125, 50); doc.text(storeName, 14, 22);
      doc.setFontSize(13); doc.setTextColor(80); doc.text(`Relatório — ${employee.name}`, 14, 32);
      doc.setFontSize(10); doc.setTextColor(100); doc.text(`${MN[month - 1]} de ${year}`, 14, 40);
      doc.setFontSize(8); doc.setTextColor(150); doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 47);

      autoTable(doc, {
        startY: 55,
        head: [['Data', 'Horário', 'Tipo']],
        body: records.map((r) => {
          const d = new Date(r.timestamp);
          return [
            d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' }),
            d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            r.type === 'entrada' ? 'Entrada' : 'Saída',
          ];
        }),
        theme: 'striped',
        headStyles: { fillColor: [46, 125, 50], textColor: 255, fontSize: 10 },
        bodyStyles: { fontSize: 10 },
        margin: { left: 14, right: 14 },
      });

      const e = records.filter((r) => r.type === 'entrada').length;
      const s = records.filter((r) => r.type === 'saida').length;
      const finalY = doc.lastAutoTable.finalY + 6;
      doc.setFontSize(9); doc.setTextColor(100);
      doc.text(`Total: ${e} entrada${e !== 1 ? 's' : ''}, ${s} saída${s !== 1 ? 's' : ''}`, 14, finalY);

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
      [JSON.stringify({ storeName, employee: employee.name, month: filterMonth, exportDate: new Date().toISOString(), records }, null, 2)],
      { type: 'application/json' },
    );
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `ponto_${employee.name.replace(/\s+/g, '_')}_${filterMonth}.json`;
    a.click();
  }

  const entradas = records.filter((r) => r.type === 'entrada').length;
  const saidas = records.filter((r) => r.type === 'saida').length;

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
        <div className="mb-5 flex gap-3">
          <div className="rounded-xl bg-emerald-50 px-5 py-3 text-center">
            <p className="text-xl font-extrabold text-emerald-700">{entradas}</p>
            <p className="text-xs font-semibold text-emerald-600">Entradas</p>
          </div>
          <div className="rounded-xl bg-red-50 px-5 py-3 text-center">
            <p className="text-xl font-extrabold text-red-600">{saidas}</p>
            <p className="text-xs font-semibold text-red-500">Saídas</p>
          </div>
          <div className="rounded-xl bg-slate-100 px-5 py-3 text-center">
            <p className="text-xl font-extrabold text-slate-700">{records.length}</p>
            <p className="text-xs font-semibold text-slate-500">Total</p>
          </div>
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
                    {new Date(r.timestamp).toLocaleString('pt-BR', {
                      weekday: 'short', day: '2-digit', month: '2-digit',
                      year: 'numeric', hour: '2-digit', minute: '2-digit',
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
