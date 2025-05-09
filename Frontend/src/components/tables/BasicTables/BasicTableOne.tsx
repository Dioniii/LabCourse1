import { useEffect, useState } from "react";
import { jwtDecode } from "jwt-decode";
import axios from "axios";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../../ui/table";
import { useModal } from "../../../hooks/useModal";
import { Modal } from "../../ui/modal";
import Button from "../../ui/button/Button";
import Input from "../../form/input/InputField";
import Label from "../../form/Label";

interface Role {
  id: number;
  name: "admin" | "guest" | "cleaner";
}

interface User {
  id: number;
  firstName: string;
  lastName: string;
  role: Role;
  phone?: string;
}

interface RawUser {
  id: number;
  first_name: string;
  last_name: string;
  role: Role;
  phone?: string;
}

interface DecodedToken {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  role: string | Role;
  exp: number;
}

export default function BasicTableOne() {
  const [users, setUsers] = useState<User[]>([]);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [newRole, setNewRole] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [currentUserRole, setCurrentUserRole] = useState<"admin" | "guest" | "cleaner" | null>(null);
  const { isOpen, openModal, closeModal } = useModal();

  const [firstName, setFirstName] = useState<string>("");
  const [lastName, setLastName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [role, setRole] = useState<"admin" | "guest" | "cleaner">("guest");
  const [phone, setPhone] = useState<string>("");

  const handleDelete = (id: number) => {
    const token = localStorage.getItem("jwtToken");
    if (!window.confirm("Are you sure you want to delete this user?")) return;
  
    axios.delete(`http://localhost:8000/users/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then(() => {
        fetchUsers(); // Refresh the users list after delete
      })
      .catch(err => console.error("Error deleting user:", err));
  };

  const getCurrentUserRole = (): "admin" | "guest" | "cleaner" | null => {
    const token = localStorage.getItem("jwtToken");
    if (!token) return null;

    try {
      const decoded = jwtDecode<DecodedToken>(token);
      if (typeof decoded.role === "string") {
        return decoded.role as "admin" | "guest" | "cleaner";
      } else {
        return decoded.role.name;
      }
    } catch {
      return null;
    }
  };

  const fetchUsers = () => {
    const token = localStorage.getItem("jwtToken");
  
    if (!token) {
      console.error("No JWT token found. Please log in.");
    } else {
      axios.get("http://localhost:8000/users", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then(res => {
        if (res.data.success) {
          const formattedUsers: User[] = (res.data.data as RawUser[]).map((user) => ({
            id: user.id,
            firstName: user.first_name,
            lastName: user.last_name,
            role: user.role,
            phone: user.phone,
          }));
          setUsers(formattedUsers);
        } else {
          console.error("Data fetch error:", res.data.error);
        }
      })
      .catch(err => console.error("Error fetching users:", err));
    }
  };

  useEffect(() => {
    setCurrentUserRole(getCurrentUserRole());
    fetchUsers();

    const interval = setInterval(() => {
      fetchUsers(); 
    },);

    return () => clearInterval(interval);  
  }, []);

  const handleEdit = (id: number, currentRoleName: string) => {
    setEditingUserId(id);
    setNewRole(currentRoleName);
  };

  const handleSave = (id: number) => {
    const token = localStorage.getItem("jwtToken");

    const userToUpdate = users.find((user) => user.id === id);
    if (!userToUpdate) return;
  
    if (userToUpdate.role.name === newRole) {
      setEditingUserId(null);
      return;
    }

    axios.put(
      `http://localhost:8000/users/${id}/role`,
      { role: newRole },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    )
      .then((res) => {
        if (res.data.success) {
          const updatedUser = res.data.user;
  
          setUsers(prevUsers =>
            prevUsers.map(user =>
              user.id === updatedUser.id
                ? {
                    ...user,
                    role: {
                      id: updatedUser.role_id,
                      name: updatedUser.role_name
                    }
                  }
                : user
            )
          );
          setEditingUserId(null);  
        } else {
          console.error("Error updating role:", res.data.error);
        }
      })
      .catch(err => {
        console.error("Error updating role:", err);
        setEditingUserId(null);
      });
  };
  
  const handleCreate = () => {
    const token = localStorage.getItem("jwtToken");
  
    if (!firstName || !lastName || !email || !password || !role) {
      alert("Please fill in all fields.");
      return;
    }
  
    axios.post(
      "http://localhost:8000/users",
      {
        first_name: firstName,
        last_name: lastName,
        email: email,
        password: password,
        phone: phone,
        role: role,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    )
      .then((res) => {
        if (res.data.success) {
          const newUser: User = {
            id: res.data.user.id,
            firstName: res.data.user.first_name,
            lastName: res.data.user.last_name,
            role: res.data.user.role,
            phone: res.data.user.phone,
          };
  
          setUsers(prevUsers => [...prevUsers, newUser]);

          // Reset form fields
          setFirstName("");
          setLastName("");
          setEmail("");
          setPassword("");
          setPhone("");
          setRole("guest");
          
          // Close modal
          closeModal();
        }
      })
      .catch((err) => {
        console.error("Error creating user:", err.response?.data || err.message);
      });
  };
  
  const filteredUsers = users.filter((user) =>
    `${user.firstName} ${user.lastName}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
      <div className="p-4">
        <Input
          placeholder="Kërko përdorues..."
          className="w-1/3"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
  
      {currentUserRole === "admin" && (
        <div className="p-4">
          <Button onClick={openModal}>Create New User</Button>
        </div>
      )}
  
      <div className="max-w-full overflow-x-auto">
        <Table>
          <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
            <TableRow>
              <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start">ID</TableCell>
              <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start">First Name</TableCell>
              <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start">Last Name</TableCell>
              <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start">Role</TableCell>
              <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start">Action</TableCell>
              <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start">Delete</TableCell>
            </TableRow>
          </TableHeader>
  
          <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
            {filteredUsers.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="px-5 py-4 text-start">{user.id}</TableCell>
                <TableCell className="px-5 py-4 text-start">{user.firstName}</TableCell>
                <TableCell className="px-5 py-4 text-start">{user.lastName}</TableCell>
                <TableCell className="px-5 py-4 text-start">
                  {editingUserId === user.id ? (
                    <select
                      className="border px-2 py-1 rounded"
                      value={newRole}
                      onChange={(e) => setNewRole(e.target.value)}
                    >
                      <option value="admin">admin</option>
                      <option value="cleaner">cleaner</option>
                      <option value="guest">guest</option>
                    </select>
                  ) : (
                    user.role.name
                  )}
                </TableCell>
                <TableCell className="px-5 py-4 text-start">
                  {currentUserRole === "admin" && (
                    editingUserId === user.id ? (
                      <Button onClick={() => handleSave(user.id)}>Save</Button>
                    ) : (
                      <Button onClick={() => handleEdit(user.id, user.role.name)}>Edit</Button>
                    )
                  )}
                </TableCell>
                <TableCell className="px-5 py-4 text-start">
                  {currentUserRole === "admin" && (
                    <Button
                      onClick={() => handleDelete(user.id)}
                      className="text-sm px-3 py-1 rounded bg-red-500 text-white hover:bg-red-600"
                    >
                      Delete
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Modal isOpen={isOpen} onClose={closeModal} className="max-w-[700px] m-4">
        <div className="no-scrollbar relative w-full max-w-[700px] overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-11">
          <div className="px-2 pr-14">
            <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
              Create New User
            </h4>
            <p className="mb-6 text-sm text-gray-500 dark:text-gray-400 lg:mb-7">
              Fill in the details to create a new user account.
            </p>
          </div>
          <form className="flex flex-col">
            <div className="custom-scrollbar h-[300px] overflow-y-auto px-2 pb-3">
              <div className="mt-7">
                <h5 className="mb-5 text-lg font-medium text-gray-800 dark:text-white/90 lg:mb-6">
                  User Information
                </h5>
                <div className="grid grid-cols-1 gap-x-6 gap-y-5 lg:grid-cols-2">
                  <div>
                    <Label>First Name</Label>
                    <Input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="Enter first name"
                    />
                  </div>
                  <div>
                    <Label>Last Name</Label>
                    <Input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Enter last name"
                    />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter email"
                    />
                  </div>
                  <div>
                    <Label>Password</Label>
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter password"
                    />
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <Input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Enter phone number"
                    />
                  </div>
                  <div>
                    <Label>Role</Label>
                    <select
                      className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
                      value={role}
                      onChange={(e) => setRole(e.target.value as Role["name"])}
                    >
                      <option value="admin">Admin</option>
                      <option value="cleaner">Cleaner</option>
                      <option value="guest">Guest</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 px-2 mt-6 lg:justify-end">
              <button
                onClick={closeModal}
                className="flex w-full justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] sm:w-auto"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                className="flex w-full justify-center rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 sm:w-auto"
              >
                Create User
              </button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );  
}