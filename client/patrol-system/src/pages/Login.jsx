import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { apiCall } from "@/lib/api"; // use apiCall instead of default import
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff } from "lucide-react"; // Eye icons

const Login = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false); // toggle state

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };
const handleSubmit = async (e) => {
  e.preventDefault();
  setLoading(true);

  try {
    const res = await apiCall("/auth/login", {
      method: "POST",
      body: {
        email: form.email.trim().toLowerCase(),
        password: form.password.trim(),
      },
    });

    if (!res.success) {
      throw new Error(res.message || "Login failed");
    }

    // match backend response
    const { user, role, token } = res.data;

    if (!token || !role) {
      throw new Error("Invalid login response: missing token or role");
    }

    localStorage.setItem("token", token);
    // save role inside user object so useAuth can read it
    localStorage.setItem("user", JSON.stringify({ ...user, role }));

    alert(" Login successful!");

    if (role === "admin") {
      navigate("/admin");
    } else {
      navigate("/guard");
    }
  } catch (err) {
    console.error("Login error:", err);
    alert(" Invalid credentials.");
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="h-screen flex items-center justify-center bg-gray-100">
      <Card className="w-[400px] p-6">
        <CardHeader>
          <CardTitle className="text-center">Login</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4 relative">
            <Input
              name="email"
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={handleChange}
              required
            />

            <div className="relative">
              <Input
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={form.password}
                onChange={handleChange}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Logging in..." : "Login"}
            </Button>
          </form>

          <p className="text-sm text-center mt-4">
            Don't have an account?{" "}
            <Link to="/" className="text-green-600 hover:underline">
              Sign up
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
