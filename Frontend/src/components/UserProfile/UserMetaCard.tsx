import { useModal } from "../../hooks/useModal";
// import { Modal } from "../ui/modal";
import Button from "../ui/button/Button";
import Input from "../form/input/InputField";
import Label from "../form/Label";
import axios from "axios";
import { useEffect, useState } from "react";

export default function UserMetaCard() {
  const { isOpen, openModal, closeModal } = useModal();
  const handleSave = () => {
    // Handle save logic here
    console.log("Saving changes...");
    closeModal();
  };

  const [user, setUser] = useState<User | null>(null);

  interface User {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    role: string;
  }

  useEffect(() => {
    const fetchUserData = async () => {
      const token = localStorage.getItem("jwtToken");
      if (!token) return;

      try {
        const res = await axios.get("http://localhost:8000/me", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setUser(res.data.data);
      } catch (err) {
        console.error("Failed to fetch user info:", err);
      }
    };

    fetchUserData();
  }, []);

  return (
    <>
      <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-col items-center w-full gap-6 xl:flex-row">
            <div className="w-20 h-20 overflow-hidden border border-gray-200 rounded-full dark:border-gray-800">
              <img src="/images/user/owner.jpg" alt="user" />
            </div>
            <div className="order-3 xl:order-2">
              <h4 className="mb-2 text-lg font-semibold text-center text-gray-800 dark:text-white/90 xl:text-left">
                {user ? `${user.first_name}` : "Loading..."}{" "}
                {user ? `${user.last_name}` : "Loading..."}
              </h4>
              <div className="flex flex-col items-center gap-1 text-center xl:flex-row xl:gap-3 xl:text-left">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {user ? `${user.role}` : "Loading..."}
                </p>
                <div className="hidden h-3.5 w-px bg-gray-300 dark:bg-gray-700 xl:block"></div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {user ? `${user.email}` : "Loading..."}
                </p>
              </div>
            </div>

            <div className="flex items-center order-2 gap-2 grow xl:order-3 xl:justify-end">
              {/* social buttons omitted for brevity */}
            </div>
          </div>
        </div>
      </div>

      {/* 
      <Modal isOpen={isOpen} onClose={closeModal}>
        <div className="p-4 space-y-4">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Edit Profile</h2>
          <div className="space-y-2">
            <Label htmlFor="first_name">First Name</Label>
            <Input id="first_name" placeholder="First Name" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="last_name">Last Name</Label>
            <Input id="last_name" placeholder="Last Name" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" placeholder="Email" />
          </div>
          <div className="flex justify-end pt-4">
            <Button onClick={handleSave}>Save</Button>
          </div>
        </div>
      </Modal> 
      */}
    </>
  );
}
