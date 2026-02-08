import { AuthProvider } from "@/lib/auth-context";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import VisitorTracker from "@/components/VisitorTracker";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-black text-white min-h-screen flex flex-col">
      <AuthProvider>
        <VisitorTracker />
        <Header />
        <main className="pt-14 sm:pt-16 flex-1">
          {children}
        </main>
        <Footer />
      </AuthProvider>
    </div>
  );
}
