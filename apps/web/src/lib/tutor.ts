"use client";

import { useAuth } from "./auth";

export type TutorGender = "female" | "male";

export const DEFAULT_TUTOR: Record<TutorGender, string> = { female: "Asha", male: "Arjun" };

export const NAME_IDEAS: Record<TutorGender, string[]> = {
  female: ["Asha", "Meera", "Priya", "Kavya", "Ananya"],
  male: ["Arjun", "Kabir", "Rohan", "Vikram", "Aditya"],
};

export function useTutor() {
  const { user } = useAuth();
  return {
    name: user?.tutor_name ?? DEFAULT_TUTOR.female,
    gender: (user?.tutor_gender ?? "female") as TutorGender,
  };
}
