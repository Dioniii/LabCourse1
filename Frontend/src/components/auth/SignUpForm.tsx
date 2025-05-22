import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronLeftIcon, EyeCloseIcon, EyeIcon } from "../../icons";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import Checkbox from "../form/input/Checkbox";

export default function SignUpForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    if (!isChecked) {
      setError("You must agree to the Terms and Conditions.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("http://localhost:8000/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
  const errorMsg = data.message || data.error || "Login failed";
  throw new Error(errorMsg);
}


      alert("Registration successful!");

      // Clear form
      setFormData({
        first_name: "",
        last_name: "",
        email: "",
        phone: "",
        password: "",
      });
      setIsChecked(false);

      // Navigate to signin
      navigate("/signin");
    } catch (err) {
      console.error("Error:", err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unknown error occurred");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 w-full overflow-y-auto lg:w-1/2 no-scrollbar">
      <div className="w-full max-w-md mx-auto mb-5 sm:pt-10"></div>
      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
        <form onSubmit={handleSubmit}>
          <div className="mb-5 sm:mb-8">
            <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
              Sign Up
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Enter your email and password to sign up!
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-5">
            <div className="sm:col-span-1">
              <Label>
                First Name<span className="text-error-500">*</span>
              </Label>
              <Input
                type="text"
                id="first_name"
                name="first_name"
                placeholder="Enter your first name"
                onChange={handleChange}
                value={formData.first_name}
              />
            </div>
            <div className="sm:col-span-1">
              <Label>
                Last Name<span className="text-error-500">*</span>
              </Label>
              <Input
                type="text"
                id="last_name"
                name="last_name"
                placeholder="Enter your last name"
                onChange={handleChange}
                value={formData.last_name}
              />
            </div>
          </div>

          <div>
            <Label>
              Email<span className="text-error-500">*</span>
            </Label>
            <Input
              type="email"
              id="email"
              name="email"
              placeholder="Enter your email"
              onChange={handleChange}
              value={formData.email}
            />
          </div>

          <div>
            <Label>
              Phone Number<span className="text-error-500">*</span>
            </Label>
            <Input
              type="tel"
              id="phone"
              name="phone"
              placeholder="Enter your phone number"
              onChange={handleChange}
              value={formData.phone}
            />
          </div>

          <div>
            <Label>
              Password<span className="text-error-500">*</span>
            </Label>
            <div className="relative">
              <Input
                placeholder="Enter your password"
                type={showPassword ? "text" : "password"}
                name="password"
                onChange={handleChange}
                value={formData.password}
              />
              <span
                onClick={() => setShowPassword(!showPassword)}
                className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2"
              >
                {showPassword ? (
                  <EyeIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
                ) : (
                  <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
                )}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 mt-3">
            <Checkbox
              className="w-5 h-5"
              checked={isChecked}
              onChange={setIsChecked}
            />
            <p className="inline-block font-normal text-gray-500 dark:text-gray-400">
              By creating an account, you agree to the{" "}
              <span className="text-gray-800 dark:text-white/90">
                Terms and Conditions
              </span>{" "}
              and our{" "}
              <span className="text-gray-800 dark:text-white">
                Privacy Policy
              </span>
              .
            </p>
          </div>

          {error && <div className="mt-2 text-red-500">{error}</div>}

          <div className="mt-5">
            <button
              type="submit"
              className="flex items-center justify-center w-full px-4 py-3 text-sm font-medium text-white transition rounded-lg bg-brand-500 shadow-theme-xs hover:bg-brand-600"
              disabled={loading}
            >
              {loading ? "Registering..." : "Sign Up"}
            </button>
          </div>

          <div className="mt-5">
            <p className="text-sm font-normal text-center text-gray-700 dark:text-gray-400 sm:text-start">
              Already have an account?{" "}
              <Link
                to="/signin"
                className="text-brand-500 hover:text-brand-600 dark:text-brand-400"
              >
                Sign In
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
