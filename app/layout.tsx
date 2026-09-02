import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "منصة الحجز الطبي - عيادة الدكتور زكرياء بوشلاغم",
  description: "نظام حجز الـمواعيد الطبية المباشر والتأكيد السريع بدون تسجيل حساب",
  keywords: ["حجز موعد طبي", "عيادة طبية", "استشارة طبية", "طبيب أسنان", "طبيب عام"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" className="scroll-smooth">
      <body className="font-cairo bg-slate-50 text-slate-900 min-h-screen flex flex-col antialiased selection:bg-teal-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
