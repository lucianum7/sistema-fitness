import { SettingsPanel } from "@/components/settings-panel";
import { calculateTargets } from "@/lib/fitness/calculations";
import { requireUser } from "@/lib/server/auth";
import { profileToInput } from "@/lib/server/plans";

export default async function ConfiguracoesPage() {
  const user = await requireUser();
  const metrics = user.profile ? calculateTargets(profileToInput(user.profile, user.name)) : null;

  return (
    <div className="grid gap-5">
      <header>
        <p className="text-sm font-semibold text-[var(--primary)]">Conta e segurança</p>
        <h1 className="text-3xl font-black md:text-4xl">Configurações</h1>
      </header>
      <SettingsPanel
        userName={user.name}
        userEmail={user.email}
        role={user.role}
        profile={user.profile ? {
          age: user.profile.age,
          sex: user.profile.sex,
          heightCm: user.profile.heightCm,
          weightKg: user.profile.weightKg,
          bodyFatPct: user.profile.bodyFatPct,
          objective: user.profile.objective,
          activityLevel: user.profile.activityLevel,
        } : null}
        metrics={metrics ? {
          bmi: metrics.bmi,
          bmiCategory: metrics.bmiCategory,
          bmr: metrics.bmr,
          tdee: metrics.tdee,
          activityLabel: metrics.activityLabel,
          activityFactor: metrics.activityFactor,
          goalAdjustmentPct: metrics.goalAdjustmentPct,
          estimatedWeeklyWeightChangeKg: metrics.estimatedWeeklyWeightChangeKg,
          formulas: metrics.formulas,
          targets: metrics.targets,
        } : null}
        subscription={user.subscription ? {
          status: user.subscription.status,
          currentPeriodEnd: user.subscription.currentPeriodEnd.toISOString(),
          providerRef: user.subscription.providerRef,
        } : null}
      />
    </div>
  );
}
