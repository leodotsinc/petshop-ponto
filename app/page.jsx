'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import ThemeToggle from '@/components/theme-toggle';
import { formatBusinessDate, formatBusinessDateTime, formatBusinessTime } from '@/lib/timekeeping';

export default function PontoPage() {
  const [screen, setScreen] = useState('select');
  const [employees, setEmployees] = useState([]);
  const [storeName, setStoreName] = useState('Pet Patas');
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [nextType, setNextType] = useState('entrada');
  const [photo, setPhoto] = useState(null);
  const [savedRecord, setSavedRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [clock, setClock] = useState('');
  const [dateStr, setDateStr] = useState('');
  const [countdown, setCountdown] = useState(6);
  const [saving, setSaving] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [verifyingPin, setVerifyingPin] = useState(false);
  const [employeeToken, setEmployeeToken] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [loadingDashboard, setLoadingDashboard] = useState(false);
  const [showAllRecords, setShowAllRecords] = useState(false);
  const [loadError, setLoadError] = useState('');

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const countdownRef = useRef(null);

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setClock(formatBusinessDate(now, { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setDateStr(formatBusinessDate(now, { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const [empsRes, settingsRes] = await Promise.all([
        fetch('/api/employees'),
        fetch('/api/settings'),
      ]);

      const employeesData = await empsRes.json().catch(() => []);
      const settingsData = await settingsRes.json().catch(() => ({}));

      setEmployees(Array.isArray(employeesData) ? employeesData : []);
      setStoreName(settingsData?.store_name || 'Pet Patas');
      setLoadError(empsRes.ok && settingsRes.ok ? '' : 'Alguns dados não puderam ser carregados agora.');
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
      setEmployees([]);
      setStoreName('Pet Patas');
      setLoadError('Não foi possível conectar aos dados da loja agora.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function fetchDashboard(empId, token) {
    setLoadingDashboard(true);
    try {
      const res = await fetch(`/api/employees/${empId}/dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Erro ao carregar dashboard');
      setDashboardData(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDashboard(false);
    }
  }

  function handleSelect(emp) {
    setSelectedEmp(emp);
    setNextType(emp.nextType);
    setPin('');
    setPinError('');
    setDashboardData(null);
    setShowAllRecords(false);
    setScreen('pin');
  }

  async function handlePinSubmit(e) {
    e.preventDefault();
    if (pin.length < 4) {
      setPinError('PIN deve ter ao menos 4 dígitos');
      return;
    }
    setPinError('');
    setVerifyingPin(true);
    try {
      const res = await fetch(`/api/employees/${selectedEmp.id}/verify-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPinError(data.error || 'PIN incorreto');
        return;
      }
      setEmployeeToken(data.token);
      await fetchDashboard(selectedEmp.id, data.token);
      setScreen('dashboard');
    } catch {
      setPinError('Erro ao verificar PIN. Tente novamente.');
    } finally {
      setVerifyingPin(false);
    }
  }

  function handlePunchFromDashboard() {
    const nextPunch = dashboardData?.today.currentStatus === 'presente' ? 'saida' : 'entrada';
    setNextType(nextPunch);
    setScreen('camera');
  }

  useEffect(() => {
    if (screen === 'camera') openCamera();
    return () => closeCamera();
  }, [screen]);

  useEffect(() => {
    if (screen !== 'dashboard') return undefined;

    const timeoutId = setTimeout(() => {
      goToSelect();
    }, 60_000);

    return () => clearTimeout(timeoutId);
  }, [screen, dashboardData]);

  async function openCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch {
      alert('Não foi possível acessar a câmera.');
      goToSelect();
    }
  }

  function closeCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  function takePhoto() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const SIZE = 320;
    canvas.width = SIZE;
    canvas.height = SIZE;
    const ctx = canvas.getContext('2d');
    const vw = video.videoWidth || SIZE;
    const vh = video.videoHeight || SIZE;
    const side = Math.min(vw, vh);
    ctx.save();
    ctx.translate(SIZE, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, (vw - side) / 2, (vh - side) / 2, side, side, 0, 0, SIZE, SIZE);
    ctx.restore();
    const photoData = canvas.toDataURL('image/jpeg', 0.55);
    setPhoto(photoData);
    closeCamera();
    saveRecord(photoData);
  }

  async function saveRecord(photoData) {
    setSaving(true);
    try {
      const body = { employee_id: selectedEmp.id, photo: photoData, pin };
      try {
        const pos = await new Promise((res, rej) =>
          navigator.geolocation.getCurrentPosition(res, rej, { timeout: 3000 }),
        );
        body.lat = pos.coords.latitude;
        body.lng = pos.coords.longitude;
      } catch {}
      const res = await fetch('/api/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const record = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          setPinError(record.error || 'PIN incorreto');
          setScreen('pin');
          return;
        }
        throw new Error(record.error || 'Erro ao registrar');
      }
      setNextType(record.type);
      setSavedRecord({ ...record, employee_name: selectedEmp.name });
      setScreen('confirm');
      startCountdown();
    } catch (err) {
      alert(err.message || 'Erro ao registrar ponto.');
      goToSelect();
    } finally {
      setSaving(false);
    }
  }

  function startCountdown() {
    let sec = 6;
    setCountdown(sec);
    countdownRef.current = setInterval(() => {
      sec -= 1;
      setCountdown(sec);
      if (sec <= 0) {
        clearInterval(countdownRef.current);
        goToSelect();
      }
    }, 1000);
  }

  async function goToDashboard() {
    clearInterval(countdownRef.current);
    setPhoto(null);
    setSavedRecord(null);
    setShowAllRecords(false);
    await fetchDashboard(selectedEmp.id, employeeToken);
    setScreen('dashboard');
  }

  function goToSelect() {
    clearInterval(countdownRef.current);
    closeCamera();
    setScreen('select');
    setSelectedEmp(null);
    setPhoto(null);
    setSavedRecord(null);
    setPin('');
    setPinError('');
    setVerifyingPin(false);
    setEmployeeToken(null);
    setDashboardData(null);
    setShowAllRecords(false);
    fetchData();
  }

  const COLORS = [
    'from-emerald-500 to-teal-600',
    'from-blue-500 to-indigo-600',
    'from-violet-500 to-purple-600',
    'from-rose-500 to-pink-600',
    'from-amber-500 to-orange-600',
    'from-cyan-500 to-sky-600',
  ];

  const visibleEmployees = Array.isArray(employees) ? employees : [];
  const selectedEmpIndex = selectedEmp ? visibleEmployees.findIndex((e) => e.id === selectedEmp.id) : 0;
  const empColorIndex = Math.max(0, selectedEmpIndex) % COLORS.length;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-600 to-teal-700">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/30 border-t-white" />
          <p className="text-white/80 text-sm font-medium">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* ─── SELECIONAR ─── */}
      {screen === 'select' && (
        <div className="relative flex min-h-screen flex-col overflow-hidden px-4 pb-8 pt-4 sm:px-6 sm:pt-6">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(15,118,110,0.14),_transparent_24%),radial-gradient(circle_at_bottom_right,_rgba(182,137,71,0.14),_transparent_22%)]" />

          <header className="mesh-panel surface-card-strong relative mx-auto w-full max-w-6xl rounded-[34px] px-6 py-7 text-slate-900 sm:px-8 sm:py-8">
            <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <p className="section-kicker">Ponto digital</p>
                <h1 className="font-display mt-3 text-4xl leading-tight sm:text-5xl">
                  {storeName}
                </h1>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2 sm:justify-self-end">
                  <ThemeToggle />
                </div>
                <div className="rounded-[28px] bg-slate-900 px-5 py-4 text-white shadow-[0_24px_50px_rgba(15,23,42,0.18)]">
                  <p className="text-[11px] uppercase tracking-[0.28em] text-white/55">Horário atual</p>
                  <p className="mt-2 text-3xl font-extrabold tracking-tight tabular-nums">{clock}</p>
                </div>
                <div className="rounded-[28px] bg-white/80 px-5 py-4 ring-1 ring-black/5">
                  <p className="text-[11px] uppercase tracking-[0.28em] text-slate-400">Hoje</p>
                  <p className="mt-2 text-sm font-semibold capitalize text-slate-700">{dateStr}</p>
                </div>
              </div>
            </div>
          </header>

          <main className="relative z-10 mx-auto mt-6 flex w-full max-w-6xl flex-1">
            <section className="surface-card-strong w-full rounded-[32px] p-6 sm:p-7">
              <div className="mb-7 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="section-kicker">Colaboradores</p>
                  <h2 className="mt-3 text-3xl font-extrabold leading-tight text-slate-900">Selecione seu nome</h2>
                </div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                  {visibleEmployees.length} colaborador{visibleEmployees.length === 1 ? '' : 'es'}
                </p>
              </div>

              {loadError && (
                <div className="mb-5 rounded-[24px] bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-amber-100">
                  {loadError}
                </div>
              )}

              {visibleEmployees.length === 0 ? (
                <div className="rounded-[30px] border-2 border-dashed border-slate-200 bg-white/70 p-14 text-center">
                  <p className="text-5xl mb-4">👤</p>
                  <p className="font-medium text-slate-500">Nenhum funcionário cadastrado</p>
                  <p className="mt-1 text-sm text-slate-400">Acesse o painel admin para adicionar</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {visibleEmployees.map((emp, i) => (
                    <button
                      key={emp.id}
                      onClick={() => handleSelect(emp)}
                      className="group surface-card mesh-panel relative overflow-hidden rounded-[30px] p-5 text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_28px_60px_rgba(15,23,42,0.12)] active:scale-[0.98]"
                    >
                      <div className="relative z-10 flex h-full flex-col gap-4">
                        <div className="flex items-start justify-between">
                          <div className={`flex h-16 w-16 items-center justify-center rounded-[22px] bg-gradient-to-br ${COLORS[i % COLORS.length]} text-xl font-extrabold text-white shadow-lg`}>
                            {initials(emp.name)}
                          </div>
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] ${
                            emp.nextType === 'entrada'
                              ? 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-500/15'
                              : 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-500/15'
                          }`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${emp.nextType === 'entrada' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                            {emp.nextType === 'entrada' ? 'Fora' : 'Presente'}
                          </span>
                        </div>
                        <div className="flex-1">
                          <p className="text-lg font-extrabold text-slate-900">{emp.name}</p>
                          <p className="mt-1 text-sm text-slate-500">
                            Próxima ação: <span className="font-semibold text-slate-700">{emp.nextType === 'entrada' ? 'registrar entrada' : 'registrar saída'}</span>
                          </p>
                        </div>
                        <div className="flex items-center justify-between text-sm font-semibold text-teal-700">
                          <span>Abrir acesso</span>
                          <span className="transition-transform duration-200 group-hover:translate-x-1">→</span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </section>
          </main>

          <div className="relative z-10 mt-6 text-center">
            <Link href="/admin" className="inline-flex items-center gap-2 rounded-full bg-white/90 px-5 py-3 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 shadow-[0_16px_40px_rgba(15,23,42,0.08)] ring-1 ring-black/[0.04] transition hover:text-teal-700 hover:shadow-[0_18px_42px_rgba(15,23,42,0.1)]">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>
              Painel Admin
            </Link>
          </div>
        </div>
      )}

      {/* ─── PIN ─── */}
      {screen === 'pin' && (
        <div className="flex min-h-screen flex-col items-center justify-center px-6">
          <div className="surface-card-strong w-full max-w-md rounded-[34px] p-7 sm:p-8">
            <div className="mb-8 flex flex-col items-center gap-2">
              <div className="self-end">
                <ThemeToggle />
              </div>
              <div className={`flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br ${COLORS[empColorIndex]} text-2xl font-extrabold text-white shadow-xl`}>
                {selectedEmp && initials(selectedEmp.name)}
              </div>
              <p className="section-kicker mt-3">Acesso individual</p>
              <p className="font-display text-4xl leading-none text-slate-900">{selectedEmp?.name}</p>
              <p className="mt-2 text-center text-sm leading-6 text-slate-500">
                Digite seu PIN para abrir seu painel e registrar o ponto.
              </p>
            </div>

            <form onSubmit={handlePinSubmit} className="flex flex-col gap-4">
              <div>
                <label className="mb-2 block text-center text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                  PIN de acesso
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoFocus
                  maxLength={8}
                  value={pin}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, '');
                    setPin(v);
                    setPinError('');
                  }}
                  className="input-style rounded-[26px] px-5 py-5 text-center text-2xl font-bold tracking-[0.5em] text-slate-800"
                  placeholder="••••"
                />
                {pinError && (
                  <p className="mt-3 rounded-2xl bg-red-50 px-4 py-3 text-center text-sm font-medium text-red-600 ring-1 ring-red-100">{pinError}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={pin.length < 4 || verifyingPin}
                className="flex w-full items-center justify-center gap-2 rounded-[24px] bg-[linear-gradient(135deg,#0f766e_0%,#0f4c5c_100%)] py-4 text-sm font-bold text-white shadow-[0_22px_40px_rgba(15,118,110,0.22)] transition active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {verifyingPin && (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                )}
                {verifyingPin ? 'Verificando...' : 'Entrar'}
              </button>

              <button
                type="button"
                onClick={goToSelect}
                className="w-full rounded-[24px] bg-white/80 py-3 text-sm font-semibold text-slate-500 ring-1 ring-black/[0.04] shadow-sm transition hover:text-slate-700 hover:shadow-md"
              >
                ← Voltar
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ─── DASHBOARD DO FUNCIONÁRIO ─── */}
      {screen === 'dashboard' && (
        <div className="relative min-h-screen overflow-x-hidden px-4 pb-28 pt-4 sm:px-6 sm:pb-10 lg:px-8">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(15,118,110,0.16),_transparent_24%),radial-gradient(circle_at_80%_0%,_rgba(182,137,71,0.13),_transparent_22%)]" />

          <header className="surface-card-strong mesh-panel relative mx-auto w-full max-w-7xl rounded-[34px] p-5 sm:p-6 lg:p-7">
            <div className="relative z-10 flex flex-col gap-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <button
                  onClick={goToSelect}
                  className="inline-flex items-center gap-2 rounded-2xl bg-white/75 px-4 py-2.5 text-xs font-bold uppercase tracking-[0.18em] text-slate-500 shadow-sm ring-1 ring-black/[0.04] transition hover:text-slate-800 hover:shadow-md"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" /></svg>
                  Sair
                </button>

                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-extrabold tabular-nums tracking-tight text-white shadow-[0_16px_32px_rgba(15,23,42,0.16)]">
                    {clock.slice(0, 5)}
                  </div>
                  <ThemeToggle subtle />
                </div>
              </div>

              <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                <div className="flex min-w-0 items-center gap-4 sm:gap-5">
                  <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-[22px] bg-gradient-to-br ${COLORS[empColorIndex]} text-2xl font-extrabold text-white shadow-xl sm:h-20 sm:w-20 sm:rounded-[26px]`}>
                    {selectedEmp && initials(selectedEmp.name)}
                  </div>
                  <div className="min-w-0">
                    <p className="section-kicker">Meu ponto</p>
                    <h1 className="mt-2 truncate text-3xl font-extrabold leading-tight text-slate-900 sm:text-4xl lg:text-5xl">
                      {selectedEmp?.name}
                    </h1>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold capitalize text-slate-500">{dateStr}</span>
                      {!loadingDashboard && dashboardData && (
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
                          dashboardData.today.currentStatus === 'presente'
                            ? 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-500/20'
                            : 'bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-500/10'
                        }`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${dashboardData.today.currentStatus === 'presente' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                          {dashboardData.today.currentStatus === 'presente' ? 'Presente' : 'Fora'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {dashboardData && (
                  <button
                    onClick={handlePunchFromDashboard}
                    disabled={loadingDashboard}
                    className={`hidden min-w-[260px] items-center justify-center gap-3 rounded-[24px] px-7 py-4 text-sm font-extrabold text-white shadow-xl transition hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-40 lg:inline-flex ${
                      dashboardData.today.currentStatus === 'presente'
                        ? 'bg-gradient-to-r from-slate-700 to-slate-950 shadow-slate-800/20'
                        : 'bg-[linear-gradient(135deg,#0f766e_0%,#0f4c5c_100%)] shadow-emerald-500/25'
                    }`}
                  >
                    <PunchIcon type={dashboardData.today.currentStatus === 'presente' ? 'saida' : 'entrada'} />
                    {dashboardData.today.currentStatus === 'presente' ? 'Registrar Saída' : 'Registrar Entrada'}
                  </button>
                )}
              </div>
            </div>
          </header>

          <main className="relative z-10 mx-auto mt-6 grid w-full max-w-7xl gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
            {loadingDashboard ? (
              <div className="surface-card-strong col-span-full flex min-h-[360px] flex-col items-center justify-center gap-3 rounded-[34px]">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-emerald-500" />
                <p className="text-sm text-slate-400">Carregando seus dados...</p>
              </div>
            ) : dashboardData ? (
              <>
                <section className="space-y-5">
                  <div className="surface-card-strong rounded-[34px] p-5 sm:p-6 lg:p-7">
                    <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <p className="section-kicker">Banco de horas</p>
                        <h2 className="mt-2 text-2xl font-extrabold text-slate-900 sm:text-3xl">
                          Resumo de {dashboardData.month.monthName}
                        </h2>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                      <MetricCard label="Trabalhado" value={formatMinutes(dashboardData.month.workedMinutes)} />
                      <MetricCard label="Esperado" value={formatMinutes(dashboardData.month.expectedMinutes)} />
                      <MetricCard
                        label="Saldo"
                        value={`${dashboardData.month.balanceMinutes >= 0 ? '+' : '-'}${formatMinutes(Math.abs(dashboardData.month.balanceMinutes))}`}
                        tone={dashboardData.month.balanceMinutes >= 0 ? 'positive' : 'negative'}
                      />
                    </div>

                    {dashboardData.month.expectedMinutes > 0 && (
                      <div className="mt-6">
                        <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 transition-all duration-700"
                            style={{ width: `${Math.min(100, (dashboardData.month.workedMinutes / dashboardData.month.expectedMinutes) * 100)}%` }}
                          />
                        </div>
                        <p className="mt-2 text-right text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                          {Math.round((dashboardData.month.workedMinutes / dashboardData.month.expectedMinutes) * 100)}% do esperado
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="surface-card-strong rounded-[34px] p-5 sm:p-6">
                    <div className="mb-5 flex items-center justify-between">
                      <div>
                        <p className="section-kicker">Hoje</p>
                        <h2 className="mt-2 text-2xl font-extrabold text-slate-900">Registros do dia</h2>
                      </div>
                      {dashboardData.today.lastRecord && (
                        <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-bold text-slate-500 ring-1 ring-black/[0.04]">
                          Último {formatBusinessTime(dashboardData.today.lastRecord.timestamp)}
                        </span>
                      )}
                    </div>

                    {dashboardData.today.records.length === 0 ? (
                      <div className="rounded-[28px] border border-dashed border-slate-200 bg-white/60 px-5 py-10 text-center">
                        <p className="text-sm font-bold text-slate-600">Nenhum registro hoje ainda</p>
                        <p className="mt-1 text-sm text-slate-400">Use o botão de registro para iniciar o dia.</p>
                      </div>
                    ) : (
                      <div className="grid gap-3 sm:grid-cols-2">
                        {dashboardData.today.records.map((r, i) => (
                          <RecordItem
                            key={r.id}
                            record={r}
                            isLast={i === dashboardData.today.records.length - 1}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  {dashboardData.month.records.length > dashboardData.today.records.length && (
                    <div className="surface-card-strong rounded-[34px] p-5 sm:p-6">
                      <button
                        onClick={() => setShowAllRecords((v) => !v)}
                        className="flex w-full items-center justify-between gap-4 text-left"
                      >
                        <div>
                          <p className="section-kicker">Histórico</p>
                          <h2 className="mt-2 text-2xl font-extrabold text-slate-900">Registros do mês</h2>
                        </div>
                        <svg
                          className={`h-5 w-5 shrink-0 text-slate-400 transition-transform duration-200 ${showAllRecords ? 'rotate-180' : ''}`}
                          fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                        </svg>
                      </button>

                      {showAllRecords && (
                        <div className="mt-5 space-y-5">
                          {groupByDay(
                            dashboardData.month.records.filter(
                              (r) => !dashboardData.today.records.find((tr) => tr.id === r.id)
                            )
                          ).map(([dayLabel, dayRecords]) => (
                            <div key={dayLabel}>
                              <p className="mb-2 px-1 text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">{dayLabel}</p>
                              <div className="grid gap-2 sm:grid-cols-2">
                                {dayRecords.map((r) => (
                                  <RecordItem key={r.id} record={r} compact />
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </section>

                <aside className="space-y-5 lg:sticky lg:top-6 lg:self-start">
                  <div className="surface-card-strong rounded-[34px] p-6">
                    <p className="section-kicker">Próximo registro</p>
                    <div className="mt-5 rounded-[28px] bg-slate-900 p-5 text-white shadow-[0_24px_55px_rgba(15,23,42,0.2)]">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-sm font-semibold text-white/60">Status atual</p>
                          <p className="mt-1 text-3xl font-black">
                            {dashboardData.today.currentStatus === 'presente' ? 'Presente' : 'Fora'}
                          </p>
                        </div>
                        <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${
                          dashboardData.today.currentStatus === 'presente' ? 'bg-emerald-400/15 text-emerald-200' : 'bg-white/10 text-white/70'
                        }`}>
                          <PunchIcon type={dashboardData.today.currentStatus === 'presente' ? 'saida' : 'entrada'} />
                        </div>
                      </div>
                      {dashboardData.today.lastRecord && (
                        <p className="mt-4 text-sm text-white/55">
                          Último registro às {formatBusinessTime(dashboardData.today.lastRecord.timestamp)}
                        </p>
                      )}
                    </div>

                    <button
                      onClick={handlePunchFromDashboard}
                      disabled={loadingDashboard}
                      className={`mt-4 flex w-full items-center justify-center gap-3 rounded-[24px] py-4 text-sm font-extrabold text-white shadow-xl transition active:scale-[0.97] disabled:opacity-40 ${
                        dashboardData.today.currentStatus === 'presente'
                          ? 'bg-gradient-to-r from-slate-700 to-slate-950 shadow-slate-800/20'
                          : 'bg-[linear-gradient(135deg,#0f766e_0%,#0f4c5c_100%)] shadow-emerald-500/25'
                      }`}
                    >
                      <PunchIcon type={dashboardData.today.currentStatus === 'presente' ? 'saida' : 'entrada'} />
                      {dashboardData.today.currentStatus === 'presente' ? 'Registrar Saída' : 'Registrar Entrada'}
                    </button>
                  </div>

                  <div className="rounded-[30px] bg-slate-900 px-5 py-4 text-sm text-white shadow-[0_22px_50px_rgba(15,23,42,0.18)]">
                    <p className="font-semibold">Privacidade protegida</p>
                    <p className="mt-1 text-white/65">Este painel fecha automaticamente após 1 minuto de inatividade.</p>
                  </div>
                </aside>
              </>
            ) : (
              <div className="surface-card-strong col-span-full rounded-[30px] p-8 text-center">
                <p className="text-slate-400 text-sm">Não foi possível carregar os dados.</p>
                <button
                  onClick={() => fetchDashboard(selectedEmp.id, employeeToken)}
                  className="mt-3 text-sm font-semibold text-emerald-600"
                >
                  Tentar novamente
                </button>
              </div>
            )}
          </main>

          <div className="surface-card-strong fixed inset-x-0 bottom-0 z-30 rounded-t-[28px] p-4 backdrop-blur-xl lg:hidden">
            <button
              onClick={handlePunchFromDashboard}
              disabled={loadingDashboard}
              className={`flex w-full items-center justify-center gap-3 rounded-[24px] py-4 text-sm font-extrabold text-white shadow-xl transition active:scale-[0.97] disabled:opacity-40 ${
                dashboardData?.today.currentStatus === 'presente'
                  ? 'bg-gradient-to-r from-slate-700 to-slate-900 shadow-slate-800/20'
                  : 'bg-[linear-gradient(135deg,#0f766e_0%,#0f4c5c_100%)] shadow-emerald-500/25'
              }`}
            >
              {dashboardData?.today.currentStatus === 'presente' ? (
                <>
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" /></svg>
                  Registrar Saída
                </>
              ) : (
                <>
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" /></svg>
                  Registrar Entrada
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ─── CÂMERA ─── */}
      {screen === 'camera' && (
        <div className="fixed inset-0 z-50 h-dvh overflow-hidden bg-slate-950 px-4 py-4 text-white sm:px-6 lg:py-6">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(20,184,166,0.20),_transparent_26%),radial-gradient(circle_at_bottom_right,_rgba(182,137,71,0.14),_transparent_24%)]" />

          <div className="relative mx-auto grid h-full max-w-7xl gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
            <section className="relative min-h-0 overflow-hidden rounded-[34px] bg-black shadow-[0_34px_90px_rgba(0,0,0,0.45)] ring-1 ring-white/10">
              <video ref={videoRef} autoPlay playsInline muted className="h-full min-h-[360px] w-full object-cover lg:min-h-0" />

              <div className="pointer-events-none absolute inset-x-0 top-0 z-10 bg-gradient-to-b from-black/75 via-black/30 to-transparent px-5 pb-20 pt-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.26em] text-white/55">Câmera</p>
                    <p className="mt-2 text-xl font-extrabold text-white drop-shadow-lg sm:text-2xl">{selectedEmp?.name}</p>
                  </div>
                  <span className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold text-white shadow-xl backdrop-blur-sm ${
                    nextType === 'entrada' ? 'bg-emerald-500/80 shadow-emerald-500/25' : 'bg-red-500/80 shadow-red-500/25'
                  }`}>
                    <PunchIcon type={nextType} />
                    {nextType === 'entrada' ? 'Entrada' : 'Saída'}
                  </span>
                </div>
              </div>

              <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/85 via-black/45 to-transparent px-5 pb-5 pt-24 lg:hidden">
                <div className="mx-auto flex max-w-md items-center justify-between">
                  <button
                    onClick={employeeToken ? goToDashboard : goToSelect}
                    className="rounded-full bg-white/15 px-5 py-2.5 text-sm font-semibold text-white ring-1 ring-white/20 backdrop-blur-sm transition hover:bg-white/25"
                  >
                    Voltar
                  </button>
                  <button onClick={takePhoto} disabled={saving} className="h-20 w-20 rounded-full border-[6px] border-white bg-white shadow-2xl transition-transform active:scale-90 disabled:opacity-50" aria-label="Tirar foto" />
                  <div className="w-[78px]" />
                </div>
              </div>
            </section>

            <aside className="hidden min-h-0 flex-col justify-between rounded-[34px] bg-white/[0.08] p-6 shadow-[0_34px_90px_rgba(0,0,0,0.24)] ring-1 ring-white/10 backdrop-blur-xl lg:flex">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.28em] text-white/45">Registrar ponto</p>
                <h2 className="mt-4 text-4xl font-black leading-tight">
                  Confirme pela foto
                </h2>
                <p className="mt-4 text-sm leading-6 text-white/60">
                  Posicione o rosto no centro da câmera e clique no botão abaixo. O registro é salvo automaticamente após a captura.
                </p>

                <div className="mt-7 rounded-[28px] bg-black/25 p-5 ring-1 ring-white/10">
                  <p className="text-sm font-semibold text-white/50">Funcionário</p>
                  <p className="mt-1 text-2xl font-extrabold">{selectedEmp?.name}</p>
                  <p className={`mt-4 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold ${
                    nextType === 'entrada' ? 'bg-emerald-400/15 text-emerald-200' : 'bg-red-400/15 text-red-200'
                  }`}>
                    <PunchIcon type={nextType} />
                    {nextType === 'entrada' ? 'Entrada' : 'Saída'}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <button
                  onClick={takePhoto}
                  disabled={saving}
                  className="flex w-full items-center justify-center gap-3 rounded-[28px] bg-white py-5 text-sm font-black uppercase tracking-[0.18em] text-slate-950 shadow-[0_28px_60px_rgba(255,255,255,0.12)] transition hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-50"
                >
                  <span className="h-4 w-4 rounded-full bg-slate-950" />
                  Tirar foto
                </button>
                <button
                  onClick={employeeToken ? goToDashboard : goToSelect}
                  className="w-full rounded-[24px] bg-white/10 py-4 text-sm font-bold text-white/75 ring-1 ring-white/10 transition hover:bg-white/15 hover:text-white"
                >
                  Voltar
                </button>
              </div>
            </aside>
          </div>
          <canvas ref={canvasRef} className="hidden" />
        </div>
      )}

      {/* ─── CONFIRMAÇÃO ─── */}
      {screen === 'confirm' && (
        <div className="flex min-h-screen flex-col items-center justify-center px-6">
          <div className="surface-card-strong flex w-full max-w-md flex-col items-center gap-5 rounded-[34px] p-7 text-center">
            <div className="self-end">
              <ThemeToggle />
            </div>
            <div className={`flex h-20 w-20 items-center justify-center rounded-3xl shadow-xl ${
              savedRecord?.type === 'entrada'
                ? 'bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-emerald-500/25'
                : 'bg-gradient-to-br from-red-400 to-red-600 shadow-red-500/25'
            }`}>
              <svg className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
            </div>
            {photo && <img src={photo} alt="" className="h-28 w-28 rounded-3xl border-4 border-white object-cover shadow-xl" />}
            <div className="text-center">
              <p className="section-kicker">Registro concluído</p>
              <p className="font-display mt-3 text-4xl text-slate-900">{savedRecord?.employee_name}</p>
              <p className={`mt-3 font-bold ${savedRecord?.type === 'entrada' ? 'text-emerald-600' : 'text-red-600'}`}>
                {savedRecord?.type === 'entrada' ? '📥 Entrada registrada' : '📤 Saída registrada'}
              </p>
              <p className="mt-3 text-sm text-slate-400">
                {savedRecord && formatBusinessDateTime(savedRecord.timestamp, { second: '2-digit' })}
              </p>
            </div>
            <button
              onClick={goToSelect}
              className="mt-2 w-full rounded-[24px] bg-[linear-gradient(135deg,#0f766e_0%,#0f4c5c_100%)] py-4 text-sm font-bold text-white shadow-[0_22px_40px_rgba(15,118,110,0.22)] transition active:scale-[0.97]"
            >
              Encerrar
            </button>
            {employeeToken && (
              <button
                onClick={goToDashboard}
                className="w-full rounded-[24px] bg-white/80 py-3 text-sm font-semibold text-slate-500 ring-1 ring-black/[0.04] transition hover:text-slate-800"
              >
                Ver meu painel
              </button>
            )}
            <div className="w-full">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-1000 ease-linear" style={{ width: `${(countdown / 6) * 100}%` }} />
              </div>
              <p className="mt-2 text-center text-xs text-slate-400">Voltando para a tela inicial em {countdown}s</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function MetricCard({ label, value, tone = 'neutral' }) {
  const toneClass = {
    neutral: 'bg-slate-50 text-slate-900',
    positive: 'bg-emerald-50 text-emerald-700',
    negative: 'bg-red-50 text-red-700',
  }[tone];

  return (
    <div className={`rounded-[26px] px-4 py-5 ${toneClass}`}>
      <p className="text-2xl font-black tabular-nums sm:text-3xl">{value}</p>
      <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">{label}</p>
    </div>
  );
}

function RecordItem({ record, isLast = false, compact = false }) {
  const isEntry = record.type === 'entrada';

  return (
    <div className={`flex items-center gap-3 rounded-[22px] bg-white/65 ring-1 ring-black/[0.04] ${
      compact ? 'px-3 py-2.5' : 'px-4 py-3.5'
    }`}>
      <div className={`flex shrink-0 items-center justify-center rounded-2xl text-white shadow-sm ${
        compact ? 'h-9 w-9' : 'h-11 w-11'
      } ${isEntry ? 'bg-emerald-500' : 'bg-slate-500'}`}>
        <PunchIcon type={record.type} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-bold text-slate-800">{isEntry ? 'Entrada' : 'Saída'}</p>
        <p className="text-sm tabular-nums text-slate-400">{formatBusinessTime(record.timestamp)}</p>
      </div>
      {isLast && (
        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-600 ring-1 ring-inset ring-emerald-500/20">
          último
        </span>
      )}
    </div>
  );
}

function PunchIcon({ type }) {
  const isEntry = type === 'entrada';

  return isEntry ? (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
    </svg>
  ) : (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" />
    </svg>
  );
}

function initials(name) {
  return name.trim().split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
}

function formatMinutes(m) {
  if (m === 0) return '0h00';
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${h}h${String(min).padStart(2, '0')}`;
}

function groupByDay(records) {
  const map = new Map();
  for (const r of [...records].reverse()) {
    const key = formatBusinessDate(r.timestamp, {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
    });
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(r);
  }
  return [...map.entries()];
}
