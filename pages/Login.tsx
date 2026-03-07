import React, { useState } from "react";
import { account } from "../appwriteConfig";
import { ID } from "appwrite";
import { useNavigate, Link } from "react-router-dom";
import { Phone, ArrowRight, Loader2 } from "lucide-react";
import Logo from "../components/Logo";

const Login = () => {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const token = await account.createPhoneToken(ID.unique(), phone);
      navigate(`/verify?userId=${token.userId}`);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to send verification code.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md bg-white rounded-[32px] shadow-sm p-8 md:p-12 border border-black/5">
        <div className="flex justify-center mb-8">
          <Logo className="w-16 h-16" iconOnly />
        </div>
        
        <div className="text-center mb-10">
          <h1 className="text-4xl font-light tracking-tight text-gray-900 mb-2">Welcome Back</h1>
          <p className="text-gray-500 font-light">Enter your phone number to sign in</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[11px] uppercase tracking-wider font-semibold text-gray-400 ml-1">Phone Number</label>
            <div className="relative">
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="tel"
                placeholder="+234 801 234 5678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                className="w-full pl-12 pr-4 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-amber-500 transition-all outline-none text-gray-900"
              />
            </div>
          </div>

          {error && (
            <div className="text-sm text-red-500 bg-red-50 p-3 rounded-xl border border-red-100">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl font-bold shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5 disabled:opacity-70"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <span>Send Code</span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>

        <div className="mt-10 text-center">
          <p className="text-sm text-gray-500">
            Don&apos;t have an account?{" "}
            <Link to="/signup" className="text-amber-600 font-bold hover:underline">
              Sign Up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
