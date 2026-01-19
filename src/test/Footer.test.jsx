import React from "react";
import { MemoryRouter } from "react-router-dom";
import { render, screen } from "@testing-library/react";
import Footer from "./Footer";

describe("Footer Component", () => {

  const renderWithRouter = (initialPath = "/") => {
    return render(
      <MemoryRouter initialEntries={[initialPath]}>
        <Footer />
      </MemoryRouter>
    );
  };

  test("renders all footer links correctly", () => {
    renderWithRouter("/");
    
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Token Presale")).toBeInTheDocument();
    expect(screen.getByText("My Team")).toBeInTheDocument();
  });

  test("Dashboard link has active styles when on home route", () => {
    const { container } = renderWithRouter("/");

    const dashboardLink = screen.getByText("Dashboard").parentElement;

    expect(dashboardLink.className).toMatch(/text-purple-500/);
    expect(dashboardLink.getAttribute("href")).toBe("/");
  });

  test("Token Presale link has active styles on /TokenPresale route", () => {
    renderWithRouter("/TokenPresale");

    const presaleLink = screen.getByText("Token Presale").parentElement;

    expect(presaleLink.className).toMatch(/text-purple-500/);
    expect(presaleLink.getAttribute("href")).toBe("/TokenPresale");
  });

  test("My Team link has active styles on /TeamReport route", () => {
    renderWithRouter("/TeamReport");

    const teamLink = screen.getByText("My Team").parentElement;

    expect(teamLink.className).toMatch(/text-purple-500/);
    expect(teamLink.getAttribute("href")).toBe("/TeamReport");
  });

  test("Other links show inactive styles on non-active routes", () => {
    renderWithRouter("/TokenPresale");

    const dashboardLink = screen.getByText("Dashboard").parentElement;
    const teamLink = screen.getByText("My Team").parentElement;

    expect(dashboardLink.className).toMatch(/text-zinc-400/);
    expect(teamLink.className).toMatch(/text-zinc-400/);
  });

});
