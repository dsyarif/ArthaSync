import React from 'react';
import {
  Utensils,
  ShoppingCart,
  Car,
  Zap,
  GraduationCap,
  HeartPulse,
  Film,
  PiggyBank,
  Briefcase,
  Coffee,
  Fuel,
  Gift,
  Home,
  Laptop,
  Plane,
  Shirt,
  Smartphone,
  Tag,
  MoreHorizontal,
  Wallet,
  TrendingUp,
  Coins,
  Banknote,
  LucideProps,
} from 'lucide-react';

export const ICON_OPTIONS: { id: string; label: string; icon: React.ComponentType<LucideProps> }[] = [
  { id: 'Utensils', label: 'Makanan', icon: Utensils },
  { id: 'ShoppingCart', label: 'Belanja', icon: ShoppingCart },
  { id: 'Car', label: 'Transportasi', icon: Car },
  { id: 'Zap', label: 'Tagihan/Listrik', icon: Zap },
  { id: 'GraduationCap', label: 'Pendidikan', icon: GraduationCap },
  { id: 'HeartPulse', label: 'Kesehatan', icon: HeartPulse },
  { id: 'Film', label: 'Hiburan', icon: Film },
  { id: 'PiggyBank', label: 'Tabungan', icon: PiggyBank },
  { id: 'Briefcase', label: 'Pekerjaan', icon: Briefcase },
  { id: 'Coffee', label: 'Kopi / Cafe', icon: Coffee },
  { id: 'Fuel', label: 'Bahan Bakar', icon: Fuel },
  { id: 'Gift', label: 'Hadiah / Donasi', icon: Gift },
  { id: 'Home', label: 'Rumah Tangga', icon: Home },
  { id: 'Laptop', label: 'Elektronik / Gadget', icon: Laptop },
  { id: 'Plane', label: 'Perjalanan', icon: Plane },
  { id: 'Shirt', label: 'Pakaian / Fashion', icon: Shirt },
  { id: 'Smartphone', label: 'Pulsa & Kuota', icon: Smartphone },
  { id: 'Tag', label: 'Lainnya', icon: Tag },
  { id: 'Wallet', label: 'Dompet / Kas', icon: Wallet },
  { id: 'Banknote', label: 'Uang Tunai / Gaji', icon: Banknote },
  { id: 'Coins', label: 'Investasi / Koin', icon: Coins },
  { id: 'TrendingUp', label: 'Keuntungan / Bisnis', icon: TrendingUp },
];

interface Props extends LucideProps {
  name: string;
}

export function CategoryIcon({ name, ...props }: Props) {
  const found = ICON_OPTIONS.find((item) => item.id.toLowerCase() === name.toLowerCase());
  const Component = found ? found.icon : MoreHorizontal;
  return <Component {...props} />;
}
