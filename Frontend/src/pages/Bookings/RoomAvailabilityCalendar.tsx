import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid as MuiGrid,
  Paper,
  Tooltip,
  IconButton,
} from '@mui/material';
import {
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
} from '@mui/icons-material';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday } from 'date-fns';

interface Room {
  id: number;
  number: string;
  category: string;
  status: string;
}

interface Booking {
  id: number;
  roomId: number;
  checkIn: Date;
  checkOut: Date;
  status: string;
}

interface RoomAvailabilityCalendarProps {
  onDateSelect: (date: Date) => void;
  onRoomSelect: (roomId: number) => void;
}

const Grid = MuiGrid as any; // Temporary fix for Grid type issues

const RoomAvailabilityCalendar: React.FC<RoomAvailabilityCalendarProps> = ({
  onDateSelect,
  onRoomSelect,
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [rooms, setRooms] = useState<Room[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [roomsResponse, bookingsResponse] = await Promise.all([
          fetch('/api/rooms'),
          fetch('/api/bookings'),
        ]);
        const roomsData = await roomsResponse.json();
        const bookingsData = await bookingsResponse.json();
        setRooms(roomsData);
        setBookings(bookingsData);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handlePreviousMonth = () => {
    setCurrentDate(subMonths(currentDate, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1));
  };

  const getRoomStatusForDate = (roomId: number, date: Date): string => {
    const booking = bookings.find(
      (b) =>
        b.roomId === roomId &&
        date >= new Date(b.checkIn) &&
        date <= new Date(b.checkOut)
    );

    if (booking) {
      return booking.status;
    }

    const room = rooms.find((r) => r.id === roomId);
    return room?.status || 'available';
  };

  const getStatusColor = (status: string): string => {
    switch (status.toLowerCase()) {
      case 'booked':
        return '#f44336';
      case 'maintenance':
        return '#ff9800';
      case 'available':
        return '#4caf50';
      default:
        return '#9e9e9e';
    }
  };

  const renderCalendar = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

    return (
      <Box sx={{ overflowX: 'auto' }}>
        <Paper sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <IconButton onClick={handlePreviousMonth}>
              <ChevronLeftIcon />
            </IconButton>
            <Typography variant="h6" sx={{ flex: 1, textAlign: 'center' }}>
              {format(currentDate, 'MMMM yyyy')}
            </Typography>
            <IconButton onClick={handleNextMonth}>
              <ChevronRightIcon />
            </IconButton>
          </Box>

          <Grid container spacing={1}>
            {/* Header row with room numbers */}
            <Grid item xs={1}>
              <Box sx={{ height: 40 }} />
            </Grid>
            {rooms.map((room) => (
              <Grid item xs={1} key={room.id}>
                <Box
                  sx={{
                    height: 40,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold',
                  }}
                >
                  {room.number}
                </Box>
              </Grid>
            ))}

            {/* Calendar days */}
            {days.map((day) => (
              <React.Fragment key={day.toISOString()}>
                <Grid item xs={1}>
                  <Box
                    sx={{
                      height: 40,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: isToday(day) ? '#e3f2fd' : 'transparent',
                      fontWeight: isToday(day) ? 'bold' : 'normal',
                    }}
                  >
                    {format(day, 'd')}
                  </Box>
                </Grid>
                {rooms.map((room) => {
                  const status = getRoomStatusForDate(room.id, day);
                  return (
                    <Grid item xs={1} key={`${room.id}-${day.toISOString()}`}>
                      <Tooltip
                        title={`${room.number} - ${status}`}
                        placement="top"
                      >
                        <Box
                          sx={{
                            height: 40,
                            backgroundColor: getStatusColor(status),
                            cursor: 'pointer',
                            '&:hover': {
                              opacity: 0.8,
                            },
                          }}
                          onClick={() => {
                            onDateSelect(day);
                            onRoomSelect(room.id);
                          }}
                        />
                      </Tooltip>
                    </Grid>
                  );
                })}
              </React.Fragment>
            ))}
          </Grid>
        </Paper>
      </Box>
    );
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h5" component="h2" gutterBottom>
          Room Availability Calendar
        </Typography>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <Typography>Loading...</Typography>
          </Box>
        ) : (
          renderCalendar()
        )}
      </CardContent>
    </Card>
  );
};

export default RoomAvailabilityCalendar; 