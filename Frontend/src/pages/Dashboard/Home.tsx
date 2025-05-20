import RecentOrdersForRooms from "../../layout/RecentOrdersForRooms";
import RevenueStats from "../../layout/RevenueStats";
import CheckinStatus from "../../layout/CheckinStatus";
import BasicTableOne from "../../components/tables/BasicTables/BasicTableOne";
import Calendar from "../../pages/Calendar";
import PageMeta from "../../components/common/PageMeta";
import RecentOrdersForBookings from "../../layout/RecentOrdersForBookings";

export default function Home() {
  return (
    <>
      <PageMeta
        title="Bookly"
        description="This is a hotel booking system"
      />
      <div className="grid grid-cols-12 gap-4 md:gap-6">
        {/* Tabela me scroll dhe gjerësi të plotë */}
        <div className="col-span-12 xl:col-span-12 space-y-6">
        <div className="w-full max-h-[400px] overflow-y-auto">
          <BasicTableOne />
        </div>
      </div>

      {/* Kalendar i zgjeruar plotësisht me scroll */}
      <div className="col-span-12 xl:col-span-12">
        <div className="w-full h-[400px] overflow-y-auto">
          <Calendar />
        </div>
      </div>


        {/* Komponentët tjerë */}
        <div className="col-span-12 xl:col-span-5">
          <CheckinStatus />
        </div>

        <div className="col-span-12">
          <RecentOrdersForRooms />
        </div>

        <div className="col-span-12 xl:col-span-5">
          <RevenueStats />
        </div>

        <div className="col-span-12 xl:col-span-7">
          <RecentOrdersForBookings />
        </div>
      </div>
    </>
  );
}
