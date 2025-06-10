import { Link } from "react-router-dom";
import CheckinStatus from "../../layout/CheckinStatus";
import Calendar from "../../pages/Calendar";
import PageMeta from "../../components/common/PageMeta";
import RecentOrdersForBookings from "../../layout/RecentOrdersForBookings";

export default function Home() {
  return (
    <>
      <PageMeta title="Bookly" description="This is a hotel booking system" />

      <div className="bg-slate-50 min-h-screen p-4 md:p-6">
        <div className="grid grid-cols-12 gap-6">
          {/* Row 1: Calendar */}
          <div className="col-span-12 bg-blue-50 rounded-2xl p-5 shadow-md">
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

          {/* Row 2: Bookings + Check-ins/outs */}
          <div className="col-span-12 xl:col-span-6 bg-white rounded-2xl p-5 shadow-md max-h-[280px] overflow-hidden">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-base font-semibold text-gray-700">
                Recent Bookings
              </h2>
              <Link
                to="/bookings"
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

          <div className="col-span-12 xl:col-span-6 bg-white rounded-2xl p-5 shadow-md max-h-[280px] overflow-hidden">
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
        </div>
      </div>
    </>
  );
}