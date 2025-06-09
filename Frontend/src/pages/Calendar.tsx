import { useState, useRef, useEffect } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { EventInput, EventClickArg, EventContentArg } from "@fullcalendar/core";
import { Modal } from "../components/ui/modal";
import { useModal } from "../hooks/useModal";
import PageMeta from "../components/common/PageMeta";
import axios from "axios";

interface Room {
  id: number;
  room_number: string;
  room_category: string;
}

interface Booking {
  id: number;
  guest_name: string;
  room_number: string;
  check_in_date: string;
  check_out_date: string;
  status_name: string;
  room_id: number;
}

interface CalendarEvent extends EventInput {
  extendedProps: {
    calendar: string;
    bookings: Booking[];
    isAvailable: boolean;
  };
}

const Calendar: React.FC = () => {
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const calendarRef = useRef<FullCalendar>(null);
  const { isOpen, openModal, closeModal } = useModal();

  const fetchRooms = async () => {
    try {
      const token = localStorage.getItem("jwtToken");
      const response = await axios.get("http://localhost:8000/rooms", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRooms(response.data.data || []);
    } catch (error) {
      console.error("Failed to fetch rooms:", error);
    }
  };

  const fetchBookings = async () => {
    try {
      const token = localStorage.getItem("jwtToken");
      const response = await axios.get("http://localhost:8000/api/bookings", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const bookings = response.data.data || [];

      // Add fully booked dates for June 10-15
      const fullyBookedDateRanges = [
        { start: "2024-06-10", end: "2024-06-15" }
      ];

      // Get today's date and set up date range
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Show calendar for 6 months before and 12 months ahead (18 months total)
      const startDate = new Date(today.getFullYear(), today.getMonth() - 6, 1);
      const endDate = new Date(today.getFullYear(), today.getMonth() + 12, 0);

      // Function to get all dates between start and end
      const getDatesInRange = (startDate: string, endDate: string) => {
        const dates = [];
        const currentDate = new Date(startDate);
        const end = new Date(endDate);
        
        while (currentDate <= end) {
          dates.push(currentDate.toISOString().split('T')[0]);
          currentDate.setDate(currentDate.getDate() + 1);
        }
        return dates;
      };

      // Add past dates as fully booked
      const pastDates = getDatesInRange(startDate.toISOString().split('T')[0], today.toISOString().split('T')[0]);
      pastDates.forEach(date => {
        if (!bookings.some((booking: Booking) => booking.check_in_date === date)) {
          rooms.forEach(room => {
            bookings.push({
              id: Date.now() + Math.random(),
              guest_name: "Past Date",
              room_number: room.room_number,
              check_in_date: date,
              check_out_date: date,
              status_name: "past",
              room_id: room.id
            });
          });
        }
      });

      // Add dummy bookings for all dates in the ranges
      fullyBookedDateRanges.forEach(range => {
        const datesInRange = getDatesInRange(range.start, range.end);
        datesInRange.forEach(date => {
          if (!bookings.some((booking: Booking) => booking.check_in_date === date)) {
            rooms.forEach(room => {
              bookings.push({
                id: Date.now() + Math.random(),
                guest_name: "Reserved",
                room_number: room.room_number,
                check_in_date: date,
                check_out_date: date,
                status_name: "confirmed",
                room_id: room.id
              });
            });
          }
        });
      });

      // Group bookings by date, including all dates between check-in and check-out
      const bookingsByDate: { [key: string]: Booking[] } = {};
      
      bookings.forEach((booking: Booking) => {
        const datesInBooking = getDatesInRange(booking.check_in_date, booking.check_out_date);
        datesInBooking.forEach(date => {
          if (!bookingsByDate[date]) {
            bookingsByDate[date] = [];
          }
          bookingsByDate[date].push(booking);
        });
      });

      // Get all dates for the date range
      const allDates = getDatesInRange(
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      );

      // Convert bookings to calendar events
      const calendarEvents: CalendarEvent[] = allDates.map(date => {
        const eventDate = new Date(date);
        const isPastDate = eventDate < today;
        const dateBookings = bookingsByDate[date] || [];

        // For past dates, always show as unavailable with grey styling
        if (isPastDate) {
          return {
            id: date,
            title: 'Past Date',
            start: date,
            end: date,
            extendedProps: {
              calendar: "Past",
              isAvailable: false,
              bookings: dateBookings
            },
            backgroundColor: '#E5E7EB',
            borderColor: '#D1D5DB',
            textColor: '#666666',
            display: 'block'
          };
        }

        // Count unique booked rooms for this date
        const bookedRoomIds = new Set(dateBookings.map((booking: Booking) => booking.room_id));
        const isAvailable = rooms.length > bookedRoomIds.size;

        return {
          id: date,
          title: isAvailable ? 
            `${rooms.length - bookedRoomIds.size} rooms available` : 
            'No rooms available',
          start: date,
          end: date,
          extendedProps: {
            calendar: isAvailable ? "Success" : "Danger",
            isAvailable: isAvailable,
            bookings: dateBookings
          },
          backgroundColor: isAvailable ? '#22c55e' : '#dc2626',
          borderColor: isAvailable ? '#16a34a' : '#b91c1c',
          textColor: '#ffffff',
          display: 'block'
        };
      });

      setEvents(calendarEvents);
    } catch (error) {
      console.error("Failed to fetch bookings:", error);
    }
  };

  useEffect(() => {
    // Initialize with some events
    setEvents([
      {
        id: "1",
        title: "No rooms available",
        start: "2024-06-09",
        extendedProps: { 
          calendar: "Danger",
          isAvailable: false,
          bookings: []
        },
        backgroundColor: '#dc2626',
        borderColor: '#b91c1c',
        textColor: '#ffffff'
      },
      {
        id: "2",
        title: "No rooms available",
        start: "2024-06-10",
        extendedProps: { 
          calendar: "Danger",
          isAvailable: false,
          bookings: []
        },
        backgroundColor: '#dc2626',
        borderColor: '#b91c1c',
        textColor: '#ffffff'
      },
      {
        id: "3",
        title: "No rooms available",
        start: "2024-06-11",
        extendedProps: { 
          calendar: "Danger",
          isAvailable: false,
          bookings: []
        },
        backgroundColor: '#dc2626',
        borderColor: '#b91c1c',
        textColor: '#ffffff'
      },
      {
        id: "4",
        title: "No rooms available",
        start: "2024-06-12",
        extendedProps: { 
          calendar: "Danger",
          isAvailable: false,
          bookings: []
        },
        backgroundColor: '#dc2626',
        borderColor: '#b91c1c',
        textColor: '#ffffff'
      },
      {
        id: "5",
        title: "No rooms available",
        start: "2024-06-13",
        extendedProps: { 
          calendar: "Danger",
          isAvailable: false,
          bookings: []
        },
        backgroundColor: '#dc2626',
        borderColor: '#b91c1c',
        textColor: '#ffffff'
      },
      {
        id: "6",
        title: "No rooms available",
        start: "2024-06-14",
        extendedProps: { 
          calendar: "Danger",
          isAvailable: false,
          bookings: []
        },
        backgroundColor: '#dc2626',
        borderColor: '#b91c1c',
        textColor: '#ffffff'
      },
      {
        id: "7",
        title: "No rooms available",
        start: "2024-06-15",
        extendedProps: { 
          calendar: "Danger",
          isAvailable: false,
          bookings: []
        },
        backgroundColor: '#dc2626',
        borderColor: '#b91c1c',
        textColor: '#ffffff'
      },
      {
        id: "8",
        title: "2 rooms available",
        start: "2024-06-16",
        extendedProps: { 
          calendar: "Success",
          isAvailable: true,
          bookings: []
        },
        backgroundColor: '#22c55e',
        borderColor: '#16a34a',
        textColor: '#ffffff'
      },
    ]);
  }, []);

  useEffect(() => {
    fetchRooms();
  }, []);

  useEffect(() => {
    if (rooms.length > 0) {
      fetchBookings();
      // Refresh bookings every minute
      const intervalId = setInterval(fetchBookings, 60000);
      return () => clearInterval(intervalId);
    }
  }, [rooms]);

  const handleEventClick = (clickInfo: EventClickArg) => {
    // Prevent clicking on past dates
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const eventDate = new Date(clickInfo.event.start as Date);
    
    if (eventDate < today) {
      return; // Don't do anything for past dates
    }

    const event = clickInfo.event;
    setSelectedEvent({
      id: event.id,
      title: event.title,
      start: event.start,
      end: event.end,
      extendedProps: {
        calendar: event.extendedProps.calendar,
        isAvailable: event.extendedProps.isAvailable,
        bookings: event.extendedProps.bookings
      }
    } as CalendarEvent);
    openModal();
  };

  const renderEventContent = (eventInfo: EventContentArg) => {
    const isAvailable = eventInfo.event.extendedProps.isAvailable;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const eventDate = new Date(eventInfo.event.start as Date);
    const isPastDate = eventDate < today;

    const availabilityText = isPastDate ? 'Past Date' : 
      isAvailable ? `${eventInfo.event.title}` : 
      'No rooms available';
    
    return (
      <div className={`h-full w-full flex items-center justify-center p-2 ${isPastDate ? 'cursor-not-allowed opacity-50' : ''}`}>
        <div className="text-center">
          <div className="text-sm font-medium">
            {availabilityText}
          </div>
          <div className="text-xs">
            {isPastDate ? 'Not Available' : 
              isAvailable ? 'Available for Booking' : 'Not Available'}
          </div>
        </div>
      </div>
    );
  };

  // Function to get available rooms for a date
  const getAvailableRooms = (dateBookings: Booking[]) => {
    const bookedRoomIds = new Set(dateBookings.map(booking => booking.room_id));
    return rooms.filter(room => !bookedRoomIds.has(room.id));
  };

  return (
    <>
      <PageMeta title="Booking Calendar" description="View room availability and bookings" />
      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="custom-calendar">
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            headerToolbar={{
              left: "prev,next",
              center: "title",
              right: "dayGridMonth",
            }}
            events={events.map(event => {
              const eventDate = new Date(event.start as string);
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const isPastDate = eventDate < today;

              return {
                ...event,
                display: 'block',
                className: isPastDate ? 'past-date' : '',
                backgroundColor: isPastDate ? '#E5E7EB' : event.backgroundColor,
                borderColor: isPastDate ? '#D1D5DB' : event.borderColor
              };
            })}
            eventClick={handleEventClick}
            eventContent={renderEventContent}
            height="auto"
            dayMaxEvents={1}
            aspectRatio={2}
            dayCellClassNames={(arg) => {
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              return arg.date < today ? 'past-date' : '';
            }}
          />
        </div>
        <Modal
          isOpen={isOpen}
          onClose={closeModal}
          className="max-w-[600px] p-6 lg:p-8"
        >
          {selectedEvent && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold">
                Room Availability Details
              </h3>
              <div className="space-y-4">
                <div className={`p-4 rounded-lg ${
                  selectedEvent.extendedProps.isAvailable ? 
                  'bg-green-500 bg-opacity-10' : 
                  'bg-red-500 bg-opacity-10'
                }`}>
                  <p className="font-medium">Date: {new Date(selectedEvent.start as string).toLocaleDateString()}</p>
                  <p className={`text-sm mt-2 font-medium ${
                    selectedEvent.extendedProps.isAvailable ? 'text-green-600' : 'text-red-600'
                  }`}>
                    Status: {selectedEvent.extendedProps.isAvailable ? 'Available for Booking' : 'Fully Booked'}
                  </p>
                </div>

                {selectedEvent.extendedProps.isAvailable ? (
                  // Show available rooms
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium mb-3">Available Rooms</h4>
                    <div className="grid grid-cols-1 gap-3">
                      {getAvailableRooms(selectedEvent.extendedProps.bookings).map((room) => (
                        <div 
                          key={room.id} 
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg dark:bg-gray-800"
                        >
                          <div className="flex items-center space-x-3">
                            <div className="flex-shrink-0 w-2 h-2 bg-green-500 rounded-full"></div>
                            <span className="text-sm font-medium">Room {room.room_number}</span>
                          </div>
                          <span className="text-sm text-gray-600 dark:text-gray-300 capitalize">
                            {room.room_category}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  // Show current bookings
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium mb-3">Current Bookings</h4>
                    <div className="space-y-4">
                      {selectedEvent.extendedProps.bookings.map((booking: Booking, index: number) => (
                        <div key={booking.id} className={`${
                          index !== selectedEvent.extendedProps.bookings.length - 1 ? 'pb-4 border-b' : ''
                        }`}>
                          <div className="space-y-3">
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium">Guest</span>
                              <span className="text-sm">{booking.guest_name}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium">Room</span>
                              <span className="text-sm">{booking.room_number}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium">Check-in</span>
                              <span className="text-sm">{new Date(booking.check_in_date).toLocaleDateString()}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium">Check-out</span>
                              <span className="text-sm">{new Date(booking.check_out_date).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex justify-end mt-6">
                <button
                  onClick={closeModal}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </>
  );
};

export default Calendar;
