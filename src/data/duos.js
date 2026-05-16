export const DUOS = [
  {
    id: 1,
    name: "Mia & Jess",
    ages: "21 / 20",
    cities: "Irvine + Newport",
    vibes: ["ABG", "Gym", "Boba", "Nights out"],
    spots: ["Irvine Spectrum", "Newport Beach", "Boba OC"],
    lookingFor: "Chill 2v2 hangout · Friends first",
    members: [
      { name: "Mia",  age: 21, city: "Irvine",  ig: "mia_oc",  emoji: "👩", avatarBg: "#3A2828" },
      { name: "Jess", age: 20, city: "Newport", ig: "jess_oc", emoji: "👩", avatarBg: "#282828" },
    ],
    cardBg: ["#3A2828", "#282828"],
  },
  {
    id: 2,
    name: "Jay & Marcus",
    ages: "19 / 21",
    cities: "Fullerton",
    vibes: ["Gym", "Cars", "Business"],
    spots: ["Downtown Fullerton", "Packing District"],
    lookingFor: "2v2 hangout · Make new friends",
    members: [
      { name: "Jay",    age: 19, city: "Fullerton", ig: "jay_oc",    emoji: "🧑", avatarBg: "#1E2828" },
      { name: "Marcus", age: 21, city: "Fullerton", ig: "marcus_oc", emoji: "🧑", avatarBg: "#1E2020" },
    ],
    cardBg: ["#1E2828", "#1E2020"],
  },
  {
    id: 3,
    name: "Sophie & Ana",
    ages: "22 / 20",
    cities: "Newport + Costa Mesa",
    vibes: ["Beach", "Coffee", "Social"],
    spots: ["Balboa Island", "Costa Mesa", "Pacific City"],
    lookingFor: "Social events · Friends first",
    members: [
      { name: "Sophie", age: 22, city: "Newport",    ig: "sophie_oc", emoji: "👧", avatarBg: "#202035" },
      { name: "Ana",    age: 20, city: "Costa Mesa", ig: "ana_oc",    emoji: "👧", avatarBg: "#252535" },
    ],
    cardBg: ["#202035", "#252535"],
  },
  {
    id: 4,
    name: "Ryan & Kai",
    ages: "20 / 19",
    cities: "Irvine",
    vibes: ["Boba", "Study", "Music"],
    spots: ["UCI Campus", "Irvine Spectrum", "Boba Bar"],
    lookingFor: "Chill hangout · Dating / Social",
    members: [
      { name: "Ryan", age: 20, city: "Irvine", ig: "ryan_oc", emoji: "👦", avatarBg: "#203020" },
      { name: "Kai",  age: 19, city: "Irvine", ig: "kai_oc",  emoji: "🧑", avatarBg: "#202820" },
    ],
    cardBg: ["#203020", "#202820"],
  },
];

export const SECTIONS = [
  { label: "TONIGHT IN OC",     duoIds: [1, 2], size: "featured" },
  { label: "NEAR YOU",           duoIds: [3, 4], size: "regular"  },
  { label: "GYM / NIGHT VIBES", duoIds: [2, 3], size: "regular"  },
  { label: "NEW DUOS",           duoIds: [4, 1], size: "regular"  },
];

export const OC_SPOTS = [
  { id: 1, name: "Boba OC",               city: "Irvine",      vibe: "Boba",   emoji: "🧋", bg: "#2A1E1E" },
  { id: 2, name: "Portola Coffee",         city: "Costa Mesa",  vibe: "Coffee", emoji: "☕", bg: "#1E1E2A" },
  { id: 3, name: "Huntington Beach",       city: "Huntington",  vibe: "Beach",  emoji: "🏄", bg: "#1E2A2A" },
  { id: 4, name: "Anaheim Packing House",  city: "Anaheim",     vibe: "Food",   emoji: "🍜", bg: "#2A2A1E" },
  { id: 5, name: "Downtown Fullerton",     city: "Fullerton",   vibe: "Night",  emoji: "🌙", bg: "#1E1E1E" },
  { id: 6, name: "Irvine Spectrum",        city: "Irvine",      vibe: "Social", emoji: "🎡", bg: "#2A1E2A" },
];
