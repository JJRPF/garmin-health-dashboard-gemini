'use client';

import { useEffect, useState } from 'react';
import {
  Lightbulb, TrendingDown, TrendingUp, AlertTriangle,
  CheckCircle, Info, Zap, Moon, Battery, Brain, ChevronDown, ChevronUp,
} from 'lucide-react';
import type { DailyMetrics, UserProfile } from '@/lib/types';
import type { ProfileBenchmarks } from '@/lib/benchmarks';
import { format } from 'date-fns';
import { useInsightsHistory, analyzePatterns } from '@/lib/useInsightsHistory';
import type { InsightHistoryEntry } from '@/lib/useInsightsHistory';

// ── Types ─────────────────────────────────────────────────────────────────────

type InsightType = 'success' | 'warning' | 'danger' | 'info';

interface Insight {
  id: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Icon: React.ElementType<any>;
  text: string;
  subtext?: string;
  type: InsightType;
}

const STYLES: Record<InsightType, { color: string; bg: string; border: string }> = {
  success: { color: '#4ade80', bg: '#4ade8010', border: '#4ade8028' },
  warning: { color: '#facc15', bg: '#facc1510', border: '#facc1528' },
  danger:  { color: '#f87171', bg: '#f8717110', border: '#f8717128' },
  info:    { color: '#818cf8', bg: '#818cf810', border: '#818cf828' },
};

const DOT_COLOR: Record<InsightType, string> = {
  success: '#4ade80',
  warning: '#facc15',
  danger:  '#f87171',
  info:    '#818cf8',
};

const SEVERITY: Record<InsightType, number> = { danger: 0, warning: 1, success: 2, info: 3 };

// ── Rule engine ───────────────────────────────────────────────────────────────

