import { useEffect, useState } from "react";
import axios from "axios";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../../ui/table";

const Button = ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button className="bg-blue-600 text-white px-4 py-2 rounded" {...props}>
    {children}
  </button>
);

const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input className="border px-2 py-1 rounded w-full" {...props} />
);

interface User {
  id: number;
  firstName: string;
  lastName: string;
  role: "admin" | "staff" | "guest";
}

interface RawUser {
  id: number;
  first_name: string;
  last_name: string;
  role: "admin" | "staff" | "guest";
}

export default function BasicTableOne() {
  const [users, setUsers] = useState<User[]>([]);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [newRole, setNewRole] = useState<string>("");

  const fetchUsers = () => {
    const token = localStorage.getItem("jwtToken");

    if (!token) {
      console.error("No JWT token found. Please log in.");
    } else {
      axios.get("http://localhost:8000/users", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      .then(res => {
        if (res.data.success) {
          const formattedUsers: User[] = (res.data.data as RawUser[]).map((user) => ({
            id: user.id,
            firstName: user.first_name,
            lastName: user.last_name,
            role: user.role,
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
    fetchUsers();
  }, []);

  const handleEdit = (id: number, currentRole: string) => {
    setEditingUserId(id);
    setNewRole(currentRole);
  };

  const handleSave = (id: number) => {
    axios.put(`http://localhost:8000/users/${id}/role`, { role: newRole })
      .then(() => {
        setUsers(prev => prev.map(user =>
          user.id === id ? { ...user, role: newRole as User["role"] } : user
        ));
        setEditingUserId(null);
      })
      .catch(err => console.error("Error updating role:", err));
  };

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
      <div className="p-4">
        <Input
          placeholder="Kërko përdorues..."
          className="w-1/3"
        />
      </div>

      <div className="max-w-full overflow-x-auto">
        <Table>
          <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
            <TableRow>
              <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start">ID</TableCell>
              <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start">First Name</TableCell>
              <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start">Last Name</TableCell>
              <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start">Role</TableCell>
              <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start">Action</TableCell>
            </TableRow>
          </TableHeader>

          <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
            {users.map((user) => (
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
                      <option value="staff">staff</option>
                      <option value="guest">guest</option>
                    </select>
                  ) : (
                    user.role
                  )}
                </TableCell>
                <TableCell className="px-5 py-4 text-start">
                  {editingUserId === user.id ? (
                    <Button onClick={() => handleSave(user.id)}>Save</Button>
                  ) : (
                    <Button onClick={() => handleEdit(user.id, user.role)}>Edit</Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
