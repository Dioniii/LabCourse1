import { useEffect, useState } from "react";
import axios from "axios";
import Input from "../../form/input/InputField";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
} from "../../ui/table";

// Tipi për një cleaner
type Cleaner = {
  id: number;
  first_name: string;
  last_name: string;
  role: string;
};

const RecentCleanersList = () => {
  const [cleaners, setCleaners] = useState<Cleaner[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
  const fetchCleaners = async () => {
    try {
      const response = await axios.get("http://localhost:3000/cleaners"); 
      console.log("Fetched cleaners:", response.data);
      setCleaners(response.data);
    } catch (error) {
      console.error("Error fetching cleaners:", error);
      }
    };
    fetchCleaners();
  }, []);


  const filteredCleaners = cleaners.filter((user) => {
    const fullName = `${user.first_name || ''} ${user.last_name || ''}`.toLowerCase();
    return fullName.includes(searchTerm.toLowerCase());
  });

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Cleaners</h2>
        <p className="text-gray-600 dark:text-gray-400">View the list of all cleaner staff</p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
        <div className="p-4">
          <div className="w-full sm:w-1/3">
            <Input
              placeholder="Search Cleaners..."
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="max-w-full overflow-x-auto">
          <Table>
            <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
              <TableRow>
                <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start">ID</TableCell>
                <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start">First Name</TableCell>
                <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start">Last Name</TableCell>
                <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start">Role</TableCell>
              </TableRow>
            </TableHeader>

            <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {filteredCleaners.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="px-5 py-4 text-start font-medium">{user.id}</TableCell>
                  <TableCell className="px-5 py-4 text-start">{user.first_name}</TableCell>
                  <TableCell className="px-5 py-4 text-start">{user.last_name}</TableCell>
                  <TableCell className="px-5 py-4 text-start">
                    <span className="inline-flex items-center rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-medium text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                      {user.role}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};

export default RecentCleanersList;