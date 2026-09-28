import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getSignupChoice, type SignupChoice } from "./signup-choice";

/** The plan the signed-in user picked when signing up (a suggestion only, never paid access). */
export function useSignupChoice(): SignupChoice | null {
  const [choice, setChoice] = useState<SignupChoice | null>(null);
  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => { if (data.user) setChoice(getSignupChoice(data.user.id)); });
  }, []);
  return choice;
}
