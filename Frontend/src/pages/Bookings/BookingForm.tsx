import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import PageBreadcrumb from '../../components/common/PageBreadCrumb';
import PageMeta from '../../components/common/PageMeta';
import ComponentCard from '../../components/common/ComponentCard';

interface Room {
  id: number;
  number: string;
  category: string;
  rate: number;
}

interface User {
  id: number;
  name: string;
  email: string;
}

interface BookingFormProps {
  bookingId?: number;
  onSave: (bookingData: BookingFormData) => void;
  onCancel: () => void;
}

interface BookingFormData {
  checkIn: Date | null;
  checkOut: Date | null;
  roomId: string;
  userId: string;
  numberOfGuests: number;
  specialRequests: string;
  totalAmount: number;
}

const steps = ['Select Dates', 'Choose Room', 'Guest Details', 'Review & Confirm'];

const BookingForm: React.FC<BookingFormProps> = ({ bookingId, onSave, onCancel }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<BookingFormData>({
    checkIn: null,
    checkOut: null,
    roomId: '',
    userId: '',
    numberOfGuests: 1,
    specialRequests: '',
    totalAmount: 0,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [roomsResponse, usersResponse] = await Promise.all([
          fetch('/rooms'),
          fetch('/api/users'),
        ]);
        const roomsJson = await roomsResponse.json();
        const usersData = await usersResponse.json();
        const roomsData = (roomsJson.data || []).map((room: any) => ({
          id: room.id,
          number: room.room_number,
          category: room.category_name,
          rate: room.price,
        }));
        setRooms(roomsData);
        setUsers(usersData);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
  }, []);

  const validateStep = () => {
    const newErrors: Record<string, string> = {};

    switch (activeStep) {
      case 0:
        if (!formData.checkIn) newErrors.checkIn = 'Check-in date is required';
        if (!formData.checkOut) newErrors.checkOut = 'Check-out date is required';
        if (formData.checkIn && formData.checkOut && formData.checkIn >= formData.checkOut) {
          newErrors.checkOut = 'Check-out date must be after check-in date';
        }
        break;
      case 1:
        if (!formData.roomId) newErrors.roomId = 'Room selection is required';
        break;
      case 2:
        if (!formData.userId) newErrors.userId = 'Guest selection is required';
        if (!formData.numberOfGuests) newErrors.numberOfGuests = 'Number of guests is required';
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep()) {
      setActiveStep((prevStep) => prevStep + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const handleSubmit = async () => {
    if (validateStep()) {
      setLoading(true);
      try {
        await onSave(formData);
      } catch (error) {
        console.error('Error saving booking:', error);
      } finally {
        setLoading(false);
      }
    }
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Check-in Date
              </label>
              <input
                type="date"
                value={formData.checkIn ? format(formData.checkIn, 'yyyy-MM-dd') : ''}
                onChange={(e) => {
                  const date = e.target.value ? new Date(e.target.value) : null;
                  setFormData((prev) => ({ ...prev, checkIn: date }));
                }}
                className={`w-full rounded-lg border ${
                  errors.checkIn ? 'border-red-500' : 'border-gray-300'
                } bg-white px-4 py-2 text-gray-700 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300`}
              />
              {errors.checkIn && (
                <p className="mt-1 text-sm text-red-500">{errors.checkIn}</p>
              )}
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Check-out Date
              </label>
              <input
                type="date"
                value={formData.checkOut ? format(formData.checkOut, 'yyyy-MM-dd') : ''}
                onChange={(e) => {
                  const date = e.target.value ? new Date(e.target.value) : null;
                  setFormData((prev) => ({ ...prev, checkOut: date }));
                }}
                className={`w-full rounded-lg border ${
                  errors.checkOut ? 'border-red-500' : 'border-gray-300'
                } bg-white px-4 py-2 text-gray-700 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300`}
              />
              {errors.checkOut && (
                <p className="mt-1 text-sm text-red-500">{errors.checkOut}</p>
              )}
            </div>
          </div>
        );

      case 1:
        return (
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Select Room
            </label>
            <select
              value={formData.roomId}
              onChange={(e) => setFormData((prev) => ({ ...prev, roomId: e.target.value }))}
              className={`w-full rounded-lg border ${
                errors.roomId ? 'border-red-500' : 'border-gray-300'
              } bg-white px-4 py-2 text-gray-700 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300`}
            >
              <option value="">Select a room</option>
              {rooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.number} - {room.category} (${room.rate}/night)
                </option>
              ))}
            </select>
            {errors.roomId && (
              <p className="mt-1 text-sm text-red-500">{errors.roomId}</p>
            )}
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Select Guest
              </label>
              <select
                value={formData.userId}
                onChange={(e) => setFormData((prev) => ({ ...prev, userId: e.target.value }))}
                className={`w-full rounded-lg border ${
                  errors.userId ? 'border-red-500' : 'border-gray-300'
                } bg-white px-4 py-2 text-gray-700 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300`}
              >
                <option value="">Select a guest</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.email})
                  </option>
                ))}
              </select>
              {errors.userId && (
                <p className="mt-1 text-sm text-red-500">{errors.userId}</p>
              )}
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Number of Guests
              </label>
              <input
                type="number"
                min="1"
                value={formData.numberOfGuests}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    numberOfGuests: parseInt(e.target.value),
                  }))
                }
                className={`w-full rounded-lg border ${
                  errors.numberOfGuests ? 'border-red-500' : 'border-gray-300'
                } bg-white px-4 py-2 text-gray-700 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300`}
              />
              {errors.numberOfGuests && (
                <p className="mt-1 text-sm text-red-500">{errors.numberOfGuests}</p>
              )}
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Special Requests
              </label>
              <textarea
                value={formData.specialRequests}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, specialRequests: e.target.value }))
                }
                rows={4}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-700 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
              />
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Booking Summary
            </h3>
            <div className="space-y-2">
              <p className="text-gray-700 dark:text-gray-300">
                <span className="font-medium">Check-in:</span>{' '}
                {formData.checkIn ? format(formData.checkIn, 'MMM dd, yyyy') : '-'}
              </p>
              <p className="text-gray-700 dark:text-gray-300">
                <span className="font-medium">Check-out:</span>{' '}
                {formData.checkOut ? format(formData.checkOut, 'MMM dd, yyyy') : '-'}
              </p>
              <p className="text-gray-700 dark:text-gray-300">
                <span className="font-medium">Room:</span>{' '}
                {rooms.find((r) => r.id === Number(formData.roomId))?.number || '-'}
              </p>
              <p className="text-gray-700 dark:text-gray-300">
                <span className="font-medium">Guest:</span>{' '}
                {users.find((u) => u.id === Number(formData.userId))?.name || '-'}
              </p>
              <p className="text-gray-700 dark:text-gray-300">
                <span className="font-medium">Number of Guests:</span> {formData.numberOfGuests}
              </p>
              <p className="text-gray-700 dark:text-gray-300">
                <span className="font-medium">Total Amount:</span> ${formData.totalAmount.toFixed(2)}
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <>
      <PageMeta
        title={bookingId ? 'Edit Booking' : 'New Booking'}
        description="Create or edit a hotel booking"
      />
      <PageBreadcrumb pageTitle={bookingId ? 'Edit Booking' : 'New Booking'} />
      
      <div className="space-y-5 sm:space-y-6">
        <ComponentCard title={bookingId ? 'Edit Booking' : 'New Booking'}>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                {steps.map((label, index) => (
                  <div key={label} className="flex items-center">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full ${
                        index <= activeStep
                          ? 'bg-brand-500 text-white'
                          : 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                      }`}
                    >
                      {index + 1}
                    </div>
                    <span
                      className={`ml-2 text-sm ${
                        index <= activeStep
                          ? 'text-gray-900 dark:text-white'
                          : 'text-gray-500 dark:text-gray-400'
                      }`}
                    >
                      {label}
                    </span>
                    {index < steps.length - 1 && (
                      <div
                        className={`ml-4 h-0.5 w-8 ${
                          index < activeStep
                            ? 'bg-brand-500'
                            : 'bg-gray-200 dark:bg-gray-700'
                        }`}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8">{renderStepContent(activeStep)}</div>

            <div className="flex justify-end space-x-4">
              <button
                onClick={onCancel}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              {activeStep > 0 && (
                <button
                  onClick={handleBack}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  Back
                </button>
              )}
              {activeStep === steps.length - 1 ? (
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Confirm Booking'}
                </button>
              ) : (
                <button
                  onClick={handleNext}
                  className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
                >
                  Next
                </button>
              )}
            </div>
          </div>
        </ComponentCard>
      </div>
    </>
  );
};

export default BookingForm; 