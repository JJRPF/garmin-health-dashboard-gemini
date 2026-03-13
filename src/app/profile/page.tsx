'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { ArrowLeft, User, Trash2, ChevronRight, Scale, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { useProfile } from '@/lib/useProfile';
import ProfileForm from '@/components/ProfileForm';
import WeightLog from '@/components/WeightLog';
import BottomNav from '@/components/BottomNav';
import NotificationSettings from '@/components/NotificationSettings';
import VO2maxCard from '@/components/VO2maxCard';
import TrainingZonesCard from '@/components/TrainingZonesCard';
import type { UserProfile } from '@/lib/types';
import { getWeightBenchmark } from '@/lib/benchmarks';

const FITNESS_LABEL: Record<string, string> = {
  beginner:     'Principiante',
  intermediate: 'Intermedio',
  advanced:     'Avanzado',
  athlete:      'Atleta',
};

const GOAL_LABEL: Record<string, string> = {
  recovery:       'Recuperación',
  performance:    'Rendimiento',
  weight_loss:    'Pérdida de peso',
  general_health: 'Salud general',
};

const WEIGHT_GOAL_LABEL: Record<string, string> = {
  lose:     'Objetivo: perder peso',
  maintain: 'Objetivo: mantener peso',
  gain:     'Objetivo: ganar peso',
};