function buildInsights(
  data: DailyMetrics,
  profile: UserProfile | null,
): Insight[] {
  const pool: Insight[] = [];
  const sleepHours = Math.round((data.sleep.totalSleepSeconds / 3600) * 10) / 10;
  const todayStrain = data.activities.reduce((s, a) => s + a.strain, 0);

  // ── 1. Recovery summary (always) ────────────────────────────────────────────
  if (data.recovery.score >= 67) {
    pool.push({
      id: 'recovery',
      Icon: CheckCircle,
      type: 'success',
      text: `Buena recuperación — ${data.recovery.score}%`,
      subtext: profile?.goal === 'performance'
        ? 'Condiciones óptimas para un entrenamiento de calidad o alta intensidad.'
        : 'Estás en buenas condiciones. Aprovecha el día.',
    });
  } else if (data.recovery.score >= 34) {
    pool.push({
      id: 'recovery',
      Icon: AlertTriangle,
      type: 'warning',
      text: `Recuperación moderada — ${data.recovery.score}%`,
      subtext: 'Opta por actividad ligera o técnica. Evita el esfuerzo máximo hoy.',
    });
  } else {
    pool.push({
      id: 'recovery',
      Icon: AlertTriangle,
      type: 'danger',
      text: `Recuperación baja — ${data.recovery.score}%`,
      subtext: 'Prioriza el descanso: sueño, hidratación y actividad mínima.',
    });
  }

  // ── 2. HRV vs weekly average ────────────────────────────────────────────────
  if (data.hrv.weeklyAverage > 0 && data.hrv.lastNight > 0) {
    const ratio = data.hrv.lastNight / data.hrv.weeklyAverage;
    if (ratio < 0.82) {
      const drop = Math.round((1 - ratio) * 100);
      pool.push({
        id: 'hrv_low',
        Icon: TrendingDown,
        type: 'warning',
        text: `VFC anoche ${data.hrv.lastNight} ms — ${drop}% por debajo de tu media`,
        subtext: 'El sistema nervioso autónomo muestra estrés. Reduce la intensidad de entrenamiento.',
      });
    } else if (ratio > 1.10) {
      const rise = Math.round((ratio - 1) * 100);
      pool.push({
        id: 'hrv_high',
        Icon: TrendingUp,
        type: 'success',
        text: `VFC en alza — ${data.hrv.lastNight} ms (+${rise}% vs tu media)`,
        subtext: 'Señal positiva de adaptación. Tu sistema nervioso está bien recuperado.',
      });
    }
  }

  // ── 3. Sleep duration ───────────────────────────────────────────────────────
  if (sleepHours < 6) {
    pool.push({
      id: 'sleep_low',
      Icon: Moon,
      type: 'danger',
      text: `Solo ${sleepHours}h de sueño anoche`,
      subtext: 'Déficit severo. Afecta la recuperación muscular, el cortisol y el rendimiento cognitivo.',
    });
  } else if (sleepHours < 6.5) {
    pool.push({
      id: 'sleep_short',
      Icon: Moon,
      type: 'warning',
      text: `Sueño corto — ${sleepHours}h`,
      subtext: 'Intenta ir a dormir antes esta noche para compensar.',
    });
  }

  // ── 4. Body Battery ─────────────────────────────────────────────────────────
  if (data.bodyBattery.isAvailable) {
    if (data.bodyBattery.current < 25) {
      pool.push({
        id: 'battery_critical',
        Icon: Battery,
        type: 'danger',
        text: `Batería corporal crítica — ${data.bodyBattery.current}%`,
        subtext: 'Evita el ejercicio intenso hasta recuperar energía.',
      });
    } else if (data.bodyBattery.current < 40) {
      pool.push({
        id: 'battery_low',
        Icon: Battery,
        type: 'warning',
        text: `Batería corporal baja — ${data.bodyBattery.current}%`,
        subtext: 'Descanso activo o actividad suave recomendada.',
      });
    }
  }

  // ── 5. Stress load ──────────────────────────────────────────────────────────
  if (data.stress.highStressPercentage > 50) {
    pool.push({
      id: 'stress_high',
      Icon: Brain,
      type: 'warning',
      text: `${data.stress.highStressPercentage}% del día con estrés alto`,
      subtext: 'Técnicas de respiración o meditación breve pueden ayudar a equilibrar.',
    });
  } else if (data.stress.average > 60 && data.stress.highStressPercentage <= 50) {
    pool.push({
      id: 'stress_avg',
      Icon: Brain,
      type: 'info',
      text: `Estrés promedio elevado (${data.stress.average}/100)`,
      subtext: 'Una sesión corta de relajación activa puede acelerar la recuperación.',
    });
  }

  // ── 6. Weekly recovery decline ──────────────────────────────────────────────
  const recTrend = data.weeklyTrend.recovery.filter(v => v > 0);
  if (recTrend.length >= 3) {
    const last3 = recTrend.slice(-3);
    if (last3[0] > last3[1] && last3[1] > last3[2]) {
      pool.push({
        id: 'trend_down',
        Icon: TrendingDown,
        type: 'warning',
        text: '3 días consecutivos de recuperación bajando',
        subtext: 'Señal de acumulación de fatiga. Reduce el volumen de entrenamiento esta semana.',
      });
    }
  }

  // ── 7. Goal-specific tips ───────────────────────────────────────────────────
  if (profile?.goal === 'weight_loss' && data.steps < 6000) {
    pool.push({
      id: 'steps_goal',
      Icon: Zap,
      type: 'info',
      text: `${data.steps.toLocaleString('es')} pasos hoy — objetivo incompleto`,
      subtext: 'Un paseo de 20–30 min contribuye significativamente a tu objetivo de peso.',
    });
  }

  if (profile?.goal === 'performance' && data.recovery.score >= 67 && todayStrain < 5) {
    pool.push({
      id: 'perf_ready',
      Icon: Zap,
      type: 'success',
      text: 'Día ideal para una sesión de alto rendimiento',
      subtext: 'Tu recuperación soporta trabajo de calidad: fuerza, velocidad o técnica avanzada.',
    });
  }

  if (profile?.goal === 'recovery' && data.recovery.score < 34) {
    pool.push({
      id: 'goal_recovery',
      Icon: Info,
      type: 'info',
      text: 'Hoy es el día perfecto para tu objetivo de recuperación',
      subtext: 'Sueño temprano, hidratación, nutrición anti-inflamatoria y sin alcohol.',
    });
  }

  // ── Prioritize: recovery first, then by severity ────────────────────────────
  const [first, ...rest] = pool;
  const sorted = [first, ...rest.sort((a, b) => SEVERITY[a.type] - SEVERITY[b.type])];
  return sorted.slice(0, 3);
}

// ── History dot timeline ───────────────────────────────────────────────────────

