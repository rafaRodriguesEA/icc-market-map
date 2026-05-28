
import { database, storage } from '../firebase';
import { ref as dbRef, push, set, onValue, remove, update, DataSnapshot, get } from "firebase/database";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { Client, UserProfile, AppSettings, AccessLevel, Product, MarketEntry } from '../types';

const CLIENTS_PATH = 'clients';
const USERS_PATH = 'users';
const SETTINGS_PATH = 'settings';
const PRODUCTS_PATH = 'products';
const MARKET_PATH = 'market_prices';

// Helper to remove undefined values
const sanitize = <T>(obj: T): T => {
  return JSON.parse(JSON.stringify(obj));
};

// --- Clients ---

export const subscribeToClients = (currentUser: UserProfile, callback: (clients: Client[]) => void) => {
  const clientsRef = dbRef(database, CLIENTS_PATH);
  
  return onValue(clientsRef, (snapshot: DataSnapshot) => {
    const data = snapshot.val();
    if (data) {
      let clientList: Client[] = Object.keys(data).map(key => ({
        ...data[key],
        id: key,
        contacts: data[key].contacts || [] // Ensure contacts array exists
      }));

      // RLS (Row Level Security) Logic Implementation
      if (currentUser.email === 'giovane.santos@iccbrazil.com.br') {
        // Master Superadmin sees everything
      } else {
        switch (currentUser.accessLevel) {
          case AccessLevel.SUPERADMIN:
          case AccessLevel.CEO:
          case AccessLevel.DIRECTOR:
            // See everything
            break;
          case AccessLevel.MANAGER:
            // See own + subordinates
            const allowedIds = [currentUser.uid, ...(currentUser.subordinates || [])];
            clientList = clientList.filter(c => allowedIds.includes(c.ownerId));
            break;
          case AccessLevel.SELLER:
            // See own only
            clientList = clientList.filter(c => c.ownerId === currentUser.uid);
            break;
          case AccessLevel.OTHER:
             // Custom logic
             const customAllowed = [currentUser.uid, ...(currentUser.canViewSpecificUsers || [])];
             clientList = clientList.filter(c => customAllowed.includes(c.ownerId));
             break;
          default:
            clientList = [];
        }
      }

      callback(clientList);
    } else {
      callback([]);
    }
  });
};

export const addClient = async (client: Omit<Client, 'id'>) => {
  const clientsRef = dbRef(database, CLIENTS_PATH);
  const newClientRef = push(clientsRef);
  await set(newClientRef, sanitize({
    ...client,
    createdAt: Date.now()
  }));
  return newClientRef.key;
};

export const updateClient = async (id: string, client: Partial<Client>) => {
  const clientRef = dbRef(database, `${CLIENTS_PATH}/${id}`);
  await update(clientRef, sanitize(client));
};

export const deleteClient = async (id: string) => {
  const clientRef = dbRef(database, `${CLIENTS_PATH}/${id}`);
  await remove(clientRef);
};

// --- Products ---

export const subscribeToProducts = (callback: (products: Product[]) => void) => {
  const productsRef = dbRef(database, PRODUCTS_PATH);
  return onValue(productsRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
      const list = Object.keys(data).map(key => ({
        ...data[key],
        id: key,
        variations: data[key].variations || []
      }));
      callback(list);
    } else {
      callback([]);
    }
  });
};

export const saveProduct = async (product: Product) => {
  const safeProduct = sanitize(product);
  if (product.id) {
    const { id, ...rest } = safeProduct;
    await update(dbRef(database, `${PRODUCTS_PATH}/${id}`), rest);
  } else {
    const newRef = push(dbRef(database, PRODUCTS_PATH));
    await set(newRef, safeProduct);
  }
};

export const deleteProduct = async (id: string) => {
  await remove(dbRef(database, `${PRODUCTS_PATH}/${id}`));
};

// --- Market Intelligence (Competitor Prices) ---

export const subscribeToMarketPrices = (callback: (entries: MarketEntry[]) => void) => {
  const marketRef = dbRef(database, MARKET_PATH);
  return onValue(marketRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
      const list = Object.keys(data).map(key => ({
        ...data[key],
        id: key
      })).sort((a: any, b: any) => b.date.localeCompare(a.date)); // Sort by Date Descending
      callback(list);
    } else {
      callback([]);
    }
  });
};

export const saveMarketEntry = async (entry: MarketEntry) => {
  const safeEntry = sanitize(entry);
  if (entry.id) {
    const { id, ...rest } = safeEntry;
    await update(dbRef(database, `${MARKET_PATH}/${id}`), rest);
  } else {
    const newRef = push(dbRef(database, MARKET_PATH));
    await set(newRef, { ...safeEntry, createdAt: Date.now() });
  }
};

export const deleteMarketEntry = async (id: string) => {
  await remove(dbRef(database, `${MARKET_PATH}/${id}`));
};


// --- Storage ---

export const uploadFile = async (file: File, path: string): Promise<string> => {
  const fileRef = storageRef(storage, `${path}/${Date.now()}_${file.name}`);
  const snapshot = await uploadBytes(fileRef, file);
  return await getDownloadURL(snapshot.ref);
};

export const uploadLogo = async (file: File): Promise<string> => {
  return uploadFile(file, 'logos');
};

