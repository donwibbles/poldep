interface MailMergeContact {
  firstName: string;
  lastName: string;
  title?: string | null;
  organization?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  district?: string | null;
  party?: string | null;
  website?: string | null;
}

const MAIL_MERGE_VARIABLES = [
  "firstName",
  "lastName",
  "title",
  "organization",
  "email",
  "phone",
  "address",
  "city",
  "state",
  "zip",
  "district",
  "party",
  "website",
] as const;

export type MailMergeVariable = (typeof MAIL_MERGE_VARIABLES)[number];

export function applyMailMerge(
  template: string,
  contact: MailMergeContact
): string {
  let result = template;

  result = result.replace(/\{\{firstName\}\}/g, contact.firstName || "");
  result = result.replace(/\{\{lastName\}\}/g, contact.lastName || "");
  result = result.replace(/\{\{title\}\}/g, contact.title || "");
  result = result.replace(/\{\{organization\}\}/g, contact.organization || "");
  result = result.replace(/\{\{email\}\}/g, contact.email || "");
  result = result.replace(/\{\{phone\}\}/g, contact.phone || "");
  result = result.replace(/\{\{address\}\}/g, contact.address || "");
  result = result.replace(/\{\{city\}\}/g, contact.city || "");
  result = result.replace(/\{\{state\}\}/g, contact.state || "");
  result = result.replace(/\{\{zip\}\}/g, contact.zip || "");
  result = result.replace(/\{\{district\}\}/g, contact.district || "");
  result = result.replace(/\{\{party\}\}/g, contact.party || "");
  result = result.replace(/\{\{website\}\}/g, contact.website || "");

  return result;
}

export function getAvailableVariables(): {
  variable: string;
  description: string;
}[] {
  return [
    { variable: "{{firstName}}", description: "Contact's first name" },
    { variable: "{{lastName}}", description: "Contact's last name" },
    { variable: "{{title}}", description: "Contact's title" },
    { variable: "{{organization}}", description: "Contact's organization" },
    { variable: "{{email}}", description: "Contact's email address" },
    { variable: "{{phone}}", description: "Contact's phone number" },
    { variable: "{{address}}", description: "Contact's street address" },
    { variable: "{{city}}", description: "Contact's city" },
    { variable: "{{state}}", description: "Contact's state" },
    { variable: "{{zip}}", description: "Contact's ZIP code" },
    { variable: "{{district}}", description: "Contact's district" },
    { variable: "{{party}}", description: "Contact's party affiliation" },
    { variable: "{{website}}", description: "Contact's website" },
  ];
}

export function getSampleContact(): MailMergeContact {
  return {
    firstName: "John",
    lastName: "Doe",
    title: "City Council Member",
    organization: "City of Springfield",
    email: "john.doe@example.com",
    phone: "(555) 123-4567",
    address: "123 Main St",
    city: "Springfield",
    state: "CA",
    zip: "90210",
    district: "District 5",
    party: "Democratic",
    website: "https://johndoe.gov",
  };
}

export function previewMailMerge(template: string): string {
  return applyMailMerge(template, getSampleContact());
}
