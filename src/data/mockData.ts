export type UserRole = "admin" | "client";

export interface MockUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  clientId?: string;
}

export interface Client {
  id: string;
  name: string;
  contactName: string;
  email: string;
  phone: string;
  industry: string;
  status: "active" | "onboarding" | "inactive";
  createdAt: string;
}

export interface Enquiry {
  id: string;
  name: string;
  email: string;
  phone: string;
  service: string;
  message: string;
  status: "new" | "contacted" | "qualified" | "converted" | "closed";
  createdAt: string;
  source: string;
}

export type WebsiteBuildStage =
  | "enquiry_received"
  | "awaiting_deposit"
  | "awaiting_content"
  | "in_design"
  | "in_development"
  | "awaiting_feedback"
  | "revision"
  | "ready_to_launch"
  | "live";

export interface Project {
  id: string;
  clientId: string;
  clientName: string;
  name: string;
  description: string;
  status: "active" | "paused" | "completed" | "cancelled";
  buildStage: WebsiteBuildStage;
  startDate: string;
  targetDate: string;
  notes: string;
}

export interface SupportTicket {
  id: string;
  clientId: string;
  clientName: string;
  projectId?: string;
  subject: string;
  description: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  priority: "low" | "medium" | "high" | "urgent";
  createdAt: string;
}

export interface Report {
  id: string;
  clientId: string;
  clientName: string;
  projectId?: string;
  title: string;
  type: "seo" | "performance" | "analytics" | "monthly" | "ad_hoc";
  status: "draft" | "ready" | "sent";
  date: string;
}

export interface SEOTask {
  id: string;
  clientId: string;
  clientName: string;
  projectId?: string;
  task: string;
  status: "todo" | "in_progress" | "done";
  dueDate: string;
  category: string;
}

export interface ActivityEvent {
  id: string;
  timestamp: string;
  eventType: string;
  source: string;
  description: string;
  status: "completed" | "pending" | "failed";
  clientId?: string;
  clientName?: string;
  projectId?: string;
}

export const mockUsers: MockUser[] = [
  { id: "u1", email: "admin@kocabean.co.za", name: "Koca Bean Admin", role: "admin" },
  { id: "u2", email: "john@buildpro.co.za", name: "John van der Merwe", role: "client", clientId: "c1" },
  { id: "u3", email: "sarah@plumbfix.co.za", name: "Sarah Naidoo", role: "client", clientId: "c2" },
  { id: "u4", email: "mike@elecworks.co.za", name: "Mike Botha", role: "client", clientId: "c3" },
];

export const mockClients: Client[] = [
  { id: "c1", name: "BuildPro Construction", contactName: "John van der Merwe", email: "john@buildpro.co.za", phone: "082 555 1234", industry: "Construction", status: "active", createdAt: "2025-11-15" },
  { id: "c2", name: "PlumbFix Services", contactName: "Sarah Naidoo", email: "sarah@plumbfix.co.za", phone: "083 555 5678", industry: "Plumbing", status: "active", createdAt: "2025-12-01" },
  { id: "c3", name: "ElecWorks SA", contactName: "Mike Botha", email: "mike@elecworks.co.za", phone: "084 555 9012", industry: "Electrical", status: "onboarding", createdAt: "2026-01-10" },
  { id: "c4", name: "GreenScape Gardens", contactName: "Thandi Molefe", email: "thandi@greenscape.co.za", phone: "081 555 3456", industry: "Landscaping", status: "active", createdAt: "2025-10-20" },
];

export const mockEnquiries: Enquiry[] = [
  { id: "e1", name: "David Khumalo", email: "david@roofking.co.za", phone: "072 111 2222", service: "Website Design", message: "Need a professional website for my roofing business.", status: "new", createdAt: "2026-03-20", source: "Google" },
  { id: "e2", name: "Lisa Pretorius", email: "lisa@cleanpro.co.za", phone: "082 333 4444", service: "Website + SEO", message: "Looking for a website and Google ranking help.", status: "contacted", createdAt: "2026-03-18", source: "Referral" },
  { id: "e3", name: "James Sithole", email: "james@tilemaster.co.za", phone: "073 555 6666", service: "Website Redesign", message: "Current site is outdated, need modern design.", status: "qualified", createdAt: "2026-03-15", source: "Facebook" },
  { id: "e4", name: "Karen Joubert", email: "karen@paintpro.co.za", phone: "061 777 8888", service: "Website Design", message: "Starting a new painting company.", status: "new", createdAt: "2026-03-22", source: "Instagram" },
  { id: "e5", name: "Sipho Dlamini", email: "sipho@fencecraft.co.za", phone: "079 999 0000", service: "Website + Shop", message: "Want a website with online quoting.", status: "converted", createdAt: "2026-02-28", source: "Google" },
];

export const mockProjects: Project[] = [
  { id: "p1", clientId: "c1", clientName: "BuildPro Construction", name: "BuildPro Website", description: "Professional construction company website with project gallery and contact form.", status: "active", buildStage: "in_development", startDate: "2025-12-01", targetDate: "2026-04-15", notes: "Client prefers dark theme. Gallery section priority." },
  { id: "p2", clientId: "c2", clientName: "PlumbFix Services", name: "PlumbFix Website", description: "Service-based website with online booking and service areas.", status: "active", buildStage: "awaiting_feedback", startDate: "2026-01-05", targetDate: "2026-03-30", notes: "First draft sent. Awaiting client review." },
  { id: "p3", clientId: "c3", clientName: "ElecWorks SA", name: "ElecWorks Website", description: "Electrical services website with COC certificate request form.", status: "active", buildStage: "awaiting_content", startDate: "2026-02-15", targetDate: "2026-05-01", notes: "Deposit received. Waiting for logo and content." },
  { id: "p4", clientId: "c4", clientName: "GreenScape Gardens", name: "GreenScape Website", description: "Landscaping portfolio website with before/after gallery.", status: "completed", buildStage: "live", startDate: "2025-08-01", targetDate: "2025-11-15", notes: "Site live. Client happy." },
  { id: "p5", clientId: "c1", clientName: "BuildPro Construction", name: "BuildPro SEO Campaign", description: "Monthly SEO management and Google Business optimization.", status: "active", buildStage: "live", startDate: "2026-01-01", targetDate: "2026-12-31", notes: "Ongoing monthly SEO." },
];

