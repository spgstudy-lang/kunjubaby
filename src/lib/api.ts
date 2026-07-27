import { 
  Scan, 
  Appointment, 
  Finance, 
  ShoppingItem, 
  HospitalBagItem, 
  JournalNote, 
  Reminder, 
  UserProfile,
  ActivityLog,
  GeneralFolder,
  GeneralNote
} from "../types";

const API_BASE = "/api";

// Get token from local storage
const getHeaders = () => {
  const token = localStorage.getItem("kunju_baby_token") || localStorage.getItem("authToken");
  const headers: HeadersInit = {
    "Content-Type": "application/json"
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
};

async function safeFetch(url: string, options: RequestInit = {}): Promise<any> {
  const headers = getHeaders();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

  let res: Response;
  try {
    res = await fetch(url, {
      ...options,
      headers: {
        ...headers,
        ...options.headers
      },
      signal: controller.signal
    });
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === "AbortError") {
      throw new Error("Request timed out. Server may be slow or unavailable.");
    }
    throw err;
  }
  clearTimeout(timeoutId);

  if (!res.ok) {
    let errorMessage;
    try {
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") !== -1) {
        const errorData = await res.json();
        errorMessage = errorData.error || "An error occurred";
      } else {
        errorMessage = `Error ${res.status}: ${res.statusText}`;
      }
    } catch (e) {
      errorMessage = `Error ${res.status}: ${res.statusText}`;
    }
    throw new Error(errorMessage);
  }

  return res.json();
}

