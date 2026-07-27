export interface UserProfile {
  id: string;
  user_id: string;
  name: string;
  role: 'husband' | 'wife' | 'admin';
  email: string;
  created_at: string;
}

export interface Scan {
  id: string;
  user_id: string;
  scan_date: string; // YYYY-MM-DD
  weeks: number;
  days: number;
  crl_measurement: number;
  heart_rate: number;
  estimated_due_date: string; // YYYY-MM-DD
  notes: string;
  image_url: string;
  image_path: string;
  created_at: string;
  updated_at: string;
}

export interface Appointment {
  id: string;
  user_id: string;
  appointment_type: 'midwife' | 'ultrasound' | 'scan' | 'checkup' | 'other';
  appointment_date: string; // ISO 8601
  hospital_name: string;
  location: string;
  healthcare_provider: string;
  notes: string;
  reminder_enabled: boolean;
  reminder_days_before: number; // 1, 3, 7
  status: 'scheduled' | 'completed' | 'cancelled';
  created_at: string;
}

export interface Finance {
  id: string;
  user_id: string;
  transaction_date: string; // YYYY-MM-DD
  amount: number;
  contributed_by: 'husband' | 'wife' | 'both';
  category: 'savings' | 'purchase' | 'medical' | 'other';
  description: string;
  notes: string;
  created_at: string;
}

export interface ShoppingItem {
  id: string;
  user_id: string;
  item_name: string;
  quantity: number;
  category: 'clothing' | 'furniture' | 'toiletries' | 'medical' | 'feeding' | 'transport' | 'other';
  estimated_price: number;
  purchased: boolean;
  purchase_date?: string; // YYYY-MM-DD
  actual_price?: number;
  vendor: string;
  notes: string;
  priority: 'high' | 'medium' | 'low';
  created_at: string;
}

export interface HospitalBagItem {
  id: string;
  user_id: string;
  item_name: string;
  category: 'mother' | 'baby' | 'documents' | 'other';
  is_packed: boolean;
  packed_date?: string; // YYYY-MM-DD
  is_custom: boolean;
  created_at: string;
}

export interface JournalNote {
  id: string;
  user_id: string;
  title: string;
  content: string; // Rich text / HTML
  category: 'pregnancy' | 'baby' | 'feelings' | 'memory' | 'planning' | 'general';
  mood: 'happy' | 'anxious' | 'tired' | 'excited' | 'overwhelmed';
  tags: string[];
  image_url?: string;
  created_at: string;
  updated_at: string;
  is_pinned: boolean;
}

export interface Reminder {
  id: string;
  user_id: string;
  reminder_type: 'appointment' | 'scan' | 'checkup' | 'purchase' | 'custom' | 'medication' | 'supplement';
  title: string;
  description: string;
  reminder_date: string; // YYYY-MM-DD
  reminder_time: string; // HH:MM
  frequency: 'once' | 'daily' | 'weekly' | 'monthly';
  is_active: boolean;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  user_id: string;
  user_name: string;
  user_role: 'husband' | 'wife' | 'admin';
  activity_type: string;
  description: string;
  created_at: string;
}

export interface BabyPhoto {
  id: string;
  user_id: string;
  user_name?: string;
  title: string;
  caption?: string;
  photo_url: string;
  storage_path?: string;
  storage_provider?: 'supabase' | 'local';
  milestone_week?: string;
  created_at: string;
}

export interface GeneralFolder {
  id: string;
  user_id: string;
  name: string;
  color?: string;
  created_at: string;
}

export interface GeneralNote {
  id: string;
  user_id: string;
  folder_id: string | null;
  title: string;
  content: string;
  is_pinned?: boolean;
  color?: string;
  created_at: string;
  updated_at: string;
}