export const mockSupportTickets: SupportTicket[] = [
  { id: "s1", clientId: "c1", clientName: "BuildPro Construction", projectId: "p1", subject: "Logo not displaying correctly", description: "The logo appears blurry on mobile devices.", status: "open", priority: "medium", createdAt: "2026-03-21" },
  { id: "s2", clientId: "c2", clientName: "PlumbFix Services", projectId: "p2", subject: "Change contact number", description: "Please update the phone number on the contact page.", status: "in_progress", priority: "low", createdAt: "2026-03-19" },
  { id: "s3", clientId: "c4", clientName: "GreenScape Gardens", projectId: "p4", subject: "Add new gallery images", description: "Have 10 new project photos to add to the gallery.", status: "open", priority: "low", createdAt: "2026-03-22" },
  { id: "s4", clientId: "c1", clientName: "BuildPro Construction", subject: "Email not working", description: "Company emails stopped working this morning.", status: "open", priority: "urgent", createdAt: "2026-03-23" },
];

export const mockReports: Report[] = [
  { id: "r1", clientId: "c1", clientName: "BuildPro Construction", projectId: "p5", title: "February SEO Report", type: "seo", status: "sent", date: "2026-03-05" },
  { id: "r2", clientId: "c4", clientName: "GreenScape Gardens", projectId: "p4", title: "Q1 Analytics Report", type: "analytics", status: "ready", date: "2026-03-20" },
  { id: "r3", clientId: "c2", clientName: "PlumbFix Services", projectId: "p2", title: "Website Launch Report", type: "performance", status: "draft", date: "2026-03-23" },
  { id: "r4", clientId: "c1", clientName: "BuildPro Construction", projectId: "p5", title: "March SEO Report", type: "seo", status: "draft", date: "2026-03-23" },
];

export const mockSEOTasks: SEOTask[] = [
  { id: "seo1", clientId: "c1", clientName: "BuildPro Construction", projectId: "p5", task: "Optimize Google Business Profile", status: "done", dueDate: "2026-03-15", category: "Local SEO" },
  { id: "seo2", clientId: "c1", clientName: "BuildPro Construction", projectId: "p5", task: "Build 5 local citations", status: "in_progress", dueDate: "2026-03-25", category: "Link Building" },
  { id: "seo3", clientId: "c4", clientName: "GreenScape Gardens", projectId: "p4", task: "Monthly content update", status: "todo", dueDate: "2026-03-30", category: "Content" },
  { id: "seo4", clientId: "c2", clientName: "PlumbFix Services", projectId: "p2", task: "Set up Google Analytics", status: "todo", dueDate: "2026-04-01", category: "Analytics" },
  { id: "seo5", clientId: "c1", clientName: "BuildPro Construction", projectId: "p5", task: "Keyword research update", status: "in_progress", dueDate: "2026-03-28", category: "Research" },
];

export const mockActivityEvents: ActivityEvent[] = [
  { id: "a1", timestamp: "2026-03-23T14:30:00", eventType: "support_ticket", source: "Client Portal", description: "New support ticket: Email not working", status: "pending", clientId: "c1", clientName: "BuildPro Construction" },
  { id: "a2", timestamp: "2026-03-23T12:15:00", eventType: "enquiry", source: "Website Form", description: "New enquiry from Karen Joubert", status: "completed" },
  { id: "a3", timestamp: "2026-03-22T16:45:00", eventType: "project_update", source: "Admin", description: "PlumbFix website moved to Awaiting Feedback", status: "completed", clientId: "c2", clientName: "PlumbFix Services", projectId: "p2" },
  { id: "a4", timestamp: "2026-03-22T10:00:00", eventType: "report", source: "System", description: "Q1 Analytics Report generated for GreenScape", status: "completed", clientId: "c4", clientName: "GreenScape Gardens" },
  { id: "a5", timestamp: "2026-03-21T09:30:00", eventType: "onboarding", source: "Admin", description: "ElecWorks SA onboarding started", status: "pending", clientId: "c3", clientName: "ElecWorks SA" },
  { id: "a6", timestamp: "2026-03-20T17:00:00", eventType: "automation", source: "System", description: "Follow-up reminder sent to GreenScape Gardens", status: "completed", clientId: "c4", clientName: "GreenScape Gardens" },
  { id: "a7", timestamp: "2026-03-19T11:20:00", eventType: "support_update", source: "Admin", description: "PlumbFix contact number change - in progress", status: "completed", clientId: "c2", clientName: "PlumbFix Services" },
];

export const WEBSITE_BUILD_STAGES: { key: WebsiteBuildStage; label: string }[] = [
  { key: "enquiry_received", label: "Enquiry Received" },
  { key: "awaiting_deposit", label: "Awaiting Deposit" },
  { key: "awaiting_content", label: "Awaiting Content" },
  { key: "in_design", label: "In Design" },
  { key: "in_development", label: "In Development" },
  { key: "awaiting_feedback", label: "Awaiting Feedback" },
  { key: "revision", label: "Revision" },
  { key: "ready_to_launch", label: "Ready to Launch" },
  { key: "live", label: "Live" },
];
