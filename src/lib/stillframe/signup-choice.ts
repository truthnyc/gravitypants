import { PLANS, type Billing, type PlanId } from "./plans-config";

export type SignupChoice = { plan: PlanId; billing: Billing };

export function rememberSignupChoice(userId: string, choice: SignupChoice) {
  localStorage.setItem(`gravity-pants:plan-choice:${userId}`, JSON.stringify(choice));
}

export function getSignupChoice(userId: string): SignupChoice | null {
  try {
    const saved = JSON.parse(localStorage.getItem(`gravity-pants:plan-choice:${userId}`) ?? "null");
    const plan = PLANS.find((p) => p.id === saved?.plan);
    if (plan && (saved.billing === "monthly" || (saved.billing === "yearly" && plan.yearly !== null))) {
      return { plan: plan.id, billing: saved.billing };
    }
  } catch { /* Ignore invalid old preferences. */ }
  return null;
}