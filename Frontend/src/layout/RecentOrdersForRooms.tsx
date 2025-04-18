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

const Select = (props: React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <select className="border px-2 py-1 rounded w-full" {...props} />
);

interface Room {
  id: number;
  room_number: string;
  category: "Standard" | "Deluxe" | "Suite";
  price: number;
  status: "Available" | "Occupied" | "Maintenance";
  maintenance_notes: string | null;
}

export default function RoomTable() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [editedRoom, setEditedRoom] = useState<Partial<Room>>({});
  const [newRoom, setNewRoom] = useState<Partial<Room>>({
    room_number: "",
    category: "Standard",
    price: 0,
    status: "Available",
    maintenance_notes: "",
  });

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

  const handleEditSaveClick = async (index: number, room: Room) => {
    if (editIndex === index) {
      const token = localStorage.getItem("jwtToken");
      try {
        await axios.put(
          `http://localhost:8000/rooms/${room.id}`,
          {
            category: editedRoom.category,
            status: editedRoom.status,
            maintenance_notes:
              editedRoom.status === "Maintenance"
                ? editedRoom.maintenance_notes
                : null,
          },
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setEditIndex(null);
        fetchRooms();
      } catch (error) {
        console.error("Gabim gjatë përditësimit të dhomës:", error);
      }
    } else {
      setEditIndex(index);
      setEditedRoom(room);
    }
  };

  const handleDeleteRoom = async (id: number) => {
    const token = localStorage.getItem("jwtToken");
    if (!window.confirm("A jeni i sigurt që doni ta fshini këtë dhomë?")) return;

    try {
      await axios.delete(`http://localhost:8000/rooms/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchRooms();
    } catch (error) {
      console.error("Gabim gjatë fshirjes së dhomës:", error);
    }
  };

  const handleCreateRoom = async () => {
    const token = localStorage.getItem("jwtToken");

    if (!newRoom.room_number || newRoom.price === undefined) {
      alert("Ju lutem plotësoni numrin e dhomës dhe çmimin.");
      return;
    }

    try {
      await axios.post(
        "http://localhost:8000/rooms",
        {
          room_number: newRoom.room_number,
          category: newRoom.category,
          price: newRoom.price,
          status: newRoom.status,
          maintenance_notes:
            newRoom.status === "Maintenance" ? newRoom.maintenance_notes : null,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setNewRoom({
        room_number: "",
        category: "Standard",
        price: 0,
        status: "Available",
        maintenance_notes: "",
      });
      fetchRooms();
    } catch (error) {
      console.error("Gabim gjatë krijimit të dhomës:", error);
    }
  };

  const filteredRooms = rooms.filter((room) =>
    room.room_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
      <div className="p-4 space-y-4">
        <Input
          placeholder="Kërko sipas numrit të dhomës..."
          className="w-1/3"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        <div className="flex flex-wrap gap-4">
          <Input
            placeholder="Room Number"
            value={newRoom.room_number}
            onChange={(e) =>
              setNewRoom((prev) => ({ ...prev, room_number: e.target.value }))
            }
          />
          <Select
            value={newRoom.category}
            onChange={(e) =>
              setNewRoom((prev) => ({
                ...prev,
                category: e.target.value as Room["category"],
              }))
            }
          >
            <option value="Standard">Standard</option>
            <option value="Deluxe">Deluxe</option>
            <option value="Suite">Suite</option>
          </Select>
          <Input
            type="number"
            placeholder="Price"
            value={newRoom.price}
            onChange={(e) =>
              setNewRoom((prev) => ({
                ...prev,
                price: parseFloat(e.target.value),
              }))
            }
          />
          <Select
            value={newRoom.status}
            onChange={(e) =>
              setNewRoom((prev) => ({
                ...prev,
                status: e.target.value as Room["status"],
              }))
            }
          >
            <option value="Available">Available</option>
            <option value="Occupied">Occupied</option>
            <option value="Maintenance">Maintenance</option>
          </Select>
          {newRoom.status === "Maintenance" && (
            <Input
              placeholder="Maintenance Notes"
              value={newRoom.maintenance_notes || ""}
              onChange={(e) =>
                setNewRoom((prev) => ({
                  ...prev,
                  maintenance_notes: e.target.value,
                }))
              }
            />
          )}
          <button
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
            onClick={handleCreateRoom}
          >
            Create Room
          </button>
        </div>
      </div>

      <div className="max-w-full overflow-x-auto">
        <Table>
          <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
            <TableRow>
              <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start">ID</TableCell>
              <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start">Room Number</TableCell>
              <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start">Category</TableCell>
              <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start">Price (€)</TableCell>
              <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start">Status</TableCell>
              <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start">Maintenance Notes</TableCell>
              <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start">Actions</TableCell>
              <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start">Delete</TableCell>
            </TableRow>
          </TableHeader>

          <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
            {filteredRooms.map((room, index) => (
              <TableRow key={room.id}>
                <TableCell className="px-5 py-4 text-start">{room.id}</TableCell>
                <TableCell className="px-5 py-4 text-start">{room.room_number}</TableCell>

                {editIndex === index ? (
                  <>
                    <TableCell className="px-5 py-4 text-start">
                      <Select
                        value={editedRoom.category}
                        onChange={(e) =>
                          setEditedRoom((prev) => ({
                            ...prev,
                            category: e.target.value as Room["category"],
                          }))
                        }
                      >
                        <option value="Standard">Standard</option>
                        <option value="Deluxe">Deluxe</option>
                        <option value="Suite">Suite</option>
                      </Select>
                    </TableCell>

                    <TableCell className="px-5 py-4 text-start">{room.price.toFixed(2)}</TableCell>

                    <TableCell className="px-5 py-4 text-start">
                      <Select
                        value={editedRoom.status}
                        onChange={(e) =>
                          setEditedRoom((prev) => ({
                            ...prev,
                            status: e.target.value as Room["status"],
                          }))
                        }
                      >
                        <option value="Available">Available</option>
                        <option value="Occupied">Occupied</option>
                        <option value="Maintenance">Maintenance</option>
                      </Select>
                    </TableCell>

                    <TableCell className="px-5 py-4 text-start">
                      {editedRoom.status === "Maintenance" ? (
                        <Input
                          placeholder="Shkruani arsyen e mirëmbajtjes..."
                          value={editedRoom.maintenance_notes || ""}
                          onChange={(e) =>
                            setEditedRoom((prev) => ({
                              ...prev,
                              maintenance_notes: e.target.value,
                            }))
                          }
                        />
                      ) : (
                        room.maintenance_notes || "-"
                      )}
                    </TableCell>
                  </>
                ) : (
                  <>
                    <TableCell className="px-5 py-4 text-start">{room.category}</TableCell>
                    <TableCell className="px-5 py-4 text-start">{room.price.toFixed(2)}</TableCell>
                    <TableCell className="px-5 py-4 text-start">{room.status}</TableCell>
                    <TableCell className="px-5 py-4 text-start">{room.maintenance_notes || "-"}</TableCell>
                  </>
                )}

                <TableCell className="px-5 py-4 text-start">
                  <button
                    className={`text-sm px-3 py-1 rounded text-white ${
                      editIndex === index
                        ? "bg-green-500 hover:bg-green-600"
                        : "bg-blue-500 hover:bg-blue-600"
                    }`}
                    onClick={() => handleEditSaveClick(index, room)}
                  >
                    {editIndex === index ? "Save" : "Edit"}
                  </button>
                </TableCell>

                <TableCell className="px-5 py-4 text-start">
                  <button
                    className="text-sm px-3 py-1 rounded bg-red-500 text-white hover:bg-red-600"
                    onClick={() => handleDeleteRoom(room.id)}
                  >
                    Delete
                  </button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

