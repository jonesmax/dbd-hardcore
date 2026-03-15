/**
 * Killer portrait image URLs from DBD (dbd-db.com / game assets).
 * Base: https://pub-563d6f059a934468a5878194b3ab67ae.r2.dev/DeadByDaylight/Content/UI/UMGAssets/Icons/CharPortraits/
 * Verified working (HTTP 200).
 */
const BASE =
  "https://pub-563d6f059a934468a5878194b3ab67ae.r2.dev/DeadByDaylight/Content/UI/UMGAssets/Icons/CharPortraits";

export const KILLER_IMAGE_URLS: Record<string, string> = {
  nurse: `${BASE}/K04_TheNurse_Portrait.webp`,
  blight: `${BASE}/Yemen/K21_TheBlight_Portrait.webp`,
  hillbilly: `${BASE}/K03_TheHillbilly_Portrait.webp`,
  "the-first": `${BASE}/Poutine/T_UI_K42_TheFirst_Portrait.webp`,
  "the-krasue": `${BASE}/Maple/T_UI_K41_TheKrasue_Portrait.webp`,
  "the-ghoul": `${BASE}/Icecream/K39_TheGhoul_Portrait.webp`,
  "the-spirit": `${BASE}/Haiti/K13_TheSpirit_Portrait.webp`,
  lich: `${BASE}/Churros/K36_TheLich_Portrait.webp`,
  "dark-lord": `${BASE}/Eclair/K37_TheDracula_Portrait.webp`,
  animatronic: `${BASE}/Ketchup/K40_TheAnimatronic_Portrait.webp`,
  mastermind: `${BASE}/Orion/K29_TheMasterMind_Portrait.webp`,
  huntress: `${BASE}/DLC5/K08_TheHuntress_Portrait.webp`,
  xenomorph: `${BASE}/Wormhole/K33_TheXenomorph_Portrait.webp`,
  executioner: `${BASE}/Wales/K20_TheExecutioner_Portrait.webp`,
  nightmare: `${BASE}/England/K10_TheNightmare_Portrait.webp`,
  "good-guy": `${BASE}/Yerkes/K34_TheYerkes_Portrait.webp`,
  houndmaster: `${BASE}/Gelato/K38_TheHoundmaster_Portrait.webp`,
  unknown: `${BASE}/Applepie/K35_TheUnknown_Portrait.webp`,
  trickster: `${BASE}/Comet/K23_TheTrickster_Portrait.webp`,
  knight: `${BASE}/Quantum/K30_TheKnight_Portrait.webp`,
  doctor: `${BASE}/DLC4/K07_TheDoctor_Portrait.webp`,
  nemesis: `${BASE}/Eclipse/K24_TheNemesis_Portrait.webp`,
  artist: `${BASE}/Ion/K26_TheArtist_Portrait.webp`,
  singularity: `${BASE}/Umbra/K32_TheSingularity_Portrait.webp`,
  dredge: `${BASE}/Meteor/K28_TheDredge_Portrait.webp`,
  legion: `${BASE}/Kenya/K14_TheLegion_Portrait.webp`,
  plague: `${BASE}/Mali/K15_ThePlague_Portrait.webp`,
  hag: `${BASE}/DLC3/K05_TheHag_Portrait.webp`,
  deathslinger: `${BASE}/Ukraine/K19_TheDeathslinger_Portrait.webp`,
  oni: `${BASE}/Sweden/K18_TheOni_Portrait.webp`,
  twins: `${BASE}/Aurora/K22_TheTwins_Portrait.webp`,
  pig: `${BASE}/Finland/K11_ThePig_Portrait.webp`,
  clown: `${BASE}/Guam/K12_TheClown_Portrait.webp`,
  "ghost-face": `${BASE}/Oman/K16_TheGhostface_Portrait.webp`,
  cannibal: `${BASE}/Cannibal/K09_TheCannibal_Portrait.webp`,
  shape: `${BASE}/DLC2/K06_TheShape_Portrait.webp`,
  demogorgon: `${BASE}/Qatar/K17_TheDemogorgon_Portrait.webp`,
  onryō: `${BASE}/Kepler/K27_TheOnryo_Portrait.webp`,
  cenobite: `${BASE}/Gemini/K25_TheCenobite_Portrait.webp`,
  trapper: `${BASE}/K01_TheTrapper_Portrait.webp`,
  "skull-merchant": `${BASE}/Saturn/K31_TheSkullMerchant_Portrait.webp`,
};

/** Local image path under public/killers (run `node scripts/download-killer-images.cjs` to populate). */
export function getKillerImageUrl(killerId: string): string | undefined {
  if (!KILLER_IMAGE_URLS[killerId]) return undefined;
  return `/killers/${encodeURIComponent(killerId)}.webp`;
}
