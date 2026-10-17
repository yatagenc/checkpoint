import { Outlet } from "react-router";
import { useRouteAccessibility } from "../../hooks/useRouteAccessibility";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { StorageNotice } from "../personal/StorageNotice";

export function AppLayout() {
  const mainRef = useRouteAccessibility();
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Header />
      <main
        id="main"
        tabIndex={-1}
        ref={mainRef}
        className="container main-content"
      >
        <StorageNotice />
        <Outlet />
      </main>
      <Footer />
    </>
  );
}
