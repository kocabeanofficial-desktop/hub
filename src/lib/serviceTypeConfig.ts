export type ServiceTypeConfig = {
  label: string;
  requiresProject: boolean;
  projectType?: string;
  projectNamePrefix?: string;
};

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
  email_migration: {
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