export const api = {
  // Auth
  async signup(data: any): Promise<{ user: UserProfile; token: string }> {
    const res = await fetch(`${API_BASE}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      let errorMessage;
      try {
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
          const errorData = await res.json();
          errorMessage = errorData.error || "Failed to register";
        } else {
          errorMessage = `Error ${res.status}: ${res.statusText}`;
        }
      } catch (e) {
        errorMessage = `Error ${res.status}: ${res.statusText}`;
      }
      throw new Error(errorMessage);
    }

    const result = await res.json();
    const token = result.token || result.user?.user_id || result.user?.id;
    if (token) {
      localStorage.setItem("kunju_baby_token", token);
      localStorage.setItem("authToken", token);
    }
    return { user: result.user, token };
  },

  async login(data: any): Promise<{ user: UserProfile; token: string }> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      let errorMessage;
      try {
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
          const errorData = await res.json();
          errorMessage = errorData.error || "Invalid credentials";
        } else {
          errorMessage = `Error ${res.status}: ${res.statusText}`;
        }
      } catch (e) {
        errorMessage = `Error ${res.status}: ${res.statusText}`;
      }
      throw new Error(errorMessage);
    }
    const result = await res.json();
    localStorage.setItem("kunju_baby_token", result.token);
    localStorage.setItem("authToken", result.token);
    return { user: result.user, token: result.token };
  },

  async getMe(): Promise<UserProfile> {
    const data = await safeFetch(`${API_BASE}/auth/me`);
    return data.user;
  },

  logout() {
    localStorage.removeItem("kunju_baby_token");
    localStorage.removeItem("authToken");
  },

  // Scans
  async getScans(): Promise<Scan[]> {
    return safeFetch(`${API_BASE}/scans`);
  },

  async createScan(data: Partial<Scan>): Promise<Scan> {
    return safeFetch(`${API_BASE}/scans`, {
      method: "POST",
      body: JSON.stringify(data)
    });
  },

  async updateScan(id: string, data: Partial<Scan>): Promise<Scan> {
    return safeFetch(`${API_BASE}/scans/${id}`, {
      method: "PUT",
      body: JSON.stringify(data)
    });
  },

  async deleteScan(id: string): Promise<any> {
    return safeFetch(`${API_BASE}/scans/${id}`, {
      method: "DELETE"
    });
  },

  // Appointments
  async getAppointments(): Promise<Appointment[]> {
    return safeFetch(`${API_BASE}/appointments`);
  },

  async createAppointment(data: Partial<Appointment>): Promise<Appointment> {
    return safeFetch(`${API_BASE}/appointments`, {
      method: "POST",
      body: JSON.stringify(data)
    });
  },

  async updateAppointment(id: string, data: Partial<Appointment>): Promise<Appointment> {
    return safeFetch(`${API_BASE}/appointments/${id}`, {
      method: "PUT",
      body: JSON.stringify(data)
    });
  },

  async deleteAppointment(id: string): Promise<any> {
    return safeFetch(`${API_BASE}/appointments/${id}`, {
      method: "DELETE"
    });
  },

  // Finances
  async getFinances(): Promise<Finance[]> {
    return safeFetch(`${API_BASE}/finances`);
  },

  async createFinance(data: Partial<Finance>): Promise<Finance> {
    return safeFetch(`${API_BASE}/finances`, {
      method: "POST",
      body: JSON.stringify(data)
    });
  },

  async updateFinance(id: string, data: Partial<Finance>): Promise<Finance> {
    return safeFetch(`${API_BASE}/finances/${id}`, {
      method: "PUT",
      body: JSON.stringify(data)
    });
  },

  async deleteFinance(id: string): Promise<any> {
    return safeFetch(`${API_BASE}/finances/${id}`, {
      method: "DELETE"
    });
  },

  // Shopping List
  async getShoppingList(): Promise<ShoppingItem[]> {
    return safeFetch(`${API_BASE}/shopping`);
  },

  async createShoppingItem(data: Partial<ShoppingItem> & { auto_log_to_finances?: boolean }): Promise<ShoppingItem> {
    return safeFetch(`${API_BASE}/shopping`, {
      method: "POST",
      body: JSON.stringify(data)
    });
  },

  async updateShoppingItem(id: string, data: Partial<ShoppingItem> & { auto_log_to_finances?: boolean }): Promise<ShoppingItem> {
    return safeFetch(`${API_BASE}/shopping/${id}`, {
      method: "PUT",
      body: JSON.stringify(data)
    });
  },

  async deleteShoppingItem(id: string): Promise<any> {
    return safeFetch(`${API_BASE}/shopping/${id}`, {
      method: "DELETE"
    });
  },

  // Hospital Bag Checklist
  async getHospitalBag(): Promise<HospitalBagItem[]> {
    return safeFetch(`${API_BASE}/hospital-bag`);
  },

  async createHospitalBagItem(data: Partial<HospitalBagItem>): Promise<HospitalBagItem> {
    return safeFetch(`${API_BASE}/hospital-bag`, {
      method: "POST",
      body: JSON.stringify(data)
    });
  },

  async updateHospitalBagItem(id: string, data: Partial<HospitalBagItem>): Promise<HospitalBagItem> {
    return safeFetch(`${API_BASE}/hospital-bag/${id}`, {
      method: "PUT",
      body: JSON.stringify(data)
    });
  },

  async deleteHospitalBagItem(id: string): Promise<any> {
    return safeFetch(`${API_BASE}/hospital-bag/${id}`, {
      method: "DELETE"
    });
  },

  async resetHospitalBag(): Promise<HospitalBagItem[]> {
    return safeFetch(`${API_BASE}/hospital-bag/reset`, {
      method: "POST"
    });
  },

  async clearHospitalBag(): Promise<HospitalBagItem[]> {
    return safeFetch(`${API_BASE}/hospital-bag/clear`, {
      method: "POST"
    });
  },

  // Journal Notes
  async getJournal(): Promise<JournalNote[]> {
    return safeFetch(`${API_BASE}/journal`);
  },

  async createJournalNote(data: Partial<JournalNote>): Promise<JournalNote> {
    return safeFetch(`${API_BASE}/journal`, {
      method: "POST",
      body: JSON.stringify(data)
    });
  },

  async updateJournalNote(id: string, data: Partial<JournalNote>): Promise<JournalNote> {
    return safeFetch(`${API_BASE}/journal/${id}`, {
      method: "PUT",
      body: JSON.stringify(data)
    });
  },

  async deleteJournalNote(id: string): Promise<any> {
    return safeFetch(`${API_BASE}/journal/${id}`, {
      method: "DELETE"
    });
  },

  // Reminders
  async getReminders(): Promise<Reminder[]> {
    return safeFetch(`${API_BASE}/reminders`);
  },

  async createReminder(data: Partial<Reminder>): Promise<Reminder> {
    return safeFetch(`${API_BASE}/reminders`, {
      method: "POST",
      body: JSON.stringify(data)
    });
  },

  async updateReminder(id: string, data: Partial<Reminder>): Promise<Reminder> {
    return safeFetch(`${API_BASE}/reminders/${id}`, {
      method: "PUT",
      body: JSON.stringify(data)
    });
  },

  async deleteReminder(id: string): Promise<any> {
    return safeFetch(`${API_BASE}/reminders/${id}`, {
      method: "DELETE"
    });
  },

  // Activities
  async getActivities(): Promise<ActivityLog[]> {
    return safeFetch(`${API_BASE}/activities`);
  },

  // Image Upload
  async uploadImage(filename: string, fileData: string, mimeType: string): Promise<{ imageUrl: string; imagePath: string }> {
    return safeFetch(`${API_BASE}/upload`, {
      method: "POST",
      body: JSON.stringify({ filename, fileData, mimeType })
    });
  },

  // Gemini AI endpoints
  async generateBabyNames(criteria: { gender?: string; startingLetter?: string; meaningTheme?: string; origin?: string; tags?: string[] }): Promise<any[]> {
    return safeFetch(`${API_BASE}/ai/baby-names`, {
      method: "POST",
      body: JSON.stringify(criteria)
    });
  },

  async getAiAdvice(currentWeek: number, query?: string): Promise<any> {
    return safeFetch(`${API_BASE}/ai/advisor`, {
      method: "POST",
      body: JSON.stringify({ currentWeek, query })
    });
  },

  // General Folders & Notes
  async getFolders(): Promise<GeneralFolder[]> {
    return safeFetch(`${API_BASE}/notes/folders`);
  },

  async createFolder(data: Partial<GeneralFolder>): Promise<GeneralFolder> {
    return safeFetch(`${API_BASE}/notes/folders`, {
      method: "POST",
      body: JSON.stringify(data)
    });
  },

  async updateFolder(id: string, data: Partial<GeneralFolder>): Promise<GeneralFolder> {
    return safeFetch(`${API_BASE}/notes/folders/${id}`, {
      method: "PUT",
      body: JSON.stringify(data)
    });
  },

  async deleteFolder(id: string): Promise<any> {
    return safeFetch(`${API_BASE}/notes/folders/${id}`, {
      method: "DELETE"
    });
  },

  async getNotes(): Promise<GeneralNote[]> {
    return safeFetch(`${API_BASE}/notes`);
  },

  async createNote(data: Partial<GeneralNote>): Promise<GeneralNote> {
    return safeFetch(`${API_BASE}/notes`, {
      method: "POST",
      body: JSON.stringify(data)
    });
  },

  async updateNote(id: string, data: Partial<GeneralNote>): Promise<GeneralNote> {
    return safeFetch(`${API_BASE}/notes/${id}`, {
      method: "PUT",
      body: JSON.stringify(data)
    });
  },

  async deleteNote(id: string): Promise<any> {
    return safeFetch(`${API_BASE}/notes/${id}`, {
      method: "DELETE"
    });
  }
};
