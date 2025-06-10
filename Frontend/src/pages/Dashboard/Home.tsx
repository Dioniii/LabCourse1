import { Link } from "react-router-dom";
import RecentOrdersForRooms from "../../layout/RecentOrdersForRooms";
import CheckinStatus from "../../layout/CheckinStatus";
import BasicTableOne from "../../components/tables/BasicTables/BasicTableOne";
import Calendar from "../../pages/Calendar";
import PageMeta from "../../components/common/PageMeta";
import RecentOrdersForBookings from "../../layout/RecentOrdersForBookings";

export default function Home() {
  return (
    <>
      <PageMeta title="Bookly" description="This is a hotel booking system" />

      <div className="bg-slate-50 min-h-screen p-4 md:p-6">
        <div className="grid grid-cols-12 gap-6">
          {/* Rreshti 1: Check-in/outs */}
          <div className="col-span-12 bg-white rounded-2xl p-5 shadow-md max-h-[280px] overflow-hidden">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-base font-semibold text-gray-700">
                Check-ins / Check-outs
              </h2>
              <Link
                to="/Checkins"
                className="text-sm text-blue-500 hover:text-blue-700 transition"
              >
                See more →
              </Link>
            </div>
            <CheckinStatus />
          </div>

          {/* Rreshti 2: Bookings + Calendar */}
          <div className="col-span-12 xl:col-span-6 bg-white rounded-2xl p-5 shadow-md max-h-[280px] overflow-hidden">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-base font-semibold text-gray-700">
                Recent Bookings
              </h2>
              <Link
                to="/Bookings/Bookings"
                className="text-sm text-blue-500 hover:text-blue-700 transition"
              >
                See more →
              </Link>
            </div>
            {/* Hide Icons */}
            <div className="RecentOrdersForBookings [&_svg]:hidden [&_.bg-blue-100]:hidden [&_.bg-green-100]:hidden [&_.bg-yellow-100]:hidden [&_.bg-red-100]:hidden">
              <RecentOrdersForBookings />
            </div>
          </div>

          <div className="col-span-12 xl:col-span-6 bg-blue-50 rounded-2xl p-5 shadow-md max-h-[280px] overflow-hidden">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-base font-semibold text-gray-700">Calendar</h2>
              <Link
                to="/calendar"
                className="text-sm text-blue-500 hover:text-blue-700 transition"
              >
                See more →
              </Link>
            </div>
            <Calendar />
          </div>

          {/* Rreshti 3: Room Management + Staff Management */}
          <div className="col-span-12 xl:col-span-6 bg-green-50 rounded-2xl p-5 shadow-md max-h-[280px] overflow-hidden">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-base font-semibold text-gray-700">
                Room Management
              </h2>
              <Link
                to="/room-status"
                className="text-sm text-blue-500 hover:text-blue-700 transition"
              >
                See more →
              </Link>
            </div>
            {/* Hide Icons */}
            <div
              className="RecentOrdersForRooms [&_svg]:hidden [&_.bg-blue-100]:hidden [&_.bg-green-100]:hidden [&_.bg-yellow-100]:hidden [&_.bg-red-100]:hidden"
            >
              <RecentOrdersForRooms />
            </div>
          </div>

          <div className="col-span-12 xl:col-span-6 bg-yellow-50 rounded-2xl p-5 shadow-md max-h-[280px] overflow-hidden">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-base font-semibold text-gray-700">
                Staff Management
              </h2>
              <Link
                to="/basic-tables"
                className="text-sm text-blue-500 hover:text-blue-700 transition"
              >
                See more →
              </Link>
            </div>
            {/* Hide Icons */}
            <div
              className="basic-table-one [&_svg]:hidden [&_.bg-blue-100]:hidden [&_.bg-green-100]:hidden [&_.bg-yellow-100]:hidden [&_.bg-red-100]:hidden"
            >
              <BasicTableOne />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}