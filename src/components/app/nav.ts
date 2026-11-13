import {
  Bell,
  BookOpen,
  CalendarDays,
  CalendarCheck,
  GraduationCap,
  LayoutDashboard,
  NotebookPen,
  Repeat,
  Settings,
  Sparkles,
  Target,
} from "lucide-react";

export const NAV = [
  { href: "/", label: "Pulpit", icon: LayoutDashboard },
  { href: "/asystent", label: "Asystent AI", icon: Sparkles },
  { href: "/uczelnia", label: "Uczelnia", icon: GraduationCap },
  { href: "/materialy", label: "Materiały do nauki", icon: BookOpen },
  { href: "/planer", label: "Planer dnia", icon: CalendarCheck },
  { href: "/kalendarz", label: "Kalendarz", icon: CalendarDays },
  { href: "/cele", label: "Cele", icon: Target },
  { href: "/nawyki", label: "Nawyki", icon: Repeat },
  { href: "/dziennik", label: "Dziennik", icon: NotebookPen },
  { href: "/powiadomienia", label: "Przypomnienia", icon: Bell },
  { href: "/ustawienia", label: "Ustawienia", icon: Settings },
] as const;
