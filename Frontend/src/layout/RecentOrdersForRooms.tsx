import { useEffect, useState } from "react";
import axios from "axios";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../components/ui/table";

const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input className="border px-2 py-1 rounded w-full" {...props} />
);

interface Room {
  id: number;
  room_number: string;
  category: "Standard" | "Deluxe" | "Suite";
  price: number;
  status: "Available" | "Occupied" | "Maintenance";
  maintenance_notes: string | null;
}

const RecentOrdersForRooms = () => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchRooms = () => {
    const token = localStorage.getItem("jwtToken");

    axios
      .get("http://localhost:8000/rooms", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        if (res.data.success) {
          setRooms(res.data.data);
        }
      })
      .catch((err) => console.error("Gabim gjatë marrjes së dhomave:", err));
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  const filteredRooms = rooms.filter((room) =>
    room.room_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
      <div className="p-4">
        <Input
          placeholder="Kërko sipas numrit të dhomës..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="max-w-full overflow-x-auto">
      <Table>
  <TableHeader>
    <TableRow>
      <TableCell className="text-left font-semibold min-w-[50px]">ID</TableCell>
      <TableCell className="text-left font-semibold min-w-[120px] whitespace-nowrap">Room Number</TableCell>
      <TableCell className="text-left font-semibold min-w-[100px]">Category</TableCell>
      <TableCell className="text-left font-semibold min-w-[80px]">Price</TableCell>
      <TableCell className="text-left font-semibold min-w-[100px]">Status</TableCell>
      <TableCell className="text-left font-semibold min-w-[200px]">Maintenance Notes</TableCell>
    </TableRow>
  </TableHeader>

  <TableBody>
    {filteredRooms.map((room) => (
      <TableRow key={room.id}>
        <TableCell className="text-left">{room.id}</TableCell>
        <TableCell className="text-left whitespace-nowrap">{room.room_number}</TableCell>
        <TableCell className="text-left">{room.category}</TableCell>
        <TableCell className="text-left">{room.price.toFixed(2)} €</TableCell>
        <TableCell className="text-left">{room.status}</TableCell>
        <TableCell className="text-left">{room.maintenance_notes || "-"}</TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
      </div>
    </div>
  );
};

export default RecentOrdersForRooms;
  