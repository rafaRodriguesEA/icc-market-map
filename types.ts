
export enum ClientStatus {
  PROSPECT = 'Prospect',
  LEAD = 'Lead',
  NEGOTIATION = 'Negociação',
  ACTIVE = 'Ativo',
  CHURN = 'Inativo'
}

export enum AccessLevel {
  SUPERADMIN = 'Superadmin',
  CEO = 'CEO',
  DIRECTOR = 'Diretor',
  MANAGER = 'Gerente',
  SELLER = 'Vendedor',
  OTHER = 'Outros'
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoUrl?: string;
  role: string; // "Cargo" e.g., Regional Manager
  department: string;
  accessLevel: AccessLevel;
  subordinates?: string[]; // List of UIDs (for Managers)
  canViewSpecificUsers?: string[]; // List of UIDs (for Others)
}

export interface AppSettings {
  logoUrl?: string;
  coverImageUrl?: string;
  departments: string[];
  packagings: string[]; 
  incoterms: string[];
  clientSegments: string[]; // Dynamic List of Profiles
  productTypes: string[]; // New: Dynamic List of Product Types
}

export interface ClientContact {
  id: string;
  name: string;
  role: string; // e.g. Nutricionista, Decisor
  email: string;
  phone: string;
  observation: string;
}

export interface Client {
  id?: string;
  ownerId: string; // User UID who owns this client
  createdAt: number;
  lastContactDate: string;
  
  // --- GERAL ---
  managerId?: string; // UID of Manager
  sellerId?: string;  // UID of Seller
  companyName: string;
  unit?: string;
  country?: string;
  state?: string;
  productsSoldIds?: string[]; // List of Product IDs currently sold to this client
  segment: string; // Now a string from AppSettings.clientSegments
  status: ClientStatus;
  usesCompetition?: boolean;
  competitorName?: string;
  logoUrl?: string;
  notes?: string;

  // --- CONTATOS (Dynamic List) ---
  contacts: ClientContact[];

  // Legacy fields (kept for backward compatibility if needed, but UI uses contacts array)
  contactName?: string; 
  email?: string;       
  phone?: string;       

  // --- PRODUÇÃO ---
  processingType?: string;
  annualFeedProduction?: number; // Tons/Year
  volumePercentageConsidered?: number; // % to consider
  potentialProductIds?: string[]; // Products to calculate potential for
  
  // Specific Animal Metrics
  headsNumber?: number;
  dailyMilkProduction?: number;
  sowsNumber?: number;

  // Legacy/Summary
  potentialValue: number; 
}

export interface ProductVariation {
  id: string;
  packaging: string; 
  incoterm: string;  
  price: number;
  currency: 'EUR' | 'USD' | 'BRL' | 'RMB';
  destination: string; 
  country: string;
  
  // Equivalents (USD/Kg)
  fobSantos: number;
  cifBaltimore: number;
  cifAntwerp: number;
  fcaIcc: number;
}

export interface Product {
  id?: string;
  brand: string; 
  kgPerTon: number; 
  type: string;
  variations: ProductVariation[];
}

// Market Intelligence / Competitor Prices
export interface MarketEntry {
  id?: string;
  date: string; // YYYY-MM-DD
  competitor: string;
  product: string;
  productType: string;
  notes?: string;
  packaging: string;
  price: number;
  currency: 'EUR' | 'USD' | 'BRL' | 'RMB';
  incoterm: string;
  destination: string;
  country: string;
  
  // Equivalences (USD/Kg)
  fobSantos?: number;
  cifBaltimore?: number;
  cifAntwerp?: number;
  fcaIcc?: number;

  createdBy: string; // User UID
  createdAt: number;
}

export interface DashboardMetrics {
  totalClients: number;
  totalPotentialValue: number;
  activeClients: number;
  leads: number;
}

export interface AIAnalysis {
  strategy: string;
  talkingPoints: string[];
  riskAssessment: string;
}
