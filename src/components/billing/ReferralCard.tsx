import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { GP_ORIGIN } from "@/lib/site/brand-site";
import { REFERRAL_NOTE } from "@/lib/stillframe/plans-config";

export type Referral = { code: string; credits: number; referred: number };

/** The signed-in person's referral link and free-export balance (rules live in SQL record_export). */
export function useReferral() {
  return useQuery({
    queryKey: ["referral"],
    queryFn: async (): Promise<Referral | null> => {
      const { data, error } = await supabase.rpc("my_referral" as never);
      if (error) throw error;
      return data as unknown as Referral | null;
    },
  });
}

export const referralLink = (code: string) => `${GP_ORIGIN}/signup?ref=r-${code}`;

export function ReferralCard() {
  const { data } = useReferral();
  if (!data) return null;
  const link = referralLink(data.code);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Referral link copied");
    } catch {
      toast.error("Select the link and copy it.");
    }
  };
  return (
    <section className="acct-card" data-testid="referral-card">
      <h2 className="text-[17px] font-semibold">Give a reel, get a reel</h2>
      <p className="mt-1 text-[14px] text-secondary-text">{REFERRAL_NOTE}</p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input readOnly value={link} onFocus={(e) => e.currentTarget.select()} aria-label="Your referral link"
          className="h-10 min-w-0 flex-1 rounded-[4px] border border-ap-hairline bg-ap-panel px-3 text-[14px]" />
        <Button onClick={() => void copy()} data-cta="referral-copy">Copy link</Button>
      </div>
      <p className="nums mt-3 text-[14px]">
        Free exports from referrals: <b>{data.credits}</b>
        <span className="text-secondary-text"> · Friends who made their first reel: {data.referred}</span>
      </p>
    </section>
  );
}

/** Short reminder shown after an export finishes. */
export function ReferralNote() {
  const { data } = useReferral();
  if (!data) return null;
  return (
    <p className="text-[13px] text-ap-muted">
      Give a reel, get a reel: share{" "}
      <button type="button" className="text-ap-blue" data-cta="export-referral-copy"
        onClick={() => void navigator.clipboard.writeText(referralLink(data.code)).then(() => toast.success("Referral link copied"), () => undefined)}>
        your referral link
      </button>{" "}
      and get a free export without a watermark when a friend makes their first reel.
    </p>
  );
}