export default function ProfilePage() {
  const router = useRouter();
  const { profile, saveProfile, clearProfile, loaded } = useProfile();

  const [lastRHR, setLastRHR] = useState(0);
  const [observedMaxHR, setObservedMaxHR] = useState<number | undefined>(undefined);
  useEffect(() => {
    const rhr = parseInt(localStorage.getItem('garmin_last_rhr') ?? '0', 10);
    const maxHR = parseInt(localStorage.getItem('garmin_observed_max_hr') ?? '0', 10);
    if (rhr > 0) setLastRHR(rhr);
    if (maxHR > 100) setObservedMaxHR(maxHR);
  }, []);

  if (!loaded) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-border border-t-primary animate-spin" />
      </div>
    );
  }

  const handleSave = (p: UserProfile) => {
    saveProfile(p);
    router.push('/');
  };

  const handleClear = () => {
    if (confirm('¿Eliminar tu perfil? Se borrarán todos tus datos locales.')) {
      clearProfile();
    }
  };

  const wb = profile ? getWeightBenchmark(profile) : null;
  const weightGoal = profile?.weightGoal;

  // BMI scale position (0-100%) for the visual bar
  // We map BMI 15–40 to 0–100%
  const bmiBarPct = wb ? Math.min(100, Math.max(0, ((wb.bmi - 15) / 25) * 100)) : 0;

  return (
    <div className="min-h-screen bg-bg">
      <header className="sticky top-0 z-40 bg-bg/95 backdrop-blur border-b border-border">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/" className="p-1.5 rounded-lg hover:bg-surface text-secondary hover:text-primary transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <User size={16} className="text-secondary" />
          <h1 className="text-sm font-bold text-primary">Mi perfil</h1>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 pb-28 pt-4 flex flex-col gap-4">

        {/* Summary card if profile exists */}
        {profile && (
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
              <User size={22} className="text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-primary truncate">
                {profile.name ?? (profile.sex === 'male' ? 'Hombre' : 'Mujer')}, {profile.age} años
              </p>
              <p className="text-xs text-secondary">
                {FITNESS_LABEL[profile.fitnessLevel]} · {GOAL_LABEL[profile.goal]}
              </p>
              {wb && (
                <p className="text-xs mt-0.5" style={{ color: wb.color }}>
                  {profile.weight} kg · IMC {wb.bmi} · {wb.label}
                </p>
              )}
            </div>
            <ChevronRight size={16} className="text-muted flex-shrink-0" />
          </div>
        )}

        {/* ── BMI card — only when height + weight are set ─────────────── */}
        {wb && (
          <div className="card">
            <div className="card-header mb-4">
              <Scale size={14} className="text-secondary" />
              <span>Índice de Masa Corporal</span>
              <span
                className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{ color: wb.color, backgroundColor: `${wb.color}18` }}
              >
                {wb.label}
              </span>
            </div>

            {/* Large BMI value */}
            <div className="flex items-end gap-3 mb-4">
              <span className="text-5xl font-black leading-none" style={{ color: wb.color }}>
                {wb.bmi}
              </span>
              <div className="mb-1">
                <p className="text-sm text-secondary leading-tight">{wb.description}</p>
                {wb.direction !== 'ok' && (
                  <p className="text-xs text-muted mt-0.5">
                    Rango saludable: {wb.idealMin}–{wb.idealMax} kg para tu talla
                  </p>
                )}
              </div>
            </div>

            {/* IMC visual bar */}
            <div className="mb-4">
              <div className="relative h-3 rounded-full overflow-hidden mb-1" style={{
                background: 'linear-gradient(to right, #38bdf8 0%, #4ade80 25%, #facc15 55%, #fb923c 75%, #f87171 100%)',
              }}>
                {/* User's position dot */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-bg shadow-lg transition-all"
                  style={{
                    left: `${bmiBarPct}%`,
                    transform: 'translateX(-50%) translateY(-50%)',
                    backgroundColor: wb.color,
                    boxShadow: `0 0 6px ${wb.color}88`,
                  }}
                />
              </div>
              {/* Labels */}
              <div className="flex justify-between text-[9px] text-muted px-0.5">
                <span>15</span>
                <span className="text-[#38bdf8]">18.5</span>
                <span className="text-[#4ade80]">25</span>
                <span className="text-[#facc15]">30</span>
                <span className="text-[#fb923c]">35</span>
                <span>40</span>
              </div>
              <div className="flex justify-between text-[9px] text-muted mt-0.5 px-0.5">
                <span></span>
                <span className="text-[#38bdf8]">Bajo</span>
                <span className="text-[#4ade80]">Normal</span>
                <span className="text-[#facc15]">Sobre</span>
                <span className="text-[#fb923c]">Ob.I</span>
                <span></span>
              </div>
            </div>

            {/* Weight goal context */}
            {weightGoal && (
              <div className="flex items-center gap-2 py-2 px-3 rounded-xl bg-bg border border-border mb-3">
                {weightGoal === 'lose'
                  ? <TrendingDown size={14} className="text-yellow-400" />
                  : weightGoal === 'gain'
                  ? <TrendingUp size={14} className="text-sky-400" />
                  : <Minus size={14} className="text-green-400" />}
                <span className="text-xs text-secondary">
                  {WEIGHT_GOAL_LABEL[weightGoal]}
                </span>
                {weightGoal === 'lose' && wb.direction === 'ok' && (
                  <span className="text-xs text-green-400 ml-auto">✓ Ya en rango</span>
                )}
                {weightGoal === 'lose' && wb.distanceKg > 0 && (
                  <span className="text-xs text-muted ml-auto">−{wb.distanceKg} kg al objetivo</span>
                )}
                {weightGoal === 'gain' && wb.distanceKg > 0 && (
                  <span className="text-xs text-muted ml-auto">+{wb.distanceKg} kg al objetivo</span>
                )}
              </div>
            )}

            {/* Athlete caveat */}
            {wb.athleteCaveat && (
              <p className="text-[10px] text-muted border-t border-border pt-3">
                ⚠ Para deportistas con alta masa muscular, el IMC puede sobreestimar el porcentaje de grasa. Considera mediciones de composición corporal.
              </p>
            )}

            {/* Population context */}
            {!wb.athleteCaveat && (
              <p className="text-[10px] text-muted border-t border-border pt-3">
                Clasificación según la Organización Mundial de la Salud (OMS). Úsala como referencia, no como diagnóstico.
              </p>
            )}
          </div>
        )}

        {/* Hint when no weight data yet */}
        {profile && !wb && (
          <div className="card border-dashed">
            <div className="flex items-center gap-3">
              <Scale size={16} className="text-muted" />
              <div>
                <p className="text-sm text-secondary font-medium">Añade talla y peso</p>
                <p className="text-xs text-muted">Para ver tu IMC y rango de peso saludable.</p>
              </div>
            </div>
          </div>
        )}

        {/* Weight history log */}
        <WeightLog profile={profile} />

        {/* ── Fitness metrics (VO2max + Training Zones) — only when profile + HR data available ── */}
        {profile && lastRHR > 0 && (
          <>
            <div className="mt-2 mb-1">
              <p className="text-xs font-semibold text-secondary uppercase tracking-widest">
                Forma física
              </p>
            </div>
            <VO2maxCard
              restingHR={lastRHR}
              age={profile.age}
              sex={profile.sex}
              observedMaxHR={observedMaxHR}
            />
            <TrainingZonesCard
              restingHR={lastRHR}
              age={profile.age}
              observedMaxHR={observedMaxHR}
            />
          </>
        )}

        {/* Hint when no HR data yet */}
        {profile && lastRHR === 0 && (
          <div className="card border-dashed">
            <div className="flex items-center gap-3">
              <User size={16} className="text-muted" />
              <div>
                <p className="text-sm text-secondary font-medium">VO2max y zonas</p>
                <p className="text-xs text-muted">Disponibles tras la primera carga de datos desde el Dashboard.</p>
              </div>
            </div>
          </div>
        )}

        {/* Notification settings */}
        <NotificationSettings />

        {/* Form */}
        <div className="card">
          <h2 className="text-xs font-semibold text-secondary uppercase tracking-widest mb-4">
            {profile ? 'Actualizar perfil' : 'Crear perfil'}
          </h2>
          <ProfileForm
            initial={profile ?? undefined}
            onSave={handleSave}
            ctaLabel={profile ? 'Actualizar perfil' : 'Guardar perfil'}
          />
        </div>

        {/* Danger zone */}
        {profile && (
          <button
            onClick={handleClear}
            className="flex items-center gap-2 text-xs text-muted hover:text-recovery-red transition-colors mx-auto py-2"
          >
            <Trash2 size={13} />
            Eliminar perfil
          </button>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