// --- Users ---

export const saveUser = async (user: UserProfile) => {
  const userRef = dbRef(database, `${USERS_PATH}/${user.uid}`);
  await set(userRef, sanitize(user));
};

export const subscribeToUsers = (callback: (users: UserProfile[]) => void) => {
  const usersRef = dbRef(database, USERS_PATH);
  return onValue(usersRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
      callback(Object.values(data));
    } else {
      callback([]);
    }
  });
};

export const deleteUser = async (uid: string) => {
    // Prevent deleting master admin
    const snapshot = await get(dbRef(database, `${USERS_PATH}/${uid}`));
    const user = snapshot.val() as UserProfile;
    if (user && user.email === 'giovane.santos@iccbrazil.com.br') {
        throw new Error("Cannot delete Master Superadmin");
    }
    await remove(dbRef(database, `${USERS_PATH}/${uid}`));
}

// --- Settings ---

const DEFAULT_SEGMENTS = [
  "Agricola",
  "Biológicos",
  "Cooperativa bovinos",
  "Cooperativa frango de corte",
  "Cooperativa suínos",
  "Distribuidor",
  "Fabricante de aditivos",
  "Fazenda gado de corte",
  "Fazenda gado de leite",
  "Frango de corte Agrobig",
  "Frango de corte Agrosmall",
  "Matrizes",
  "Outros",
  "Palatabilizante",
  "Pet food",
  "Postura Agrobig",
  "Postura Agrosmall",
  "Postura independente",
  "Premix de bovinos / Sal mineral",
  "Premix/Nucleos de suínos",
  "Ração Comercial",
  "Representante",
  "Suíno Agrobig",
  "Suíno independente",
  "Matriz frango de corte"
].sort();

const DEFAULT_PRODUCT_TYPES = [
  "Hydrolyzed Yeast",
  "Inactive Yeast",
  "Autolysed Yeast",
  "Yeast Cell Wall",
  "Yeast Extract",
  "Brewers Yeast",
  "Distillers Yeast"
];

export const subscribeToSettings = (callback: (settings: AppSettings) => void) => {
  const settingsRef = dbRef(database, SETTINGS_PATH);
  return onValue(settingsRef, (snapshot) => {
    const data = snapshot.val();
    // Provide defaults if not exists
    const defaults: AppSettings = {
        departments: ['Comercial', 'Financeiro', 'Logística'],
        packagings: ['25kg', 'Big Bag'],
        incoterms: ['CIF', 'FOB', 'DDP', 'FCA'],
        clientSegments: DEFAULT_SEGMENTS,
        productTypes: DEFAULT_PRODUCT_TYPES,
        logoUrl: '',
        coverImageUrl: ''
    };
    
    // Merge defaults
    const mergedSettings = data ? { ...defaults, ...data } : defaults;
    
    // Ensure nested arrays exist (firebase removes empty arrays)
    if (!mergedSettings.clientSegments) mergedSettings.clientSegments = DEFAULT_SEGMENTS;
    if (!mergedSettings.productTypes) mergedSettings.productTypes = DEFAULT_PRODUCT_TYPES;
    if (!mergedSettings.departments) mergedSettings.departments = defaults.departments;
    if (!mergedSettings.packagings) mergedSettings.packagings = defaults.packagings;
    if (!mergedSettings.incoterms) mergedSettings.incoterms = defaults.incoterms;
    
    callback(mergedSettings);
  });
};

export const updateSettings = async (settings: Partial<AppSettings>) => {
  const settingsRef = dbRef(database, SETTINGS_PATH);
  await update(settingsRef, sanitize(settings));
};

// Generic list management for settings
export const addToList = async (listName: keyof AppSettings, item: string) => {
  const snapshot = await get(dbRef(database, `${SETTINGS_PATH}/${listName}`));
  const currentList = snapshot.val() || [];
  if (!currentList.includes(item)) {
    // Sort automatically if it's clientSegments or productTypes
    let newList = [...currentList, item];
    if (listName === 'clientSegments' || listName === 'productTypes') {
        newList.sort();
    }
    await update(dbRef(database, SETTINGS_PATH), { [listName]: newList });
  }
};

export const removeFromList = async (listName: keyof AppSettings, item: string) => {
  const snapshot = await get(dbRef(database, `${SETTINGS_PATH}/${listName}`));
  const currentList: string[] = snapshot.val() || [];
  const newList = currentList.filter(d => d !== item);
  await update(dbRef(database, SETTINGS_PATH), { [listName]: newList });
};

// Convenience wrappers matching existing codebase style
export const addDepartment = (dept: string) => addToList('departments', dept);
export const removeDepartment = (dept: string) => removeFromList('departments', dept);

export const addPackaging = (pkg: string) => addToList('packagings', pkg);
export const removePackaging = (pkg: string) => removeFromList('packagings', pkg);

export const addIncoterm = (inc: string) => addToList('incoterms', inc);
export const removeIncoterm = (inc: string) => removeFromList('incoterms', inc);

export const addClientSegment = (seg: string) => addToList('clientSegments', seg);
export const removeClientSegment = (seg: string) => removeFromList('clientSegments', seg);

export const addProductType = (type: string) => addToList('productTypes', type);
export const removeProductType = (type: string) => removeFromList('productTypes', type);
