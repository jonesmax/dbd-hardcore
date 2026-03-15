import type { KillerDefinition, Tier } from "@/types";

const tierBaseCost: Record<Tier, number> = {
  "S+": 12,
  "S": 10,
  "A": 8,
  "B": 6,
  "C": 5,
  "Special/New": 8,
};

function k(name: string, tier: Tier): KillerDefinition {
  return {
    id: name.toLowerCase().replace(/\s+/g, "-").replace(/[\/]/g, "-"),
    name,
    tier,
    baseCost: tierBaseCost[tier],
  };
}

export const KILLER_DEFINITIONS: KillerDefinition[] = [
  // S+ Tier
  k("Nurse", "S+"),
  k("Blight", "S+"),
  k("Hillbilly", "S+"),
  // S Tier
  k("The First", "S"),
  k("The Krasue", "S"),
  k("The Ghoul", "S"),
  k("The Spirit", "S"),
  k("Lich", "S"),
  k("Dark Lord", "S"),
  k("Animatronic", "S"),
  k("Mastermind", "S"),
  k("Huntress", "S"),
  k("Xenomorph", "S"),
  k("Executioner", "S"),
  k("Nightmare", "S"),
  // A Tier
  k("Good Guy", "A"),
  k("Houndmaster", "A"),
  k("Unknown", "A"),
  k("Trickster", "A"),
  k("Knight", "A"),
  k("Doctor", "A"),
  k("Nemesis", "A"),
  k("Artist", "A"),
  k("Singularity", "A"),
  k("Dredge", "A"),
  // B Tier
  k("Legion", "B"),
  k("Plague", "B"),
  k("Hag", "B"),
  k("Deathslinger", "B"),
  k("Oni", "B"),
  k("Twins", "B"),
  k("Pig", "B"),
  k("Clown", "B"),
  k("Ghost Face", "B"),
  // C Tier
  k("Cannibal", "C"),
  k("Shape", "C"),
  k("Demogorgon", "C"),
  k("Onryō", "C"),
  k("Cenobite", "C"),
  k("Trapper", "C"),
  k("Skull Merchant", "C"),
];