function HistoryTimeline({ entries }: { entries: InsightHistoryEntry[] }) {
  const today = format(new Date(), 'yyyy-MM-dd');
  // build last 14 days slots
  const slots = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    const dateStr = format(d, 'yyyy-MM-dd');
    const entry = entries.find(e => e.date === dateStr);
    const isToday = dateStr === today;
    return { dateStr, entry, isToday, dayLabel: format(d, 'd') };
  });

  return (
    <div className="mt-3 pt-3 border-t border-border">
      <p className="text-[10px] text-muted uppercase tracking-widest mb-2">Últimos 14 días</p>
      <div className="flex gap-1 items-end">
        {slots.map(({ dateStr, entry, isToday, dayLabel }) => (
          <div key={dateStr} className="flex-1 flex flex-col items-center gap-1">
            <div
              className="w-full rounded-full"
              style={{
                height: 8,
                backgroundColor: entry
                  ? DOT_COLOR[entry.worstType]
                  : isToday ? '#333' : '#1f1f1f',
                opacity: entry ? 1 : isToday ? 0.6 : 0.3,
              }}
              title={entry
                ? `${dateStr}: recuperación ${entry.recovery}%, sueño ${entry.sleepHours.toFixed(1)}h`
                : dateStr}
            />
            {isToday && (
              <span className="text-[8px] text-muted leading-none">{dayLabel}</span>
            )}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3 mt-2 flex-wrap">
        {(['success', 'warning', 'danger'] as InsightType[]).map(t => (
          <div key={t} className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: DOT_COLOR[t] }} />
            <span className="text-[10px] text-muted">
              {t === 'success' ? 'Buena' : t === 'warning' ? 'Moderada' : 'Baja'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Component ──────────────────────────────────────────────────────────────────

interface Props {
  data: DailyMetrics;
  profile: UserProfile | null;
  benchmarks: ProfileBenchmarks | null;
}

export default function InsightsCard({ data, profile }: Props) {
  const insights = buildInsights(data, profile);
  const { entries, saveToday, loaded } = useInsightsHistory();
  const [showHistory, setShowHistory] = useState(false);

  // Save today's insights once data is ready
  useEffect(() => {
    if (!loaded || insights.length === 0) return;
    const sleepHours = data.sleep.totalSleepSeconds / 3600;
    saveToday(
      insights.map(i => i.id),
      insights.map(i => i.type),
      data.recovery.score,
      sleepHours,
      data.hrv.lastNight,
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

  if (insights.length === 0) return null;

  const patterns = analyzePatterns(entries);
  const hasHistory = entries.length >= 2;

  return (
    <div className="card">
      <div className="card-header mb-3">
        <Lightbulb size={14} className="text-secondary" />
        <span>Insights del día</span>
        <span className="ml-auto text-[10px] text-muted">{insights.length} recomendaciones</span>
      </div>

      <div className="flex flex-col gap-2">
        {insights.map(({ id, Icon, type, text, subtext }) => {
          const s = STYLES[type];
          return (
            <div
              key={id}
              className="flex gap-3 rounded-xl px-3 py-2.5 border"
              style={{ backgroundColor: s.bg, borderColor: s.border }}
            >
              <div className="mt-0.5 flex-shrink-0">
                <Icon size={14} style={{ color: s.color }} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-primary leading-snug">{text}</p>
                {subtext && (
                  <p className="text-[11px] text-secondary mt-0.5 leading-snug">{subtext}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Pattern summary */}
      {patterns.length > 0 && (
        <div className="mt-3 pt-3 border-t border-border flex flex-col gap-1.5">
          {patterns.map((p, i) => (
            <div key={i} className="flex gap-2 items-start">
              <Info size={11} className="text-muted mt-0.5 flex-shrink-0" />
              <p className="text-[11px] text-secondary leading-snug">{p}</p>
            </div>
          ))}
        </div>
      )}

      {/* History toggle */}
      {hasHistory && (
        <button
          onClick={() => setShowHistory(v => !v)}
          className="flex items-center gap-1 text-[11px] text-muted hover:text-primary transition-colors mt-3 pt-3 border-t border-border w-full"
        >
          {showHistory ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
          Historial de recuperación
          <span className="ml-auto text-[10px]">{entries.length} días</span>
        </button>
      )}

      {showHistory && <HistoryTimeline entries={entries} />}
    </div>
  );
}
