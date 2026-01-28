export const POSITION_TITLES = [
  // Federal
  "US President",
  "US Vice President",
  "US Senator",
  "US Representative",
  // State Executive
  "Governor",
  "Lieutenant Governor",
  "Attorney General",
  "Secretary of State",
  "State Treasurer",
  "State Controller",
  "Insurance Commissioner",
  // State Legislative
  "State Senator",
  "State Assembly Member",
  // Local Executive
  "Mayor",
  "City Manager",
  "County Executive",
  // Local Legislative
  "City Council Member",
  "County Supervisor",
  "Town Council Member",
  // School/Special District
  "School Board Member",
  "Community College Trustee",
  "Special District Director",
  // Judicial
  "Supreme Court Justice",
  "Appeals Court Justice",
  "Superior Court Judge",
  // District Attorney
  "District Attorney",
  "Public Defender",
  // Other
  "Other",
] as const;

export const US_STATES = [
  { abbr: "AL", name: "Alabama" },
  { abbr: "AK", name: "Alaska" },
  { abbr: "AZ", name: "Arizona" },
  { abbr: "AR", name: "Arkansas" },
  { abbr: "CA", name: "California" },
  { abbr: "CO", name: "Colorado" },
  { abbr: "CT", name: "Connecticut" },
  { abbr: "DE", name: "Delaware" },
  { abbr: "FL", name: "Florida" },
  { abbr: "GA", name: "Georgia" },
  { abbr: "HI", name: "Hawaii" },
  { abbr: "ID", name: "Idaho" },
  { abbr: "IL", name: "Illinois" },
  { abbr: "IN", name: "Indiana" },
  { abbr: "IA", name: "Iowa" },
  { abbr: "KS", name: "Kansas" },
  { abbr: "KY", name: "Kentucky" },
  { abbr: "LA", name: "Louisiana" },
  { abbr: "ME", name: "Maine" },
  { abbr: "MD", name: "Maryland" },
  { abbr: "MA", name: "Massachusetts" },
  { abbr: "MI", name: "Michigan" },
  { abbr: "MN", name: "Minnesota" },
  { abbr: "MS", name: "Mississippi" },
  { abbr: "MO", name: "Missouri" },
  { abbr: "MT", name: "Montana" },
  { abbr: "NE", name: "Nebraska" },
  { abbr: "NV", name: "Nevada" },
  { abbr: "NH", name: "New Hampshire" },
  { abbr: "NJ", name: "New Jersey" },
  { abbr: "NM", name: "New Mexico" },
  { abbr: "NY", name: "New York" },
  { abbr: "NC", name: "North Carolina" },
  { abbr: "ND", name: "North Dakota" },
  { abbr: "OH", name: "Ohio" },
  { abbr: "OK", name: "Oklahoma" },
  { abbr: "OR", name: "Oregon" },
  { abbr: "PA", name: "Pennsylvania" },
  { abbr: "RI", name: "Rhode Island" },
  { abbr: "SC", name: "South Carolina" },
  { abbr: "SD", name: "South Dakota" },
  { abbr: "TN", name: "Tennessee" },
  { abbr: "TX", name: "Texas" },
  { abbr: "UT", name: "Utah" },
  { abbr: "VT", name: "Vermont" },
  { abbr: "VA", name: "Virginia" },
  { abbr: "WA", name: "Washington" },
  { abbr: "WV", name: "West Virginia" },
  { abbr: "WI", name: "Wisconsin" },
  { abbr: "WY", name: "Wyoming" },
  { abbr: "DC", name: "District of Columbia" },
] as const;

export const PARTIES = [
  "Democratic",
  "Republican",
  "Independent",
  "Green",
  "Libertarian",
  "Peace and Freedom",
  "No Party Preference",
] as const;

export const DISTRICT_TYPES = [
  { prefix: "", label: "At-Large", example: "CA" },
  { prefix: "CD-", label: "Congressional District", example: "CA-CD-15" },
  { prefix: "SD-", label: "State Senate District", example: "CA-SD-05" },
  { prefix: "AD-", label: "State Assembly District", example: "CA-AD-18" },
  { prefix: "SUP-", label: "Supervisorial District", example: "LA-SUP-3" },
  { prefix: "WARD-", label: "City Ward", example: "SF-WARD-5" },
] as const;

export const STAFF_ROLES = [
  "Chief of Staff",
  "Campaign Manager",
  "Field Director",
  "Finance Director",
  "Communications Director",
  "Policy Director",
  "Scheduler",
  "Deputy Chief of Staff",
  "Legislative Director",
  "District Director",
  "Caseworker",
  "Intern",
  "Other",
] as const;

export const OFFICE_LEVELS = {
  FEDERAL: [
    "US President",
    "US Vice President",
    "US Senator",
    "US Representative",
  ],
  STATE: [
    "Governor",
    "Lieutenant Governor",
    "Attorney General",
    "Secretary of State",
    "State Treasurer",
    "State Controller",
    "Insurance Commissioner",
    "State Senator",
    "State Assembly Member",
  ],
  LOCAL: [
    "Mayor",
    "City Manager",
    "County Executive",
    "City Council Member",
    "County Supervisor",
    "Town Council Member",
    "School Board Member",
    "Community College Trustee",
    "Special District Director",
    "Supreme Court Justice",
    "Appeals Court Justice",
    "Superior Court Judge",
    "District Attorney",
    "Public Defender",
  ],
} as const;

export function getOfficeLevel(positionTitle: string): "FEDERAL" | "STATE" | "LOCAL" | null {
  if (OFFICE_LEVELS.FEDERAL.includes(positionTitle as any)) return "FEDERAL";
  if (OFFICE_LEVELS.STATE.includes(positionTitle as any)) return "STATE";
  if (OFFICE_LEVELS.LOCAL.includes(positionTitle as any)) return "LOCAL";
  return null;
}

export type PositionTitle = (typeof POSITION_TITLES)[number];
export type USState = (typeof US_STATES)[number];
export type Party = (typeof PARTIES)[number];
export type DistrictType = (typeof DISTRICT_TYPES)[number];
export type StaffRole = (typeof STAFF_ROLES)[number];
export type OfficeLevel = keyof typeof OFFICE_LEVELS;
