export type ServiceTypeConfig = {
  label: string;
  requiresProject: boolean;
  projectType?: string;
  projectNamePrefix?: string;
  mailboxLimit?: number;
  monthlyPrice?: number;
};

export const BUSINESS_EMAIL_PACKAGES = {
  business_email_10: {
    label: "Business Email 10",
    mailboxLimit: 10,
    monthlyPrice: 150,
  },
  business_email_30: {
    label: "Business Email 30",
    mailboxLimit: 30,
    monthlyPrice: 450,
  },
  business_email_50: {
    label: "Business Email 50",
    mailboxLimit: 50,
    monthlyPrice: 850,
  },
} as const;

export type BusinessEmailPackageCode = keyof typeof BUSINESS_EMAIL_PACKAGES;

export const EMAIL_MIGRATION_PACKAGE = {
  selectedPackage: "email_migration_setup",
  serviceType: "email_migration",
  label: "Email Migration & Setup",
} as const;

export const SERVICE_TYPE_CONFIG = {
  website_build: {
    label: "Website Build",
    requiresProject: true,
    projectType: "website_build",
    projectNamePrefix: "Website Build",
  },
  website_redesign: {
    label: "Website Redesign",
    requiresProject: true,
    projectType: "website_redesign",
    projectNamePrefix: "Website Redesign",
  },
  ecommerce_build: {
    label: "E-Commerce Build",
    requiresProject: true,
    projectType: "ecommerce_build",
    projectNamePrefix: "E-Commerce Build",
  },
  booking_system: {
    label: "Booking System",
    requiresProject: true,
    projectType: "booking_system",
    projectNamePrefix: "Booking System",
  },
  custom_web_app: {
    label: "Custom Web App",
    requiresProject: true,
    projectType: "custom_web_app",
    projectNamePrefix: "Custom Web App",
  },
  smart_website: {
    label: "Smart Website",
    requiresProject: true,
    projectType: "smart_website",
    projectNamePrefix: "Smart Website",
  },
  smart_ecommerce: {
    label: "Smart Ecommerce",
    requiresProject: true,
    projectType: "smart_ecommerce",
    projectNamePrefix: "Smart Ecommerce",
  },
  smart_system: {
    label: "Smart System / Advanced Web System",
    requiresProject: true,
    projectType: "smart_system",
    projectNamePrefix: "Smart System",
  },
  advanced_web_system: {
    label: "Smart System / Advanced Web System",
    requiresProject: true,
    projectType: "advanced_web_system",
    projectNamePrefix: "Advanced Web System",
  },
  business_email: {
    label: "Business Email",
    requiresProject: false,
  },
  business_email_10: {
    label: BUSINESS_EMAIL_PACKAGES.business_email_10.label,
    requiresProject: false,
    mailboxLimit: BUSINESS_EMAIL_PACKAGES.business_email_10.mailboxLimit,
    monthlyPrice: BUSINESS_EMAIL_PACKAGES.business_email_10.monthlyPrice,
  },
  business_email_30: {
    label: BUSINESS_EMAIL_PACKAGES.business_email_30.label,
    requiresProject: false,
    mailboxLimit: BUSINESS_EMAIL_PACKAGES.business_email_30.mailboxLimit,
    monthlyPrice: BUSINESS_EMAIL_PACKAGES.business_email_30.monthlyPrice,
  },
  business_email_50: {
    label: BUSINESS_EMAIL_PACKAGES.business_email_50.label,
    requiresProject: false,
    mailboxLimit: BUSINESS_EMAIL_PACKAGES.business_email_50.mailboxLimit,
    monthlyPrice: BUSINESS_EMAIL_PACKAGES.business_email_50.monthlyPrice,
  },
  email_migration: {
    label: "Email Migration & Setup",
    requiresProject: false,
  },
  email_migration_setup: {
    label: "Email Migration & Setup",
    requiresProject: false,
  },
  hosting_email: {
    label: "Hosting + Email Setup",
    requiresProject: false,
  },
  email_only: {
    label: "Email Only",
    requiresProject: false,
  },
  domain_only: {
    label: "Domain Registration Only",
    requiresProject: false,
  },
  domain_transfer: {
    label: "Domain Transfer",
    requiresProject: false,
  },
  hosting_transfer: {
    label: "Hosting Transfer",
    requiresProject: false,
  },
  support_request: {
    label: "Support Request",
    requiresProject: false,
  },
  billing_request: {
    label: "Billing / Invoice Request",
    requiresProject: false,
  },
  renewal_request: {
    label: "Renewal Request",
    requiresProject: false,
  },
  existing_client_add_service: {
    label: "Existing Client - Add Service",
    requiresProject: false,
  },
  existing_client_support: {
    label: "Existing Client Support",
    requiresProject: false,
  },
  general_enquiry: {
    label: "General Enquiry",
    requiresProject: false,
  },
} as const satisfies Record<string, ServiceTypeConfig>;

export type KnownServiceType = keyof typeof SERVICE_TYPE_CONFIG;

export const isBusinessEmailPackage = (value: string | null | undefined): value is BusinessEmailPackageCode =>
  !!value && value in BUSINESS_EMAIL_PACKAGES;

export const isEmailMigrationService = (serviceType: string | null | undefined, selectedPackage?: string | null) =>
  serviceType === EMAIL_MIGRATION_PACKAGE.serviceType || selectedPackage === EMAIL_MIGRATION_PACKAGE.selectedPackage;

export const packageLabel = (value: string | null | undefined) =>
  isBusinessEmailPackage(value) ? BUSINESS_EMAIL_PACKAGES[value].label : value || "";

export const resolveServiceType = (serviceType: string | null | undefined) => {
  const normalized = serviceType?.trim() as KnownServiceType | undefined;
  if (normalized && normalized in SERVICE_TYPE_CONFIG) {
    return {
      serviceType: normalized,
      config: SERVICE_TYPE_CONFIG[normalized],
      usedFallback: false,
    };
  }

  return {
    serviceType: "general_enquiry" as const,
    config: SERVICE_TYPE_CONFIG.general_enquiry,
    usedFallback: true,
  };
};

export const projectNameForService = (serviceType: KnownServiceType, businessName: string) => {
  const config = SERVICE_TYPE_CONFIG[serviceType];
  return config.projectNamePrefix ? `${config.projectNamePrefix} - ${businessName}` : `${businessName} Project`;
};

