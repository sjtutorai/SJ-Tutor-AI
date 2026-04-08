import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { account } from "../appwriteConfig";
import { KeyRound, ArrowRight, Loader2, RefreshCw } from "lucide-react";
import Logo from "../components/Logo";

const Verify = () => {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const userId = searchParams.get("userId");
  const isSignup = searchParams.get("isSignup") === "true";

  useEffect(() => {
    if (!userId) {
      navigate("/login");
    }
  }, [userId, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (!userId) throw new Error("User ID is missing.");
      
      // Verify OTP and create session
      const session = await account.createSession(userId, code);
      console.log("Session created:", session);

      // If it was a signup, we can retrieve the pending data and save it to profile
      if (isSignup) {
        const pendingData = sessionStorage.getItem('pending_signup_data');
        if (pendingData) {
          const profile = JSON.parse(pendingData);
          // Here you would typically save this to your database or Appwrite user preferences
          localStorage.setItem(`profile_${session.userId}`, JSON.stringify({
            displayName: profile.name,
            grade: profile.grade,
            institution: profile.school,
            phoneNumber: profile.phone,
            credits: 100,
            planType: 'Free'
          }));
          sessionStorage.removeItem('pending_signup_data');
        }
      }

      navigate("/");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Invalid verification code.");
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
          <h1 className="text-4xl font-light tracking-tight text-gray-900 mb-2">Verify Phone</h1>
          <p className="text-gray-500 font-light">Enter the 6-digit code sent to your phone</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[11px] uppercase tracking-wider font-semibold text-gray-400 ml-1">Verification Code</label>
            <div className="relative">
              <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="123456"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
                className="w-full pl-12 pr-4 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-amber-500 transition-all outline-none text-gray-900 text-center tracking-[0.5em] text-xl font-bold"
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
                <span>Verify & Continue</span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>

        <div className="mt-10 text-center">
          <button 
            type="button"
            onClick={() => navigate(-1)}
            className="text-sm text-gray-500 flex items-center justify-center gap-2 mx-auto hover:text-gray-800 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Resend code or change number</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Verify;
