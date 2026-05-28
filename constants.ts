import { ClientStatus } from './types';

export const STATUS_COLORS = {
  [ClientStatus.PROSPECT]: 'bg-gray-100 text-gray-800 border-gray-200',
  [ClientStatus.LEAD]: 'bg-blue-100 text-blue-800 border-blue-200',
  [ClientStatus.NEGOTIATION]: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  [ClientStatus.ACTIVE]: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  [ClientStatus.CHURN]: 'bg-red-100 text-red-800 border-red-200',
};

export const SEGMENT_ICONS: Record<string, string> = {
  // Legacy
  'Poultry': 'fa-feather',
  'Swine': 'fa-piggy-bank',
  'Ruminant': 'fa-cow',
  'Aqua': 'fa-fish',
  'Pet': 'fa-paw',

  // Current Segments
  'Agricola': 'fa-tractor',
  'Biológicos': 'fa-vial',
  'Cooperativa bovinos': 'fa-cow',
  'Cooperativa frango de corte': 'fa-feather',
  'Cooperativa suínos': 'fa-piggy-bank',
  'Distribuidor': 'fa-truck',
  'Fabricante de aditivos': 'fa-flask',
  'Fazenda gado de corte': 'fa-cow',
  'Fazenda gado de leite': 'fa-cow',
  'Frango de corte Agrobig': 'fa-feather',
  'Frango de corte Agrosmall': 'fa-feather',
  'Matrizes': 'fa-dna',
  'Outros': 'fa-tag',
  'Palatabilizante': 'fa-utensils',
  'Pet food': 'fa-paw',
  'Postura Agrobig': 'fa-egg',
  'Postura Agrosmall': 'fa-egg',
  'Postura independente': 'fa-egg',
  'Premix de bovinos / Sal mineral': 'fa-cow',
  'Premix/Nucleos de suínos': 'fa-piggy-bank',
  'Ração Comercial': 'fa-shopping-bag',
  'Representante': 'fa-user-tie',
  'Suíno Agrobig': 'fa-piggy-bank',
  'Suíno independente': 'fa-piggy-bank',
  'Matriz frango de corte': 'fa-feather'
};

export const DEFAULT_AVATAR = "https://picsum.photos/200/200";