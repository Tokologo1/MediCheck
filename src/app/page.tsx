import Link from "next/link";
import { Pill, Search, Shield, Clock, CheckCircle } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <Pill className="h-7 w-7 text-emerald-600" />
            <span className="text-xl font-bold text-gray-900">MediCheck</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
            >
              Login
            </Link>
            <Link
              href="/register"
              className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors"
            >
              Register
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-emerald-50 via-white to-teal-50 py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-sm font-medium mb-6">
              <Pill className="h-4 w-4" />
              Your Trusted Medication Checker
            </div>
            <h1 className="text-4xl lg:text-6xl font-bold text-gray-900 leading-tight">
              Check if your medication is{" "}
              <span className="text-emerald-600">available</span>
            </h1>
            <p className="mt-6 text-lg text-gray-600 leading-relaxed">
              MediCheck helps you find medication availability across multiple dispensaries in
              real-time. No more wasted trips or phone calls — search once and see where your
              prescription is in stock.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/register"
                className="w-full sm:w-auto px-6 py-3 text-base font-medium text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-600/25"
              >
                Get Started — It&apos;s Free
              </Link>
              <Link
                href="/login"
                className="w-full sm:w-auto px-6 py-3 text-base font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
              >
                I have an account
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900">Why MediCheck?</h2>
            <p className="mt-4 text-gray-600 max-w-2xl mx-auto">
              Designed to save you time and ensure you get the medication you need, when you need it.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              icon={<Search className="h-6 w-6" />}
              title="Real-Time Search"
              description="Search across all partner dispensaries instantly. See stock levels, prices, and dispensary details in one place."
            />
            <FeatureCard
              icon={<Shield className="h-6 w-6" />}
              title="Secure & Private"
              description="Your health data is protected with industry-standard encryption, JWT authentication, and strict access controls."
            />
            <FeatureCard
              icon={<Clock className="h-6 w-6" />}
              title="Always Up to Date"
              description="Dispensary inventory is updated in real-time so you always see accurate availability information."
            />
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900">How It Works</h2>
            <p className="mt-4 text-gray-600">Three simple steps to find your medication</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <StepCard
              step={1}
              title="Create an Account"
              description="Sign up with your email and a secure password. It only takes a minute."
            />
            <StepCard
              step={2}
              title="Search Medications"
              description="Type the name of your medication and instantly see which dispensaries have it in stock."
            />
            <StepCard
              step={3}
              title="Visit & Collect"
              description="Choose the nearest dispensary with stock and head there to collect your medication."
            />
          </div>
        </div>
      </section>

      {/* Trusted Features */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 lg:px-8">
          <div className="text-center">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-8">
              Trusted Security Features
            </h3>
            <div className="flex flex-wrap justify-center gap-x-12 gap-y-4">
              {[
                "JWT Authentication",
                "Encrypted Passwords",
                "CSRF Protection",
                "Rate Limiting",
                "SQL Injection Safe",
                "XSS Protected",
              ].map((feature) => (
                <div key={feature} className="flex items-center gap-2 text-gray-600">
                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                  <span className="text-sm font-medium">{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Pill className="h-5 w-5 text-emerald-500" />
              <span className="text-sm font-semibold text-white">MediCheck</span>
            </div>
            <p className="text-sm">
              &copy; {new Date().getFullYear()} MediCheck. Secure medication availability checking.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="p-6 rounded-xl border border-gray-200 hover:border-emerald-200 hover:shadow-lg transition-all">
      <div className="p-3 bg-emerald-50 rounded-lg w-fit text-emerald-600">{icon}</div>
      <h3 className="mt-4 text-lg font-semibold text-gray-900">{title}</h3>
      <p className="mt-2 text-sm text-gray-600 leading-relaxed">{description}</p>
    </div>
  );
}

function StepCard({ step, title, description }: { step: number; title: string; description: string }) {
  return (
    <div className="text-center">
      <div className="mx-auto w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center text-lg font-bold">
        {step}
      </div>
      <h3 className="mt-4 text-lg font-semibold text-gray-900">{title}</h3>
      <p className="mt-2 text-sm text-gray-600">{description}</p>
    </div>
  );
}
