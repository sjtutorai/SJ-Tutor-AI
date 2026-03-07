import React, { useState } from "react";
import { account } from "../appwriteConfig";
import { ID } from "appwrite";
import { useNavigate, Link } from "react-router-dom";
import { User, School, GraduationCap, Phone, ArrowRight, Loader2 } from "lucide-react";
import Logo from "../components/Logo";

const Signup = () => {
  const [formData, setFormData] = useState({
    name: "",
    grade: "",
    school: "",
    phone: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      // Store signup data temporarily in session storage to use after verification
      sessionStorage.setItem('pending_signup_data', JSON.stringify(formData));
      
      // Send OTP token to phone
      const token = await account.createPhoneToken(ID.unique(), formData.phone);
      navigate(`/verify?userId=${token.userId}&isSignup=true`);
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
          <h1 className="text-4xl font-light tracking-tight text-gray-900 mb-2">Create Account</h1>
          <p className="text-gray-500 font-light">Join the SJ Tutor AI community</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1">
            <label className="text-[11px] uppercase tracking-wider font-semibold text-gray-400 ml-1">Full Name</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                name="name"
                placeholder="John Doe"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-amber-500 transition-all outline-none text-gray-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[11px] uppercase tracking-wider font-semibold text-gray-400 ml-1">Grade</label>
              <div className="relative">
                <GraduationCap className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  name="grade"
                  placeholder="10th"
                  value={formData.grade}
                  onChange={handleChange}
                  required
                  className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-amber-500 transition-all outline-none text-gray-900"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] uppercase tracking-wider font-semibold text-gray-400 ml-1">School</label>
              <div className="relative">
                <School className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  name="school"
                  placeholder="DPS"
                  value={formData.school}
                  onChange={handleChange}
                  required
                  className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-amber-500 transition-all outline-none text-gray-900"
                />
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] uppercase tracking-wider font-semibold text-gray-400 ml-1">Phone Number</label>
            <div className="relative">
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="tel"
                name="phone"
                placeholder="+234 801 234 5678"
                value={formData.phone}
                onChange={handleChange}
                required
                className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-amber-500 transition-all outline-none text-gray-900"
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
            className="w-full py-4 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl font-bold shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5 disabled:opacity-70 mt-4"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <span>Create Account</span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            Already have an account?{" "}
            <Link to="/login" className="text-amber-600 font-bold hover:underline">
              Log In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup;
