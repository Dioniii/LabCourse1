import { useEffect, useState } from "react";
import axios from "axios";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { useModal } from "../hooks/useModal";
import { Modal } from "../components/ui/modal";
import Button from "../components/ui/button/Button";
import Input from "../components/form/input/InputField";
import Label from "../components/form/Label";

interface Room {
  id: number;
  room_number: string;
  category_id: number;
  category_name: string;
  price: number;
  status_id: number;
  status_name: string;
  maintenance_notes: string | null; 
}

interface RoomCategory {
  id: number;
  name: string;
}

interface RoomStatus {
  id: number;
  name: string;
}

const parseJwt = (token: string) => {
  const base64Url = token.split('.')[1];
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const jsonPayload = decodeURIComponent(
    atob(base64)
      .split('') 
      .map((c) => `%${('00' + c.charCodeAt(0).toString(16)).slice(-2)}`)
      .join('')
  );

  return JSON.parse(jsonPayload);
};

export default function RoomTable() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [categories, setCategories] = useState<RoomCategory[]>([]);
  const [statuses, setStatuses] = useState<RoomStatus[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [editedRoom, setEditedRoom] = useState<Room | null>(null);
  const [priceInput, setPriceInput] = useState("");
  const [newRoom, setNewRoom] = useState<Partial<Room>>({
  room_number: "",
  category_id: categories.length > 0 ? categories[0].id : 0,
  price: 0,
  status_id: statuses.find(s => s.name === 'Available')?.id || 0,
  maintenance_notes: "",
});
  const [userRole, setUserRole] = useState<string | null>(null);
  
  // Modal states
  const { isOpen: isCreateModalOpen, openModal: openCreateModal, closeModal: closeCreateModal } = useModal();
  const { isOpen: isEditModalOpen, openModal: openEditModal, closeModal: closeEditModal } = useModal();
  const { isOpen: isDeleteModalOpen, openModal: openDeleteModal, closeModal: closeDeleteModal } = useModal();
  const [roomToDelete, setRoomToDelete] = useState<Room | null>(null);

  // Add validation state
  const [maintenanceNoteError, setMaintenanceNoteError] = useState(false);
  const [editMaintenanceNoteError, setEditMaintenanceNoteError] = useState(false);

  useEffect(() => {
  fetchRooms();
}, []); 

const fetchRooms = async () => {
  const token = localStorage.getItem("jwtToken");
  if (!token) return;

  try {
    const decodedToken = parseJwt(token);
    setUserRole(decodedToken.role);

    // Fetch all data in parallel
    const [roomsRes, categoriesRes, statusesRes] = await Promise.all([
      axios.get("http://localhost:8000/rooms", { headers: { Authorization: `Bearer ${token}` } }),
      axios.get("http://localhost:8000/room-categories", { headers: { Authorization: `Bearer ${token}` } }),
      axios.get("http://localhost:8000/room-statuses", { headers: { Authorization: `Bearer ${token}` } })
    ]);

    setRooms(roomsRes.data?.data || []);
    setCategories(categoriesRes.data?.data || []);
    setStatuses(statusesRes.data?.data || []);
  } catch (error) {
    console.error("Error fetching data:", error);
    // Handle error appropriately
  }
};

  // In create modal, clear notes if status changes to non-maintenance
  useEffect(() => {
    const maintenanceStatus = statuses.find(s => s.name === 'Maintenance');
    if (maintenanceStatus && newRoom.status_id !== maintenanceStatus.id && newRoom.maintenance_notes) {
      setNewRoom(prev => ({ ...prev, maintenance_notes: '' }));
    }
  }, [newRoom.status_id, statuses, newRoom.maintenance_notes]); 

  // In edit modal, clear notes if status changes to non-maintenance
  useEffect(() => {
    const maintenanceStatus = statuses.find(s => s.name === 'Maintenance');
    if (editedRoom && maintenanceStatus && editedRoom.status_id !== maintenanceStatus.id && editedRoom.maintenance_notes) {
      setEditedRoom(prev => prev ? { ...prev, maintenance_notes: '' } : null);
    }
  }, [editedRoom, editedRoom?.status_id, statuses]); 

  const handleEditClick = (room: Room) => {
    setEditedRoom(room);
    setPriceInput(room.price.toString());
    openEditModal();
  };

const handleEditSave = async () => {
  if (!editedRoom) return;
  
  const maintenanceStatus = statuses.find(s => s.name === 'Maintenance');
  if (maintenanceStatus && editedRoom.status_id === maintenanceStatus.id && 
      (!editedRoom.maintenance_notes || editedRoom.maintenance_notes.trim() === '')) {
    setEditMaintenanceNoteError(true);
    return;
  } else {
    setEditMaintenanceNoteError(false);
  }
  
  try {
    const token = localStorage.getItem("jwtToken");
    const response = await axios.put(
      `http://localhost:8000/rooms/${editedRoom.id}`,
      {
        category_id: editedRoom.category_id,
        status_id: editedRoom.status_id,
        maintenance_notes: maintenanceStatus && editedRoom.status_id === maintenanceStatus.id ? 
          editedRoom.maintenance_notes : null,
        price: priceInput === '' ? 0 : parseFloat(priceInput)
      },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    setRooms(prevRooms => 
      prevRooms.map(room => 
        room.id === editedRoom.id ? response.data.data : room
      )
    );

    closeEditModal();
    } catch (error: unknown) {
    console.error("Error updating room:", error);
    if (axios.isAxiosError(error)) {
      alert(error.response?.data?.message || "Failed to update room");
      } else {
      alert("An error occurred while updating the room");
      }
    }
  };

  const handleDeleteClick = (room: Room) => {
    setRoomToDelete(room);
    openDeleteModal();
  };

  const handleDeleteConfirm = async () => {
    if (!roomToDelete) return;

    const token = localStorage.getItem("jwtToken");
    try {
      await axios.delete(`http://localhost:8000/rooms/${roomToDelete.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      closeDeleteModal();
      setRoomToDelete(null);
      fetchRooms();
    } catch (error) {
      console.error("Error deleting room:", error);
    }
  };

  const handleCreateRoom = async () => {
    const token = localStorage.getItem("jwtToken");

    if (!newRoom.room_number || newRoom.price === undefined || !newRoom.category_id || !newRoom.status_id) {
      alert("Please fill in all required fields.");
      return;
    }
    
    const maintenanceStatus = statuses.find(s => s.name === 'Maintenance');
    if (maintenanceStatus && newRoom.status_id === maintenanceStatus.id && 
        (!newRoom.maintenance_notes || newRoom.maintenance_notes.trim() === '')) {
      setMaintenanceNoteError(true);
      return;
    } else {
      setMaintenanceNoteError(false);
    }

    try {
      await axios.post(
        "http://localhost:8000/rooms",
        {
          room_number: newRoom.room_number,
          category_id: newRoom.category_id,
          price: newRoom.price,
          status_id: newRoom.status_id,
          maintenance_notes: maintenanceStatus && newRoom.status_id === maintenanceStatus.id ? 
            newRoom.maintenance_notes : null,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setNewRoom({
        room_number: "",
        category_id: categories.length > 0 ? categories[0].id : 0,
        price: 0,
        status_id: 8, // Default to Available (id: 8)
        maintenance_notes: "",
      });
      closeCreateModal();
      fetchRooms();
    } catch (error) {
      console.error("Error creating room:", error);
    }
  };

  const filteredRooms = rooms.filter((room) =>
    room.room_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get status name by ID
  const getStatusName = (statusId: number) => {
    const status = statuses.find(s => s.id === statusId);
    return status ? status.name : "Unknown";
  };

  // Get category name by ID
  const getCategoryName = (categoryId: number) => {
    const category = categories.find(c => c.id === categoryId);
    return category ? category.name : "Unknown";
  };

  // Check if status is maintenance
  const isMaintenanceStatus = (statusId: number) => {
    const maintenanceStatus = statuses.find(s => s.name === 'Maintenance');
    return maintenanceStatus && statusId === maintenanceStatus.id;
  };

  if (userRole === "guest") {
    return <div>You do not have permission to view this page.</div>;
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header Section */}
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Room Management</h2>
        <p className="text-gray-600 dark:text-gray-400">Manage and monitor all hotel rooms and their status</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-white/[0.05] dark:bg-white/[0.03]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Rooms</p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{rooms.length}</h3>
            </div>
            <div className="rounded-full bg-blue-100 p-3 dark:bg-blue-900">
              <svg className="h-6 w-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-white/[0.05] dark:bg-white/[0.03]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Available Rooms</p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                {rooms.filter(room => getStatusName(room.status_id) === "Available").length}
              </h3>
            </div>
            <div className="rounded-full bg-green-100 p-3 dark:bg-green-900">
              <svg className="h-6 w-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-white/[0.05] dark:bg-white/[0.03]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Occupied Rooms</p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                {rooms.filter(room => getStatusName(room.status_id) === "Occupied").length}
              </h3>
            </div>
            <div className="rounded-full bg-yellow-100 p-3 dark:bg-yellow-900">
              <svg className="h-6 w-6 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-white/[0.05] dark:bg-white/[0.03]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Under Maintenance</p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                {rooms.filter(room => getStatusName(room.status_id) === "Maintenance").length}
              </h3>
            </div>
            <div className="rounded-full bg-red-100 p-3 dark:bg-red-900">
              <svg className="h-6 w-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
        <div className="p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="w-full sm:w-1/3">
              <Input
                placeholder="Search by room number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button onClick={openCreateModal} className="w-full sm:w-auto">Create New Room</Button>
          </div>
        </div>

        <div className="max-w-full overflow-x-auto">
          <Table>
            <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
              <TableRow>
                <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start">Room Number</TableCell>
                <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start">Category</TableCell>
                <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start">Price</TableCell>
                <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start">Status</TableCell>
                <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start">Maintenance Notes</TableCell>
                <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start">Actions</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {filteredRooms.map((room) => (
                <TableRow key={room.id}>
                  <TableCell className="px-5 py-4 text-start font-medium">{room.room_number}</TableCell>
                  <TableCell className="px-5 py-4 text-start">
                    <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800 dark:bg-gray-800 dark:text-gray-200">
                      {getCategoryName(room.category_id)}
                    </span>
                  </TableCell>
                  <TableCell className="px-5 py-4 text-start">${room.price}</TableCell>
                  <TableCell className="px-5 py-4 text-start">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium
                      ${getStatusName(room.status_id) === 'Available' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                        getStatusName(room.status_id) === 'Occupied' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                        'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}`}>
                      {getStatusName(room.status_id)}
                    </span>
                  </TableCell>
                  <TableCell className="px-5 py-4 text-start">{room.maintenance_notes || "-"}</TableCell>
                  <TableCell className="px-5 py-4 text-start">
                    <div className="flex gap-2">
                      <Button onClick={() => handleEditClick(room)}>
                        Edit
                      </Button>
                      <Button
                        onClick={() => handleDeleteClick(room)}
                        className="bg-red-500 hover:bg-red-600"
                      >
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Create Room Modal */}
      <Modal isOpen={isCreateModalOpen} onClose={closeCreateModal} className="max-w-[700px] m-4">
        <div className="no-scrollbar relative w-full max-w-[700px] overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-11">
          <div className="px-2 pr-14">
            <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
              Create New Room
            </h4>
            <p className="mb-6 text-sm text-gray-500 dark:text-gray-400 lg:mb-7">
              Fill in the details to create a new room.
            </p>
          </div>
          <form className="flex flex-col">
            <div className="custom-scrollbar h-[300px] overflow-y-auto px-2 pb-3">
              <div className="mt-7">
                <h5 className="mb-5 text-lg font-medium text-gray-800 dark:text-white/90 lg:mb-6">
                  Room Information
                </h5>
                <div className="grid grid-cols-1 gap-x-6 gap-y-5 lg:grid-cols-2">
                  <div>
                    <Label>Room Number</Label>
                    <Input
                      type="text"
                      value={newRoom.room_number}
                      onChange={(e) =>
                        setNewRoom((prev) => ({ ...prev, room_number: e.target.value }))
                      }
                      placeholder="Enter room number"
                    />
                  </div>
                  <div>
                    <Label>Category</Label>
                    <select
                      className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
                      value={newRoom.category_id}
                      onChange={(e) =>
                        setNewRoom((prev) => ({
                          ...prev,
                          category_id: parseInt(e.target.value),
                        }))
                      }
                    >
                      {categories.map(category => (
                        <option key={category.id} value={category.id}>{category.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>Price</Label>
                    <Input
                      type="number"
                      value={newRoom.price === undefined || newRoom.price === null ? '' : newRoom.price}
                      onChange={e =>
                        setNewRoom(prev => ({
                          ...prev,
                          price: e.target.value === '' ? undefined : parseFloat(e.target.value)
                        }))
                      }
                      placeholder="Enter price"
                    />
                  </div>
                  <div>
                    <Label>Status</Label>
                    <select
                      className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
                      value={newRoom.status_id}
                      onChange={(e) =>
                        setNewRoom((prev) => ({
                          ...prev,
                          status_id: parseInt(e.target.value),
                        }))
                      }
                    >
                      {statuses.map(status => (
                        <option key={status.id} value={status.id}>{status.name}</option>
                      ))}
                    </select>
                  </div>
                  {isMaintenanceStatus(newRoom.status_id ?? 0) && (  
                    <div className="lg:col-span-2">
                    <Label>Maintenance Notes <span className="text-red-500">*</span></Label>
                    <Input
                      type="text"
                      value={newRoom.maintenance_notes ?? ""}
                      onChange={(e) => {
                        setNewRoom((prev) => ({
                        ...prev,
                        maintenance_notes: e.target.value,
                        status_id: prev.status_id ?? 0 // Sigurohuni që status_id të ketë vlerë
                      }));
                      setMaintenanceNoteError(false);
                    }}
                      placeholder="Enter maintenance notes"
                      className={maintenanceNoteError ? "border-red-500" : ""}
                      />
                      {maintenanceNoteError && (
                        <span className="text-xs text-red-500">Maintenance notes are required when status is Maintenance.</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 px-2 mt-6 lg:justify-end">
              <button
                onClick={closeCreateModal}
                className="flex w-full justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] sm:w-auto"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateRoom}
                className="flex w-full justify-center rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 sm:w-auto"
              >
                Create Room
              </button>
            </div>
          </form>
        </div>
      </Modal>

      {/* Edit Room Modal */}
      <Modal 
        isOpen={isEditModalOpen} 
        onClose={() => {
          if (!editMaintenanceNoteError) closeEditModal();
        }}
        className="max-w-[700px] m-4"
      >
        <div className="no-scrollbar relative w-full max-w-[700px] overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-11">
          <div className="px-2 pr-14">
            <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
              Edit Room
            </h4>
            <p className="mb-6 text-sm text-gray-500 dark:text-gray-400 lg:mb-7">
              Update the room's information.
            </p>
          </div>
          <form className="flex flex-col">
            <div className="custom-scrollbar h-[300px] overflow-y-auto px-2 pb-3">
              <div className="mt-7">
                <h5 className="mb-5 text-lg font-medium text-gray-800 dark:text-white/90 lg:mb-6">
                  Room Information
                </h5>
                <div className="grid grid-cols-1 gap-x-6 gap-y-5 lg:grid-cols-2">
                  <div>
                    <Label>Room Number</Label>
                    <Input
                      type="text"
                      value={editedRoom?.room_number || ""}
                      disabled
                    />
                  </div>
                  <div>
                    <Label>Category</Label>
                    <select
                      className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
                      value={editedRoom?.category_id || 0}
                      onChange={(e) =>
                        setEditedRoom(prev => prev ? {
                          ...prev,
                          category_id: parseInt(e.target.value)
                        } : null)
                      }
                    >
                      {categories.map(category => (
                        <option key={category.id} value={category.id}>{category.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>Price</Label>
                    <Input
                      type="text"
                      value={priceInput}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === '' || /^\d*\.?\d*$/.test(value)) {
                          setPriceInput(value);
                        }
                      }}
                      placeholder="Enter price"
                    />
                  </div>
                  <div>
                    <Label>Status</Label>
                    <select
                      className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
                      value={editedRoom?.status_id || 8}
                      onChange={(e) =>
                        setEditedRoom(prev => prev ? {
                          ...prev,
                          status_id: parseInt(e.target.value)
                        } : null)
                      }
                    >
                      {statuses.map(status => (
                        <option key={status.id} value={status.id}>{status.name}</option>
                      ))}
                    </select>
                  </div>
                  {editedRoom && isMaintenanceStatus(editedRoom.status_id) && (
                    <div className="lg:col-span-2">
                      <Label>Maintenance Notes <span className="text-red-500">*</span></Label>
                      <Input
                        type="text"
                        value={editedRoom?.maintenance_notes || ""}
                        onChange={(e) => {
                          setEditedRoom(prev => prev ? {
                            ...prev,
                            maintenance_notes: e.target.value
                          } : null);
                          setEditMaintenanceNoteError(false);
                        }}
                        placeholder="Enter maintenance notes"
                        className={editMaintenanceNoteError ? "border-red-500" : ""}
                      />
                      {editMaintenanceNoteError && (
                        <span className="text-xs text-red-500">Maintenance notes are required when status is Maintenance.</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 px-2 mt-6 lg:justify-end">
              <button
                onClick={e => {
                  e.preventDefault();
                  if (!editMaintenanceNoteError) closeEditModal();
                }}
                className="flex w-full justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] sm:w-auto"
                disabled={editMaintenanceNoteError}
              >
                Cancel
              </button>
              <button
                onClick={handleEditSave}
                className="flex w-full justify-center rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 sm:w-auto"
                disabled={editMaintenanceNoteError}
              >
                Save Changes
              </button>
            </div>
            {editMaintenanceNoteError && (
              <div className="mt-2 text-center text-xs text-red-500">You must provide maintenance notes before closing or saving.</div>
            )}
          </form>
        </div>
      </Modal>

      {/* Delete Room Modal */}
      <Modal isOpen={isDeleteModalOpen} onClose={closeDeleteModal} className="max-w-[500px] m-4">
        <div className="no-scrollbar relative w-full max-w-[500px] overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-11">
          <div className="px-2 pr-14">
            <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
              Delete Room
            </h4>
            <p className="mb-6 text-sm text-gray-500 dark:text-gray-400 lg:mb-7">
              Are you sure you want to delete room {roomToDelete?.room_number}? This action cannot be undone.
            </p>
          </div>
          <div className="flex items-center gap-3 px-2 mt-6 lg:justify-end">
            <button
              onClick={closeDeleteModal}
              className="flex w-full justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] sm:w-auto"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteConfirm}
              className="flex w-full justify-center rounded-lg bg-red-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-600 sm:w-auto"
            >
              Delete Room
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}