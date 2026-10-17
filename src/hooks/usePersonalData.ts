import { useContext } from "react";
import { PersonalContext } from "../context/personal-context";

export function usePersonalData() {
  const value = useContext(PersonalContext);
  if (!value) throw new Error("Personal data requires PersonalProvider.");
  return value;
}
