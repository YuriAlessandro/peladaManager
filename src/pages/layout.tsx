import { Outlet } from "react-router";

const Layout = () => {
  return (
    <div className="tw-bg-stone-950 tw-flex tw-text-white tw-min-h-screen tw-p-5 tw-flex-col tw-gap-5">
      <Outlet />
    </div>
  );
};

export default Layout;
