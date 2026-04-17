'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';

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

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const countdownRef = useRef(null);

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setClock(now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setDateStr(now.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }));
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
      setEmployees(await empsRes.json());
      setStoreName((await settingsRes.json()).store_name);
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
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
      const body = { employee_id: selectedEmp.id, type: nextType, photo: photoData, pin };
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
        if (employeeToken) {
          goToDashboard();
        } else {
          goToSelect();
        }
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

  const empColorIndex = selectedEmp ? employees.findIndex((e) => e.id === selectedEmp.id) % COLORS.length : 0;

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
        <div className="flex min-h-screen flex-col">
          <header className="relative overflow-hidden bg-gradient-to-r from-emerald-600 via-emerald-600 to-teal-600 px-6 py-7 text-white shadow-xl shadow-emerald-600/15">
            <div className="absolute -right-10 -top-10 h-44 w-44 rounded-full bg-white/5" />
            <div className="absolute -left-6 -bottom-6 h-28 w-28 rounded-full bg-white/5" />
            <div className="relative mx-auto max-w-xl">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-extrabold tracking-tight">🐾 {storeName}</h1>
                  <p className="mt-1 text-sm text-emerald-100/80 capitalize">{dateStr}</p>
                </div>
                <div className="text-right">
                  <p className="text-4xl font-extrabold tracking-tight tabular-nums leading-none">{clock}</p>
                </div>
              </div>
            </div>
          </header>

          <main className="flex-1 px-5 py-8">
            <div className="mx-auto max-w-xl">
              <p className="mb-8 text-center text-sm font-medium text-slate-400 tracking-wide uppercase">
                Selecione seu nome para registrar o ponto
              </p>

              {employees.length === 0 ? (
                <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-white p-14 text-center">
                  <p className="text-5xl mb-4">👤</p>
                  <p className="text-slate-500 font-medium">Nenhum funcionário cadastrado</p>
                  <p className="text-slate-400 text-sm mt-1">Acesse o painel admin para adicionar</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4 sm:gap-5">
                  {employees.map((emp, i) => (
                    <button
                      key={emp.id}
                      onClick={() => handleSelect(emp)}
                      className="group relative flex flex-col items-center gap-3.5 rounded-3xl bg-white p-6 sm:p-7 shadow-sm ring-1 ring-black/[0.04] transition-all duration-200 hover:shadow-xl hover:shadow-slate-200/60 hover:-translate-y-1 active:scale-[0.97]"
                    >
                      <div className={`flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-2xl bg-gradient-to-br ${COLORS[i % COLORS.length]} text-xl sm:text-2xl font-extrabold text-white shadow-lg transition-transform duration-200 group-hover:scale-105`}>
                        {initials(emp.name)}
                      </div>
                      <span className="text-sm font-bold text-slate-700">{emp.name}</span>
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-bold tracking-wide ${
                        emp.nextType === 'entrada'
                          ? 'bg-orange-50 text-orange-600 ring-1 ring-inset ring-orange-500/20'
                          : 'bg-emerald-50 text-emerald-600 ring-1 ring-inset ring-emerald-500/20'
                      }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${emp.nextType === 'entrada' ? 'bg-orange-400' : 'bg-emerald-400'}`} />
                        {emp.nextType === 'entrada' ? 'Fora' : 'Presente'}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </main>

          <div className="pb-6 text-center">
            <Link href="/admin" className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-xs font-semibold text-slate-400 shadow-sm ring-1 ring-black/[0.04] transition hover:text-emerald-600 hover:shadow-md">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>
              Painel Admin
            </Link>
          </div>
        </div>
      )}

      {/* ─── PIN ─── */}
      {screen === 'pin' && (
        <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-50 px-6">
          <div className="w-full max-w-sm">
            <div className="flex flex-col items-center gap-2 mb-8">
              <div className={`flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br ${COLORS[empColorIndex]} text-2xl font-extrabold text-white shadow-xl`}>
                {selectedEmp && initials(selectedEmp.name)}
              </div>
              <p className="text-xl font-extrabold text-slate-800 mt-2">{selectedEmp?.name}</p>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3.5 py-1 text-xs font-semibold text-slate-500">
                Digite seu PIN para acessar
              </span>
            </div>

            <form onSubmit={handlePinSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-2 text-center">
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
                  className="w-full rounded-2xl border border-slate-200 bg-white px-5 py-4 text-center text-2xl font-bold tracking-[0.5em] text-slate-800 shadow-sm outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10"
                  placeholder="••••"
                />
                {pinError && (
                  <p className="mt-2 text-center text-sm font-medium text-red-500">{pinError}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={pin.length < 4 || verifyingPin}
                className="w-full rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 py-4 text-sm font-bold text-white shadow-lg shadow-emerald-500/20 transition active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {verifyingPin && (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                )}
                {verifyingPin ? 'Verificando...' : 'Entrar'}
              </button>

              <button
                type="button"
                onClick={goToSelect}
                className="w-full rounded-2xl bg-white py-3 text-sm font-semibold text-slate-500 ring-1 ring-black/[0.04] shadow-sm transition hover:text-slate-700 hover:shadow-md"
              >
                ← Voltar
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ─── DASHBOARD DO FUNCIONÁRIO ─── */}
      {screen === 'dashboard' && (
        <div className="flex min-h-screen flex-col bg-slate-100">
          {/* Header escuro com avatar e status */}
          <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-5 pb-10 pt-5 text-white">
            <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/[0.03]" />
            <div className="absolute -left-8 bottom-0 h-32 w-32 rounded-full bg-white/[0.03]" />

            {/* Top bar */}
            <div className="relative flex items-center justify-between mb-7">
              <button
                onClick={goToSelect}
                className="flex items-center gap-1.5 rounded-xl bg-white/10 px-3.5 py-2 text-xs font-semibold text-white/80 backdrop-blur-sm transition hover:bg-white/20"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" /></svg>
                Sair
              </button>
              <p className="text-2xl font-extrabold tabular-nums tracking-tight">
                {clock.slice(0, 5)}
              </p>
            </div>

            {/* Employee info */}
            <div className="relative flex items-center gap-4">
              <div className={`flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${COLORS[empColorIndex]} text-2xl font-extrabold text-white shadow-xl`}>
                {selectedEmp && initials(selectedEmp.name)}
              </div>
              <div className="min-w-0">
                <p className="text-[22px] font-extrabold leading-tight truncate">{selectedEmp?.name}</p>
                <p className="text-sm text-slate-400 capitalize mt-0.5">{dateStr}</p>
                {!loadingDashboard && dashboardData && (
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
                      dashboardData.today.currentStatus === 'presente'
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-slate-700 text-slate-300'
                    }`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${
                        dashboardData.today.currentStatus === 'presente' ? 'bg-emerald-400' : 'bg-slate-500'
                      }`} />
                      {dashboardData.today.currentStatus === 'presente' ? 'Presente' : 'Fora'}
                    </span>
                    {dashboardData.today.lastRecord && (
                      <span className="text-xs text-slate-500">
                        desde {new Date(dashboardData.today.lastRecord.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Cards — sobrepõe o header com margin negativo */}
          <div className="flex-1 px-4 -mt-5 space-y-3 pb-32">
            {loadingDashboard ? (
              <div className="flex flex-col items-center justify-center pt-20 gap-3">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-emerald-500" />
                <p className="text-sm text-slate-400">Carregando seus dados...</p>
              </div>
            ) : dashboardData ? (
              <>
                {/* Banco de Horas */}
                <div className={`rounded-3xl bg-white p-5 shadow-sm ring-1 ${dashboardData.month.orphanedIds?.length > 0 ? 'ring-amber-400/60' : 'ring-black/[0.04]'}`}>
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Banco de Horas</p>
                    <span className="text-xs font-semibold text-slate-400 capitalize">{dashboardData.month.monthName}</span>
                  </div>

                  {dashboardData.month.orphanedIds?.length > 0 && (
                    <div className="mb-4 flex items-start gap-2.5 rounded-2xl bg-amber-50 px-3.5 py-3 ring-1 ring-inset ring-amber-400/30">
                      <svg className="h-4 w-4 shrink-0 mt-0.5 text-amber-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" /></svg>
                      <div>
                        <p className="text-xs font-bold text-amber-700">Registros com pendência</p>
                        <p className="text-xs text-amber-600 mt-0.5">
                          {dashboardData.month.orphanedIds.length} registro{dashboardData.month.orphanedIds.length > 1 ? 's' : ''} sem par este mês. O saldo pode estar incorreto. Verifique os itens marcados no histórico.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-2 text-center mb-4">
                    <div className="rounded-2xl bg-slate-50 px-2 py-3">
                      <p className="text-lg font-extrabold text-slate-800 tabular-nums">{formatMinutes(dashboardData.month.workedMinutes)}</p>
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mt-0.5">Trabalhado</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 px-2 py-3">
                      <p className="text-lg font-extrabold text-slate-800 tabular-nums">{formatMinutes(dashboardData.month.expectedMinutes)}</p>
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mt-0.5">Esperado</p>
                    </div>
                    <div className={`rounded-2xl px-2 py-3 ${
                      dashboardData.month.balanceMinutes >= 0
                        ? 'bg-emerald-50'
                        : 'bg-red-50'
                    }`}>
                      <p className={`text-lg font-extrabold tabular-nums ${
                        dashboardData.month.balanceMinutes >= 0 ? 'text-emerald-600' : 'text-red-600'
                      }`}>
                        {dashboardData.month.balanceMinutes >= 0 ? '+' : '-'}{formatMinutes(Math.abs(dashboardData.month.balanceMinutes))}
                      </p>
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mt-0.5">Saldo</p>
                    </div>
                  </div>

                  {/* Barra de progresso */}
                  {dashboardData.month.expectedMinutes > 0 && (
                    <div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-700"
                          style={{ width: `${Math.min(100, (dashboardData.month.workedMinutes / dashboardData.month.expectedMinutes) * 100)}%` }}
                        />
                      </div>
                      <p className="mt-1.5 text-right text-[10px] font-semibold text-slate-400">
                        {Math.round((dashboardData.month.workedMinutes / dashboardData.month.expectedMinutes) * 100)}% do esperado
                      </p>
                    </div>
                  )}
                </div>

                {/* Registros de Hoje */}
                <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/[0.04]">
                  <p className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-400">Hoje</p>

                  {dashboardData.today.records.length === 0 ? (
                    <div className="py-5 text-center">
                      <p className="text-3xl mb-2">☕</p>
                      <p className="text-sm font-medium text-slate-500">Nenhum registro hoje ainda</p>
                      <p className="text-xs text-slate-400 mt-0.5">Registre sua entrada abaixo</p>
                    </div>
                  ) : (
                    <div className="relative">
                      <div className="absolute left-[19px] top-2 bottom-2 w-px bg-slate-100" />
                      <div className="space-y-3">
                        {dashboardData.today.records.map((r, i) => {
                          const isOrphan = dashboardData.month.orphanedIds?.includes(r.id);
                          return (
                          <div key={r.id} className={`flex items-center gap-3 ${isOrphan ? 'rounded-xl bg-amber-50 px-2 -mx-2' : ''}`}>
                            <div className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-white shadow-sm ${
                              isOrphan ? 'bg-amber-400' : r.type === 'entrada' ? 'bg-emerald-500' : 'bg-slate-400'
                            }`}>
                              {r.type === 'entrada' ? (
                                <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" /></svg>
                              ) : (
                                <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" /></svg>
                              )}
                            </div>
                            <div className="flex-1">
                              <p className={`text-sm font-bold ${isOrphan ? 'text-amber-700' : 'text-slate-700'}`}>
                                {r.type === 'entrada' ? 'Entrada' : 'Saída'}
                                {isOrphan && <span className="ml-1.5 text-[10px] font-bold text-amber-500">sem par</span>}
                              </p>
                              <p className="text-xs text-slate-400">
                                {new Date(r.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                            {i === dashboardData.today.records.length - 1 && !isOrphan && (
                              <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-600 ring-1 ring-inset ring-emerald-500/20">
                                último
                              </span>
                            )}
                          </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Histórico do mês */}
                {dashboardData.month.records.length > dashboardData.today.records.length && (
                  <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/[0.04]">
                    <button
                      onClick={() => setShowAllRecords((v) => !v)}
                      className="flex w-full items-center justify-between"
                    >
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                        Histórico do Mês
                      </p>
                      <svg
                        className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${showAllRecords ? 'rotate-180' : ''}`}
                        fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                      </svg>
                    </button>

                    {showAllRecords && (
                      <div className="mt-4 space-y-1">
                        {groupByDay(
                          dashboardData.month.records.filter(
                            (r) => !dashboardData.today.records.find((tr) => tr.id === r.id)
                          )
                        ).map(([dayLabel, dayRecords]) => (
                          <div key={dayLabel} className="mb-3">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-300 mb-2 px-1">{dayLabel}</p>
                            <div className="space-y-1">
                              {dayRecords.map((r) => {
                                const isOrphan = dashboardData.month.orphanedIds?.includes(r.id);
                                return (
                                <div key={r.id} className={`flex items-center gap-3 rounded-xl px-3 py-2 ${isOrphan ? 'bg-amber-50 ring-1 ring-inset ring-amber-400/30' : 'hover:bg-slate-50'}`}>
                                  <span className={`h-2 w-2 rounded-full ${isOrphan ? 'bg-amber-400' : r.type === 'entrada' ? 'bg-emerald-400' : 'bg-slate-300'}`} />
                                  <span className={`flex-1 text-xs font-medium ${isOrphan ? 'text-amber-700' : 'text-slate-600'}`}>
                                    {r.type === 'entrada' ? 'Entrada' : 'Saída'}
                                    {isOrphan && <span className="ml-1.5 text-[10px] text-amber-500 font-bold">sem par</span>}
                                  </span>
                                  <span className="text-xs tabular-nums text-slate-400">
                                    {new Date(r.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="rounded-3xl bg-white p-8 text-center shadow-sm">
                <p className="text-slate-400 text-sm">Não foi possível carregar os dados.</p>
                <button
                  onClick={() => fetchDashboard(selectedEmp.id, employeeToken)}
                  className="mt-3 text-sm font-semibold text-emerald-600"
                >
                  Tentar novamente
                </button>
              </div>
            )}
          </div>

          {/* Botão fixo de bater ponto */}
          <div className="fixed inset-x-0 bottom-0 bg-white/90 backdrop-blur-xl border-t border-slate-100 p-4">
            <button
              onClick={handlePunchFromDashboard}
              disabled={loadingDashboard}
              className={`w-full rounded-2xl py-4 text-sm font-extrabold text-white shadow-xl transition active:scale-[0.97] disabled:opacity-40 flex items-center justify-center gap-3 ${
                dashboardData?.today.currentStatus === 'presente'
                  ? 'bg-gradient-to-r from-slate-700 to-slate-800 shadow-slate-800/20'
                  : 'bg-gradient-to-r from-emerald-600 to-teal-600 shadow-emerald-500/25'
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
        <div className="relative flex min-h-screen flex-col bg-black">
          <div className="pointer-events-none absolute inset-x-0 top-0 z-10 bg-gradient-to-b from-black/70 via-black/30 to-transparent px-6 pb-16 pt-8">
            <p className="text-center text-xl font-extrabold text-white drop-shadow-lg">{selectedEmp?.name}</p>
            <div className="mt-3 flex justify-center">
              <span className={`inline-flex items-center gap-2 rounded-full px-5 py-2 text-xs font-bold text-white shadow-xl backdrop-blur-sm ${
                nextType === 'entrada' ? 'bg-emerald-500/80 shadow-emerald-500/25' : 'bg-red-500/80 shadow-red-500/25'
              }`}>
                {nextType === 'entrada' ? '📥 Registrar Entrada' : '📤 Registrar Saída'}
              </span>
            </div>
          </div>
          <video ref={videoRef} autoPlay playsInline muted className="flex-1 object-cover" />
          <canvas ref={canvasRef} className="hidden" />
          <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/80 to-transparent px-8 pb-10 pt-20">
            <div className="flex items-center justify-between max-w-md mx-auto">
              <button
                onClick={employeeToken ? goToDashboard : goToSelect}
                className="rounded-full bg-white/15 px-6 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/25 ring-1 ring-white/20"
              >
                ← Voltar
              </button>
              <button onClick={takePhoto} disabled={saving} className="h-20 w-20 rounded-full border-[6px] border-white bg-white shadow-2xl transition-transform active:scale-90 disabled:opacity-50" aria-label="Tirar foto" />
              <div className="w-24" />
            </div>
          </div>
        </div>
      )}

      {/* ─── CONFIRMAÇÃO ─── */}
      {screen === 'confirm' && (
        <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-50 px-6">
          <div className="flex flex-col items-center gap-5 w-full max-w-sm">
            <div className={`flex h-20 w-20 items-center justify-center rounded-3xl shadow-xl ${
              nextType === 'entrada'
                ? 'bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-emerald-500/25'
                : 'bg-gradient-to-br from-red-400 to-red-600 shadow-red-500/25'
            }`}>
              <svg className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
            </div>
            {photo && <img src={photo} alt="" className="h-28 w-28 rounded-3xl border-4 border-white object-cover shadow-xl" />}
            <div className="text-center">
              <p className="text-2xl font-extrabold text-slate-800">{savedRecord?.employee_name}</p>
              <p className={`mt-2 font-bold ${nextType === 'entrada' ? 'text-emerald-600' : 'text-red-600'}`}>
                {nextType === 'entrada' ? '📥 Entrada registrada' : '📤 Saída registrada'}
              </p>
              <p className="mt-3 text-sm text-slate-400">
                {savedRecord && new Date(savedRecord.timestamp).toLocaleString('pt-BR', {
                  weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
                  hour: '2-digit', minute: '2-digit', second: '2-digit',
                })}
              </p>
            </div>
            <button
              onClick={employeeToken ? goToDashboard : goToSelect}
              className="mt-2 w-full rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 py-4 text-sm font-bold text-white shadow-lg shadow-emerald-500/20 transition active:scale-[0.97]"
            >
              {employeeToken ? 'Ver meu ponto' : 'Concluído'}
            </button>
            <div className="w-full">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-1000 ease-linear" style={{ width: `${(countdown / 6) * 100}%` }} />
              </div>
              <p className="mt-2 text-center text-xs text-slate-400">Voltando em {countdown}s</p>
            </div>
          </div>
        </div>
      )}
    </>
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
    const key = new Date(r.timestamp).toLocaleDateString('pt-BR', {
      weekday: 'short', day: '2-digit', month: 'short',
    });
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(r);
  }
  return [...map.entries()];
}
