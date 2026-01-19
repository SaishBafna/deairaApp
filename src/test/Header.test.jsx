import React from "react";
import { render, fireEvent, screen, waitFor } from "@testing-library/react";
import Header from "./Header";
import axios from "axios";

jest.mock("axios");
jest.mock("../Sidebar/sidebar", () => ({ onClose }) => (
  <div data-testid="sidebar">Sidebar</div>
));

describe("Header Component", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test("renders logo and menu icon", () => {
    render(<Header />);
    expect(screen.getByRole("img")).toBeInTheDocument();
    expect(screen.getByText(/menu/i)).toBeTruthy(); // FiMenu renders text as fallback
  });

  test("toggles sidebar when menu icon is clicked", () => {
    render(<Header />);
    const menuButton = screen.getByText(/menu/i);
    fireEvent.click(menuButton);
    expect(screen.getByTestId("sidebar")).toBeInTheDocument();
  });

  test("closes sidebar when overlay is clicked", () => {
    render(<Header />);
    const menuButton = screen.getByText(/menu/i);
    fireEvent.click(menuButton);

    const overlay = screen.getByTestId("overlay-close");
    fireEvent.click(overlay);

    expect(screen.queryByTestId("sidebar")).toBeNull();
  });

  test("logo click calls API and stores token", async () => {
    localStorage.setItem("walletAddress", "test@wallet.com");

    axios.post.mockResolvedValue({
      data: { token: "mock-token-123" }
    });

    render(<Header />);

    fireEvent.click(screen.getByRole("img"));

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        `${import.meta.env.VITE_API_BASE_URL}/generateToken`,
        { email: "test@wallet.com" }
      );
    });

    expect(localStorage.getItem("jwt_token")).toBe("mock-token-123");
  });

  test("handles API error on logo click", async () => {
    console.error = jest.fn();
    axios.post.mockRejectedValue(new Error("API failed"));

    render(<Header />);
    fireEvent.click(screen.getByRole("img"));

    await waitFor(() => {
      expect(console.error).toHaveBeenCalled();
    });
  });
});
